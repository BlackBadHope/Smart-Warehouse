import httpServerService from './httpServerService';

interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  lastSeen: number;
  role: 'master' | 'client';
  version: string;
}

interface SyncData {
  timestamp: number;
  data: any;
  checksum: string;
}

class MasterClientService {
  private mode: 'master' | 'client' = 'client';
  private serverPort = 8765;
  private discoveryPort = 8766;
  private masterIP: string | null = null;
  private connectedDevices: NetworkDevice[] = [];
  private isConnected = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.mode = (localStorage.getItem('inventory-os-mode') as 'master' | 'client') || 'client';
  }

  getMode(): 'master' | 'client' {
    return this.mode;
  }

  isMaster(): boolean {
    return this.mode === 'master';
  }

  isClient(): boolean {
    return this.mode === 'client';
  }

  getMasterIP(): string | null {
    return this.masterIP;
  }

  getConnectedDevices(): NetworkDevice[] {
    return this.connectedDevices;
  }

  isConnectedToNetwork(): boolean {
    return this.isConnected;
  }

  async initializeMaster(): Promise<boolean> {
    if (this.mode !== 'master') {
      throw new Error('Cannot initialize master mode when not in master mode');
    }

    try {
      console.log('Starting master server on port', this.serverPort);
      
      // Start HTTP server
      const serverStarted = await httpServerService.startServer();
      if (!serverStarted) {
        throw new Error('Failed to start HTTP server');
      }
      
      // Start discovery service
      await this.startDiscoveryService();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize master:', error);
      return false;
    }
  }

  async initializeClient(): Promise<boolean> {
    if (this.mode !== 'client') {
      throw new Error('Cannot initialize client mode when not in client mode');
    }

    try {
      // Discover master server
      const masterFound = await this.discoverMaster();
      
      if (masterFound) {
        // Connect to master
        await this.connectToMaster();
        
        // Start sync
        this.startSync();
        
        this.isConnected = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to initialize client:', error);
      return false;
    }
  }

  async discoverMaster(): Promise<boolean> {
    console.log('Discovering master server in local network...');
    
    try {
      // Get local IP to determine network range
      const localIP = await this.getLocalIP();
      const networkBase = this.getNetworkBase(localIP);
      console.log('Scanning network:', networkBase + '.x (parallel scan with 30s timeout)');
      
      // Scan common local network ranges for master servers with timeout
      const possibleIPs = this.generateIPRange(networkBase);
      
      // Use Promise.race for overall timeout
      const discoveryPromise = this.scanIPsInParallel(possibleIPs);
      const timeoutPromise = new Promise<string | null>((_, reject) => 
        setTimeout(() => reject(new Error('Discovery timeout after 30 seconds')), 30000)
      );
      
      const foundIP = await Promise.race([discoveryPromise, timeoutPromise]);
      
      if (foundIP) {
        this.masterIP = foundIP;
        console.log('Found master server at:', foundIP);
        return true;
      }
      
      console.log('No master server found in network');
      return false;
    } catch (error) {
      console.error('Network discovery failed:', error);
      return false;
    }
  }

  private async scanIPsInParallel(ips: string[]): Promise<string | null> {
    // Batch processing to avoid overwhelming the network
    const batchSize = 10;
    
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const promises = batch.map(async (ip) => {
        try {
          const isReachable = await this.pingIP(ip);
          if (isReachable) {
            const isMaster = await this.checkIfMaster(ip);
            if (isMaster) {
              return ip;
            }
          }
          return null;
        } catch {
          return null;
        }
      });
      
      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          return result.value;
        }
      }
    }
    
    return null;
  }

  async connectToMaster(): Promise<boolean> {
    if (!this.masterIP) {
      return false;
    }

    try {
      // In real implementation, establish WebSocket or HTTP connection
      console.log('Connecting to master at:', this.masterIP);
      
      // Mock connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Connected to master successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to master:', error);
      return false;
    }
  }

  async syncDataWithMaster(data: any): Promise<boolean> {
    if (this.mode === 'master' || !this.masterIP) {
      return false;
    }

    try {
      // Create sync package
      const syncData: SyncData = {
        timestamp: Date.now(),
        data: data,
        checksum: this.generateChecksum(data)
      };

      // In real implementation, send to master via HTTP/WebSocket
      console.log('Syncing data with master:', syncData);
      
      // Mock sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error) {
      console.error('Failed to sync with master:', error);
      return false;
    }
  }

  async broadcastToClients(data: any): Promise<boolean> {
    if (this.mode !== 'master') {
      return false;
    }

    try {
      const syncData: SyncData = {
        timestamp: Date.now(),
        data: data,
        checksum: this.generateChecksum(data)
      };

      // In real implementation, broadcast to all connected clients
      console.log('Broadcasting to clients:', syncData);
      
      // Mock broadcast
      for (const device of this.connectedDevices.filter(d => d.role === 'client')) {
        console.log('Sending to client:', device.name, device.ip);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to broadcast to clients:', error);
      return false;
    }
  }

  async requestFullSync(): Promise<any> {
    if (this.mode === 'master' || !this.masterIP) {
      return null;
    }

    try {
      console.log('Requesting full sync from master');
      
      // Mock full sync request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock data - in real implementation, this would be actual sync data
      return {
        warehouses: [],
        users: [],
        settings: {},
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to request full sync:', error);
      return null;
    }
  }

  private async startDiscoveryService(): Promise<void> {
    // In real implementation, start UDP server for device discovery
    console.log('Starting discovery service on port', this.discoveryPort);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Every 30 seconds
  }

  private async sendHeartbeat(): Promise<void> {
    const deviceInfo: NetworkDevice = {
      id: this.getDeviceId(),
      name: this.getDeviceName(),
      ip: await this.getLocalIP(),
      lastSeen: Date.now(),
      role: this.mode,
      version: '2.6.0'
    };

    if (this.mode === 'master') {
      // Update own status
      console.log('Master heartbeat:', deviceInfo);
    } else if (this.masterIP) {
      // Send heartbeat to master
      console.log('Sending heartbeat to master:', deviceInfo);
    }
  }

  private startSync(): void {
    this.syncInterval = setInterval(async () => {
      await this.performPeriodicSync();
    }, 60000); // Every minute
  }

  private async performPeriodicSync(): Promise<void> {
    if (this.mode === 'client' && this.masterIP) {
      console.log('Performing periodic sync...');
      // Sync local changes with master
    }
  }

  private generateChecksum(data: any): string {
    // Simple checksum - in real implementation use proper hashing
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('device-id');
    if (!deviceId) {
      deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device-id', deviceId);
    }
    return deviceId;
  }

  private getDeviceName(): string {
    return localStorage.getItem('device-name') || `${this.mode}-${navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'}`;
  }

  private async getLocalIP(): Promise<string> {
    // Use WebRTC to get actual local IP
    try {
      const ip = await this.getLocalIPWebRTC();
      if (ip && ip !== '127.0.0.1') {
        return ip;
      }
    } catch (error) {
      console.log('WebRTC IP detection failed, using fallback');
    }
    
    // Fallback - try to detect from user agent or assume common ranges
    return '192.168.222.135'; // Default for debugging
  }

  private async getLocalIPWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const RTCPeerConnection = window.RTCPeerConnection || (window as any).mozRTCPeerConnection || (window as any).webkitRTCPeerConnection;
      
      if (!RTCPeerConnection) {
        reject('WebRTC not supported');
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
      });

      pc.createDataChannel('');
      pc.createOffer().then(pc.setLocalDescription.bind(pc));

      pc.onicecandidate = (ice) => {
        if (ice && ice.candidate && ice.candidate.candidate) {
          const match = ice.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
          if (match) {
            pc.close();
            resolve(match[1]);
          }
        }
      };

      setTimeout(() => {
        pc.close();
        reject('Timeout getting local IP');
      }, 3000);
    });
  }

  private getNetworkBase(ip: string): string {
    const parts = ip.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return '192.168.1'; // Fallback
  }

  private generateIPRange(networkBase: string): string[] {
    const ips: string[] = [];
    
    // Priority IPs (common router/server addresses)
    const priorityIPs = [1, 10, 100, 254, 2, 20, 50];
    
    // Add priority IPs first
    for (const ip of priorityIPs) {
      ips.push(`${networkBase}.${ip}`);
    }
    
    // Add remaining IPs
    for (let i = 1; i < 255; i++) {
      if (!priorityIPs.includes(i) && i !== 255) {
        ips.push(`${networkBase}.${i}`);
      }
    }
    
    return ips;
  }

  private async pingIP(ip: string): Promise<boolean> {
    try {
      // Use a simple HTTP request to check if device is reachable
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500); // Reduced from 1000ms to 500ms
      
      const response = await fetch(`http://${ip}:${this.serverPort}/ping`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors'
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkIfMaster(ip: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // Reduced from 2000ms to 1000ms
      
      const response = await fetch(`http://${ip}:${this.serverPort}/api/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return data.role === 'master' && data.service === 'inventory-os';
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  disconnect(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.isConnected = false;
    this.masterIP = null;
    this.connectedDevices = [];
    
    console.log('Disconnected from network');
  }

  async getNetworkStatus(): Promise<{
    mode: 'master' | 'client';
    connected: boolean;
    masterIP: string | null;
    devicesCount: number;
    lastSync?: number;
  }> {
    return {
      mode: this.mode,
      connected: this.isConnected,
      masterIP: this.masterIP,
      devicesCount: this.connectedDevices.length,
      lastSync: Date.now() // Mock timestamp
    };
  }
}

const masterClientService = new MasterClientService();
export default masterClientService;