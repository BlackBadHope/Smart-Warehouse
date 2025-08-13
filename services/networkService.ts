import { NetworkDevice, NetworkMessage, NetworkState, MessageType, SyncData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import debugService from './debugService';

class NetworkService {
  private state: NetworkState;
  private messageHandlers = new Map<MessageType, Function>();
  private discoveryInterval?: number;
  private heartbeatInterval?: number;
  private isInitialized = false;

  constructor() {
    this.state = {
      isOnline: false,
      discoveredDevices: [],
      connections: new Map(),
      localDevice: this.createLocalDevice()
    };
  }

  private createLocalDevice(): NetworkDevice {
    const deviceId = localStorage.getItem('inventory-device-id') || uuidv4();
    localStorage.setItem('inventory-device-id', deviceId);
    
    return {
      id: deviceId,
      name: localStorage.getItem('inventory-device-name') || `Inventory-${deviceId.slice(0, 8)}`,
      ipAddress: '', // Will be determined at runtime
      port: 8080, // Default port
      lastSeen: new Date(),
      capabilities: ['sync', 'discovery', 'encryption']
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      debugService.info('NetworkService: Initializing P2P network');
      
      // Try to get local IP address
      await this.detectLocalIP();
      
      // Start network discovery
      this.startDiscovery();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.state.isOnline = true;
      this.isInitialized = true;
      
      debugService.info('NetworkService: P2P network initialized', {
        deviceId: this.state.localDevice.id,
        deviceName: this.state.localDevice.name
      });
      
      this.dispatchNetworkEvent('network_initialized', this.state);
    } catch (error) {
      debugService.error('NetworkService: Failed to initialize', error);
      throw error;
    }
  }

  private async detectLocalIP(): Promise<void> {
    // This is a simplified version - in real implementation we'd use more sophisticated methods
    try {
      // Try WebRTC approach to get local IP
      const pc = new RTCPeerConnection({
        iceServers: []
      });
      
      pc.createDataChannel('');
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      return new Promise((resolve) => {
        pc.onicecandidate = (ice) => {
          if (ice.candidate) {
            const ip = ice.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
            if (ip && ip[1]) {
              this.state.localDevice.ipAddress = ip[1];
              pc.close();
              resolve();
            }
          }
        };
        
        // Fallback after timeout
        setTimeout(() => {
          this.state.localDevice.ipAddress = '127.0.0.1';
          pc.close();
          resolve();
        }, 2000);
      });
    } catch (error) {
      this.state.localDevice.ipAddress = '127.0.0.1';
      debugService.warn('NetworkService: Could not detect local IP, using fallback');
    }
  }

  private startDiscovery(): void {
    // Simulate network discovery - in real implementation this would use mDNS/Bonjour
    this.discoveryInterval = window.setInterval(() => {
      this.broadcastDiscovery();
    }, 5000); // Every 5 seconds
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
      this.cleanupStaleDevices();
    }, 10000); // Every 10 seconds
  }

  private broadcastDiscovery(): void {
    const message: NetworkMessage = {
      id: uuidv4(),
      type: 'discover',
      senderId: this.state.localDevice.id,
      timestamp: new Date(),
      payload: {
        device: this.state.localDevice,
        action: 'announce'
      }
    };

    this.broadcastMessage(message);
  }

  private sendHeartbeat(): void {
    this.state.discoveredDevices.forEach(device => {
      const message: NetworkMessage = {
        id: uuidv4(),
        type: 'ping',
        senderId: this.state.localDevice.id,
        receiverId: device.id,
        timestamp: new Date(),
        payload: { timestamp: Date.now() }
      };

      this.sendMessage(device.id, message);
    });
  }

  private cleanupStaleDevices(): void {
    const now = Date.now();
    const staleThreshold = 30000; // 30 seconds
    
    this.state.discoveredDevices = this.state.discoveredDevices.filter(device => {
      const isStale = now - device.lastSeen.getTime() > staleThreshold;
      if (isStale) {
        debugService.info('NetworkService: Removing stale device', device.id);
        this.disconnectFromDevice(device.id);
      }
      return !isStale;
    });
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    const device = this.state.discoveredDevices.find(d => d.id === deviceId);
    if (!device) {
      debugService.warn('NetworkService: Device not found for connection', deviceId);
      return false;
    }

    if (this.state.connections.has(deviceId)) {
      debugService.info('NetworkService: Already connected to device', deviceId);
      return true;
    }

    try {
      const connection = new RTCPeerConnection({
        iceServers: [] // Local network only
      });

      // Set up connection handlers
      connection.oniceconnectionstatechange = () => {
        debugService.info('NetworkService: ICE connection state changed', {
          deviceId,
          state: connection.iceConnectionState
        });
      };

      connection.ondatachannel = (event) => {
        const channel = event.channel;
        channel.onmessage = (messageEvent) => {
          this.handleIncomingMessage(JSON.parse(messageEvent.data));
        };
      };

      // Create data channel
      const channel = connection.createDataChannel('inventory-sync');
      channel.onopen = () => {
        debugService.info('NetworkService: Data channel opened', deviceId);
      };

      this.state.connections.set(deviceId, connection);
      
      debugService.info('NetworkService: Connected to device', deviceId);
      return true;
    } catch (error) {
      debugService.error('NetworkService: Failed to connect to device', error);
      return false;
    }
  }

  disconnectFromDevice(deviceId: string): void {
    const connection = this.state.connections.get(deviceId);
    if (connection) {
      connection.close();
      this.state.connections.delete(deviceId);
      debugService.info('NetworkService: Disconnected from device', deviceId);
    }
  }

  sendMessage(deviceId: string, message: NetworkMessage): boolean {
    const connection = this.state.connections.get(deviceId);
    if (!connection) {
      debugService.warn('NetworkService: No connection to device', deviceId);
      return false;
    }

    try {
      // Get the data channel
      const channels = connection.getDataChannels();
      if (channels.length > 0) {
        channels[0].send(JSON.stringify(message));
        return true;
      }
    } catch (error) {
      debugService.error('NetworkService: Failed to send message', error);
    }
    
    return false;
  }

  broadcastMessage(message: NetworkMessage): void {
    this.state.connections.forEach((connection, deviceId) => {
      this.sendMessage(deviceId, message);
    });
    
    // Also simulate network broadcast for discovery
    this.simulateNetworkBroadcast(message);
  }

  private simulateNetworkBroadcast(message: NetworkMessage): void {
    // In real implementation, this would use UDP broadcast or mDNS
    // For now, we'll simulate finding devices on the network
    if (message.type === 'discover') {
      setTimeout(() => {
        // Simulate discovering a device
        this.simulateDeviceDiscovery();
      }, 1000);
    }
  }

  private simulateDeviceDiscovery(): void {
    // Simulate finding another device (for testing)
    const simulatedDevice: NetworkDevice = {
      id: 'simulated-device-' + Math.random().toString(36).substr(2, 9),
      name: 'Simulated Device',
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
      port: 8080,
      lastSeen: new Date(),
      capabilities: ['sync', 'discovery']
    };

    // Only add if we don't have too many simulated devices
    if (this.state.discoveredDevices.length < 2) {
      this.addDiscoveredDevice(simulatedDevice);
    }
  }

  private addDiscoveredDevice(device: NetworkDevice): void {
    const existingIndex = this.state.discoveredDevices.findIndex(d => d.id === device.id);
    
    if (existingIndex >= 0) {
      // Update existing device
      this.state.discoveredDevices[existingIndex] = { ...device, lastSeen: new Date() };
    } else {
      // Add new device
      this.state.discoveredDevices.push(device);
      debugService.info('NetworkService: New device discovered', device);
    }
    
    this.dispatchNetworkEvent('device_discovered', device);
  }

  private handleIncomingMessage(message: NetworkMessage): void {
    debugService.info('NetworkService: Received message', message.type);
    
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      this.handleDefaultMessage(message);
    }
  }

  private handleDefaultMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'ping':
        this.handlePing(message);
        break;
      case 'pong':
        this.handlePong(message);
        break;
      case 'announce':
        this.handleDeviceAnnouncement(message);
        break;
      default:
        debugService.warn('NetworkService: Unhandled message type', message.type);
    }
  }

  private handlePing(message: NetworkMessage): void {
    const response: NetworkMessage = {
      id: uuidv4(),
      type: 'pong',
      senderId: this.state.localDevice.id,
      receiverId: message.senderId,
      timestamp: new Date(),
      payload: { originalTimestamp: message.payload.timestamp }
    };

    this.sendMessage(message.senderId, response);
  }

  private handlePong(message: NetworkMessage): void {
    // Update device last seen time
    const device = this.state.discoveredDevices.find(d => d.id === message.senderId);
    if (device) {
      device.lastSeen = new Date();
    }
  }

  private handleDeviceAnnouncement(message: NetworkMessage): void {
    if (message.payload.device && message.payload.device.id !== this.state.localDevice.id) {
      this.addDiscoveredDevice(message.payload.device);
    }
  }

  onMessage(type: MessageType, handler: (message: NetworkMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  getNetworkState(): NetworkState {
    return { ...this.state };
  }

  getDiscoveredDevices(): NetworkDevice[] {
    return [...this.state.discoveredDevices];
  }

  isDeviceConnected(deviceId: string): boolean {
    return this.state.connections.has(deviceId);
  }

  private dispatchNetworkEvent(eventType: string, data: any): void {
    const event = new CustomEvent(`network_${eventType}`, { detail: data });
    document.dispatchEvent(event);
  }

  async shutdown(): Promise<void> {
    debugService.info('NetworkService: Shutting down');
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    this.state.connections.forEach((connection, deviceId) => {
      this.disconnectFromDevice(deviceId);
    });
    
    this.state.isOnline = false;
    this.isInitialized = false;
  }

  // Device management
  setDeviceName(name: string): void {
    this.state.localDevice.name = name;
    localStorage.setItem('inventory-device-name', name);
  }

  getLocalDevice(): NetworkDevice {
    return { ...this.state.localDevice };
  }
}

// Singleton instance
const networkService = new NetworkService();
export default networkService;