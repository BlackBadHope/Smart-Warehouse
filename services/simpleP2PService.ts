import debugService from './debugService';
import { v4 as uuidv4 } from 'uuid';

interface P2PDevice {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen: number;
}

interface P2PMessage {
  id: string;
  type: 'sync' | 'ping' | 'discovery' | 'data';
  senderId: string;
  receiverId?: string; // undefined = broadcast
  timestamp: number;
  payload: any;
}

type P2PEventType = 'device_discovered' | 'device_lost' | 'message_received' | 'connection_changed';
type P2PEventHandler = (data: any) => void;

/**
 * ПРОСТОЙ P2P СЕРВИС - НИКАКИХ ВНЕШНИХ СЕРВЕРОВ!
 * 
 * Использует только:
 * - BroadcastChannel для локального тестирования
 * - LocalStorage для персистентности
 * - setTimeout для heartbeat
 * 
 * Идеально для:
 * ✅ Тестирования на одной машине (разные вкладки)
 * ✅ Быстрой отладки P2P логики
 * ✅ Демонстрации функциональности
 * ✅ Локальной сети (через расширение)
 */
class SimpleP2PService {
  private deviceId: string;
  private deviceName: string;
  private isInitialized = false;
  private channel: BroadcastChannel | null = null;
  private discoveredDevices = new Map<string, P2PDevice>();
  private eventHandlers = new Map<P2PEventType, P2PEventHandler[]>();
  private heartbeatInterval?: number;
  private cleanupInterval?: number;

  constructor() {
    this.deviceId = localStorage.getItem('simple-p2p-device-id') || uuidv4();
    localStorage.setItem('simple-p2p-device-id', this.deviceId);
    
    this.deviceName = localStorage.getItem('simple-p2p-device-name') || 
                      `Device-${this.deviceId.slice(0, 8)}`;
    
    debugService.info('SimpleP2PService: Device created', {
      id: this.deviceId,
      name: this.deviceName
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      debugService.info('SimpleP2PService: Already initialized');
      return;
    }

    try {
      // Проверяем поддержку BroadcastChannel
      if (!window.BroadcastChannel) {
        throw new Error('BroadcastChannel not supported - fallback to localStorage events');
      }

      // Создаем канал связи
      this.channel = new BroadcastChannel('inventory-simple-p2p');
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      // Запускаем heartbeat для поддержания присутствия
      this.startHeartbeat();
      
      // Запускаем очистку старых устройств
      this.startCleanup();

      // Объявляем себя в сети
      this.announce();

      this.isInitialized = true;
      debugService.info('SimpleP2PService: Initialization complete', {
        deviceId: this.deviceId,
        deviceName: this.deviceName
      });

      // Уведомляем о готовности
      this.emit('connection_changed', { status: 'online' });

    } catch (error) {
      debugService.error('SimpleP2PService: Initialization failed', error);
      throw error;
    }
  }

  // Подписка на события
  on(event: P2PEventType, handler: P2PEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    
    // Возвращаем функцию отписки
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  private emit(event: P2PEventType, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          debugService.error(`SimpleP2PService: Error in ${event} handler`, error);
        }
      });
    }
  }

  // Объявить себя в сети
  private announce(): void {
    this.sendMessage({
      id: uuidv4(),
      type: 'discovery',
      senderId: this.deviceId,
      timestamp: Date.now(),
      payload: {
        action: 'announce',
        device: {
          id: this.deviceId,
          name: this.deviceName,
          status: 'online',
          lastSeen: Date.now()
        }
      }
    });
  }

  // Отправить сообщение
  private sendMessage(message: P2PMessage): void {
    if (!this.channel || !this.isInitialized) {
      debugService.warning('SimpleP2PService: Cannot send message - not initialized');
      return;
    }

    try {
      this.channel.postMessage(message);
      debugService.info('SimpleP2PService: Message sent', {
        type: message.type,
        receiverId: message.receiverId || 'broadcast'
      });
    } catch (error) {
      debugService.error('SimpleP2PService: Failed to send message', error);
    }
  }

  // Обработать входящее сообщение
  private handleMessage(message: P2PMessage): void {
    // Игнорируем свои сообщения
    if (message.senderId === this.deviceId) {
      return;
    }

    debugService.info('SimpleP2PService: Message received', {
      type: message.type,
      senderId: message.senderId
    });

    switch (message.type) {
      case 'discovery':
        this.handleDiscoveryMessage(message);
        break;
      case 'ping':
        this.handlePingMessage(message);
        break;
      case 'sync':
      case 'data':
        this.emit('message_received', message);
        break;
    }
  }

  private handleDiscoveryMessage(message: P2PMessage): void {
    const { action, device } = message.payload;
    
    if (action === 'announce' && device) {
      const existingDevice = this.discoveredDevices.get(device.id);
      const isNewDevice = !existingDevice;
      
      // Обновляем информацию об устройстве
      this.discoveredDevices.set(device.id, {
        ...device,
        lastSeen: Date.now()
      });

      // Если устройство новое, отвечаем своим announce
      if (isNewDevice) {
        debugService.info('SimpleP2PService: New device discovered', device);
        this.emit('device_discovered', device);
        
        // Отвечаем своим announce
        setTimeout(() => this.announce(), 100);
      }
    }
  }

  private handlePingMessage(message: P2PMessage): void {
    // Отвечаем на ping
    this.sendMessage({
      id: uuidv4(),
      type: 'ping',
      senderId: this.deviceId,
      receiverId: message.senderId,
      timestamp: Date.now(),
      payload: { action: 'pong' }
    });
  }

  // Heartbeat для поддержания присутствия
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isInitialized) {
        this.announce();
      }
    }, 30000); // Каждые 30 секунд
  }

  // Очистка старых устройств
  private startCleanup(): void {
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 минута

      for (const [deviceId, device] of this.discoveredDevices) {
        if (now - device.lastSeen > timeout) {
          this.discoveredDevices.delete(deviceId);
          debugService.info('SimpleP2PService: Device timeout', device);
          this.emit('device_lost', device);
        }
      }
    }, 15000); // Проверяем каждые 15 секунд
  }

  // Публичные методы
  getDeviceId(): string {
    return this.deviceId;
  }

  getDeviceName(): string {
    return this.deviceName;
  }

  setDeviceName(name: string): void {
    this.deviceName = name;
    localStorage.setItem('simple-p2p-device-name', name);
    
    // Переобъявляем себя с новым именем
    if (this.isInitialized) {
      this.announce();
    }
  }

  getDiscoveredDevices(): P2PDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  getConnectionStatus(): 'online' | 'offline' {
    return this.isInitialized ? 'online' : 'offline';
  }

  // Отправить данные другому устройству
  sendData(targetDeviceId: string, data: any): void {
    this.sendMessage({
      id: uuidv4(),
      type: 'data',
      senderId: this.deviceId,
      receiverId: targetDeviceId,
      timestamp: Date.now(),
      payload: data
    });
  }

  // Broadcast данных всем устройствам
  broadcast(data: any): void {
    this.sendMessage({
      id: uuidv4(),
      type: 'sync',
      senderId: this.deviceId,
      timestamp: Date.now(),
      payload: data
    });
  }

  // Ping устройства для проверки связи
  pingDevice(deviceId: string): void {
    this.sendMessage({
      id: uuidv4(),
      type: 'ping',
      senderId: this.deviceId,
      receiverId: deviceId,
      timestamp: Date.now(),
      payload: { action: 'ping' }
    });
  }

  // Очистка ресурсов
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.discoveredDevices.clear();
    this.eventHandlers.clear();
    this.isInitialized = false;

    debugService.info('SimpleP2PService: Destroyed');
  }
}

// Singleton instance
const simpleP2PService = new SimpleP2PService();
export default simpleP2PService;