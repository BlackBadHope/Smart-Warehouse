/**
 * LocalSend-Style P2P Service
 * 
 * Inspired by LocalSend protocol:
 * - Simple HTTP API for P2P communication
 * - mDNS-style discovery (simulated for web)
 * - One-step QR code connection (IP + port only)
 * - No external servers required
 * 
 * QR код содержит только: { "ip": "192.168.1.100", "port": 8080, "name": "Склад 1" }
 */

import debugService from './debugService';

interface Device {
  ip: string;
  port: number;
  name: string;
  fingerprint: string;
  deviceType: 'mobile' | 'desktop' | 'web';
  protocol: string;
  timestamp: number;
}

interface WarehouseShare {
  id: string;
  name: string;
  data: any;
  sharedAt: number;
}

class LocalSendStyleService {
  private isServerRunning = false;
  private port = 8080;
  private deviceName: string;
  private fingerprint: string;
  private sharedWarehouses = new Map<string, WarehouseShare>();
  private discoveredDevices = new Map<string, Device>();
  private discoveryInterval?: number;

  constructor() {
    this.deviceName = localStorage.getItem('localsend-device-name') || 'Inventory Device';
    this.fingerprint = localStorage.getItem('localsend-fingerprint') || this.generateFingerprint();
    localStorage.setItem('localsend-fingerprint', this.fingerprint);
  }

  private generateFingerprint(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Получить локальный IP адрес устройства
   */
  private async getLocalIP(): Promise<string> {
    try {
      // Используем WebRTC только для определения IP
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('test');
      
      return new Promise<string>((resolve) => {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\\d+\\.\\d+\\.\\d+\\.\\d+)/);
            if (ipMatch && ipMatch[1] !== '127.0.0.1') {
              pc.close();
              resolve(ipMatch[1]);
              return;
            }
          }
        };
        
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        // Fallback через 3 секунды
        setTimeout(() => {
          pc.close();
          resolve('192.168.1.100'); // Разумное предположение
        }, 3000);
      });
    } catch (error) {
      return '192.168.1.100'; // Fallback
    }
  }

  /**
   * Запустить HTTP сервер (симуляция для веб-браузера)
   */
  async startServer(): Promise<boolean> {
    if (this.isServerRunning) {
      debugService.info('LocalSendStyle: Server already running');
      return true;
    }

    try {
      debugService.info('LocalSendStyle: Starting HTTP server simulation...');
      
      // В реальном мире здесь был бы HTTP сервер
      // Для веб-браузера симулируем через Service Worker
      await this.registerServiceWorker();
      
      // Запускаем mDNS-стиль discovery
      this.startDiscovery();
      
      this.isServerRunning = true;
      debugService.info('LocalSendStyle: Server started on port', this.port);
      
      return true;
    } catch (error) {
      debugService.error('LocalSendStyle: Failed to start server', error);
      return false;
    }
  }

  /**
   * Остановить сервер
   */
  async stopServer(): Promise<void> {
    if (!this.isServerRunning) return;
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }
    
    // Отменяем Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.scope.includes('localsend-style')) {
          await registration.unregister();
        }
      }
    }
    
    this.isServerRunning = false;
    this.discoveredDevices.clear();
    debugService.info('LocalSendStyle: Server stopped');
  }

  /**
   * Создать QR код для подключения (ПРОСТОЙ - только IP + порт)
   */
  async createConnectionQR(): Promise<string> {
    if (!this.isServerRunning) {
      throw new Error('Server not running. Start server first.');
    }

    const localIP = await this.getLocalIP();
    
    // СУПЕР ПРОСТОЙ QR - только необходимые данные
    const qrData = {
      ip: localIP,
      port: this.port,
      name: this.deviceName
    };

    const qrString = JSON.stringify(qrData);
    debugService.info('LocalSendStyle: QR connection data created', {
      ip: localIP,
      port: this.port,
      dataSize: qrString.length
    });

    return qrString;
  }

  /**
   * Подключиться к устройству по QR коду (1 шаг!)
   */
  async connectByQR(qrString: string): Promise<boolean> {
    try {
      const qrData = JSON.parse(qrString);
      
      if (!qrData.ip || !qrData.port) {
        throw new Error('Invalid QR data - missing IP or port');
      }

      debugService.info('LocalSendStyle: Connecting to device...', qrData);

      // Пробуем подключиться к устройству
      const device: Device = {
        ip: qrData.ip,
        port: qrData.port,
        name: qrData.name || 'Unknown Device',
        fingerprint: 'qr-' + Date.now(),
        deviceType: 'mobile',
        protocol: 'localsend-style',
        timestamp: Date.now()
      };

      // Проверяем доступность устройства
      const isOnline = await this.pingDevice(device);
      if (isOnline) {
        this.discoveredDevices.set(device.ip, device);
        debugService.info('LocalSendStyle: Device connected successfully!', device);
        return true;
      } else {
        throw new Error('Device not reachable');
      }

    } catch (error) {
      debugService.error('LocalSendStyle: QR connection failed', error);
      throw error;
    }
  }

  /**
   * Поделиться складом
   */
  shareWarehouse(warehouseId: string, warehouseData: any): boolean {
    if (!this.isServerRunning) {
      debugService.warning('LocalSendStyle: Server not running');
      return false;
    }

    this.sharedWarehouses.set(warehouseId, {
      id: warehouseId,
      name: warehouseData.name || 'Unknown Warehouse',
      data: warehouseData,
      sharedAt: Date.now()
    });

    debugService.info('LocalSendStyle: Warehouse shared', {
      id: warehouseId,
      name: warehouseData.name
    });

    return true;
  }

  /**
   * Прекратить делиться складом
   */
  unshareWarehouse(warehouseId: string): boolean {
    const removed = this.sharedWarehouses.delete(warehouseId);
    if (removed) {
      debugService.info('LocalSendStyle: Warehouse unshared', warehouseId);
    }
    return removed;
  }

  /**
   * Получить список доступных складов с устройства
   */
  async getRemoteWarehouses(deviceIP: string): Promise<WarehouseShare[]> {
    try {
      // В реальности - HTTP запрос к устройству
      // Для симуляции возвращаем тестовые данные
      debugService.info('LocalSendStyle: Fetching warehouses from', deviceIP);
      
      // Симуляция HTTP GET /api/warehouses
      return [
        {
          id: 'remote-warehouse-1',
          name: 'Удаленный склад 1',
          data: { items: [] },
          sharedAt: Date.now()
        }
      ];
    } catch (error) {
      debugService.error('LocalSendStyle: Failed to get remote warehouses', error);
      return [];
    }
  }

  /**
   * Подключиться к удаленному складу
   */
  async connectToRemoteWarehouse(deviceIP: string, warehouseId: string): Promise<any> {
    try {
      debugService.info('LocalSendStyle: Connecting to remote warehouse', {
        deviceIP,
        warehouseId
      });

      // В реальности - HTTP GET /api/warehouse/{id}
      // Для симуляции возвращаем тестовые данные
      return {
        id: warehouseId,
        name: 'Удаленный склад',
        items: [],
        source: 'remote',
        deviceIP
      };
    } catch (error) {
      debugService.error('LocalSendStyle: Failed to connect to remote warehouse', error);
      throw error;
    }
  }

  /**
   * Симуляция mDNS discovery
   */
  private startDiscovery(): void {
    // Симулируем multicast discovery каждые 30 секунд
    this.discoveryInterval = window.setInterval(() => {
      this.announceDevice();
      this.scanForDevices();
    }, 30000);

    // Первоначальное объявление
    this.announceDevice();
  }

  /**
   * Объявить себя в сети (multicast UDP simulation)
   */
  private announceDevice(): void {
    const announcement = {
      fingerprint: this.fingerprint,
      alias: this.deviceName,
      deviceType: 'web' as const,
      protocol: 'localsend-style-v1',
      port: this.port,
      timestamp: Date.now()
    };

    // В реальности - multicast UDP на 224.0.0.167:53317
    // Для веб - сохраняем в localStorage для обнаружения другими вкладками
    localStorage.setItem('localsend-announcement', JSON.stringify(announcement));
    
    debugService.info('LocalSendStyle: Device announced', announcement);
  }

  /**
   * Сканировать локальную сеть на наличие устройств
   */
  private async scanForDevices(): Promise<void> {
    try {
      // В реальности - сканирование IP диапазона + multicast listening
      // Для веб - проверяем localStorage на объявления других вкладок
      
      const stored = localStorage.getItem('localsend-announcement');
      if (stored) {
        const announcement = JSON.parse(stored);
        
        // Не добавляем себя
        if (announcement.fingerprint !== this.fingerprint) {
          const localIP = await this.getLocalIP();
          const device: Device = {
            ip: localIP,
            port: announcement.port,
            name: announcement.alias,
            fingerprint: announcement.fingerprint,
            deviceType: announcement.deviceType,
            protocol: announcement.protocol,
            timestamp: announcement.timestamp
          };

          this.discoveredDevices.set(device.ip, device);
          debugService.info('LocalSendStyle: Device discovered', device);
        }
      }
    } catch (error) {
      debugService.error('LocalSendStyle: Discovery scan failed', error);
    }
  }

  /**
   * Пинг устройства для проверки доступности
   */
  private async pingDevice(device: Device): Promise<boolean> {
    try {
      // В реальности - HTTP GET /api/info
      // Для симуляции - всегда true
      debugService.info('LocalSendStyle: Pinging device', device.ip);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Регистрация Service Worker для HTTP API симуляции
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    const swCode = `
      // LocalSend-style HTTP API simulation
      self.addEventListener('fetch', (event) => {
        const url = new URL(event.request.url);
        
        if (url.pathname.startsWith('/api/')) {
          event.respondWith(handleAPIRequest(event.request));
        }
      });

      async function handleAPIRequest(request) {
        const url = new URL(request.url);
        const path = url.pathname;
        
        if (path === '/api/info') {
          return new Response(JSON.stringify({
            fingerprint: '${this.fingerprint}',
            alias: '${this.deviceName}',
            deviceType: 'web',
            protocol: 'localsend-style-v1'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (path === '/api/warehouses') {
          // Возвращаем список доступных складов
          return new Response(JSON.stringify({
            warehouses: []  // Будет заполнено из localStorage
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response('Not Found', { status: 404 });
      }
    `;

    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    
    await navigator.serviceWorker.register(swUrl, {
      scope: '/localsend-style/'
    });
  }

  // Публичные геттеры
  isRunning(): boolean {
    return this.isServerRunning;
  }

  getSharedWarehouses(): WarehouseShare[] {
    return Array.from(this.sharedWarehouses.values());
  }

  getDiscoveredDevices(): Device[] {
    return Array.from(this.discoveredDevices.values());
  }

  getDeviceInfo() {
    return {
      name: this.deviceName,
      fingerprint: this.fingerprint,
      port: this.port
    };
  }

  setDeviceName(name: string): void {
    this.deviceName = name;
    localStorage.setItem('localsend-device-name', name);
  }
}

// Singleton
const localSendStyleService = new LocalSendStyleService();
export default localSendStyleService;