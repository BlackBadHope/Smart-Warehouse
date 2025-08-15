import { NetworkDevice, NetworkMessage, NetworkState, MessageType, SyncData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import debugService from './debugService';
import webrtcService from './webrtcService';
import p2pSyncService from './p2pSyncService';

class NetworkService {
  private state: NetworkState;
  private messageHandlers = new Map<MessageType, Function>();
  private discoveryInterval?: number;
  private heartbeatInterval?: number;
  private isInitialized = false;
  private websocket?: WebSocket;
  private reconnectInterval?: number;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

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
      port: 3001, // Default port
      lastSeen: new Date(),
      capabilities: ['sync', 'discovery', 'encryption']
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      debugService.info('NetworkService: Already initialized, skipping');
      return;
    }

    try {
      debugService.info('NetworkService: Initializing P2P network');
      
      // Clean up any existing connections
      this.cleanup();
      
      // Try to get local IP address
      await this.detectLocalIP();
      
      // Connect to WebSocket server for real-time sync
      await this.connectToWebSocketServer();
      
      // Initialize WebRTC P2P system
      await this.initializeP2P();
      
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

  private cleanup(): void {
    // Clear intervals
    this.clearReconnectInterval();
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    
    // Close existing WebSocket
    if (this.websocket) {
      this.websocket.onopen = null;
      this.websocket.onclose = null;
      this.websocket.onerror = null;
      this.websocket.onmessage = null;
      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.close();
      }
      this.websocket = undefined;
    }
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
  }

  private async initializeP2P(): Promise<void> {
    try {
      debugService.info('NetworkService: Initializing WebRTC P2P system');
      debugService.info('NetworkService: Local device info', {
        id: this.state.localDevice.id,
        name: this.state.localDevice.name,
        ipAddress: this.state.localDevice.ipAddress
      });
      
      // Initialize WebRTC service with our device info
      await webrtcService.initialize(this.state.localDevice);
      
      // Setup P2P event listeners
      this.setupP2PEventListeners();
      
      debugService.info('NetworkService: WebRTC P2P system initialized successfully');
      
      // Dispatch event to notify UI that P2P is ready
      this.dispatchNetworkEvent('p2p_initialized', { isInitialized: true });
      
    } catch (error) {
      debugService.error('NetworkService: Failed to initialize WebRTC P2P - DETAILED ERROR:', {
        error: error.message,
        stack: error.stack,
        localDevice: this.state.localDevice
      });
      
      // Dispatch event to notify UI of P2P failure
      this.dispatchNetworkEvent('p2p_initialization_failed', { 
        error: error.message,
        canContinue: true 
      });
      
      // Continue without P2P - not critical for basic functionality
      debugService.warning('NetworkService: Continuing without P2P functionality');
    }
  }

  private setupP2PEventListeners(): void {
    // Listen for peer connections
    document.addEventListener('peer-connected', (event: any) => {
      const { deviceId } = event.detail;
      debugService.info('NetworkService: P2P peer connected', deviceId);
      
      // Update discovered devices
      this.updateDiscoveredDevice(deviceId, 'connected');
      
      // Dispatch network event
      this.dispatchNetworkEvent('device_connected', { deviceId });
    });

    document.addEventListener('peer-disconnected', (event: any) => {
      const { deviceId } = event.detail;
      debugService.info('NetworkService: P2P peer disconnected', deviceId);
      
      // Update discovered devices
      this.updateDiscoveredDevice(deviceId, 'disconnected');
      
      // Dispatch network event
      this.dispatchNetworkEvent('device_disconnected', { deviceId });
    });

    // Listen for sync events
    document.addEventListener('inventory-sync-received', (event: any) => {
      const { senderId, data } = event.detail;
      debugService.info('NetworkService: Inventory sync received from peer', senderId);
      
      // Dispatch to app
      this.dispatchNetworkEvent('sync_received', { senderId, data });
    });

    document.addEventListener('sync-conflicts-detected', (event: any) => {
      const { senderId, conflicts } = event.detail;
      debugService.warning('NetworkService: Sync conflicts detected', { senderId, conflictsCount: conflicts.length });
      
      // Dispatch to app for UI handling
      this.dispatchNetworkEvent('sync_conflicts', { senderId, conflicts });
    });
  }

  private updateDiscoveredDevice(deviceId: string, status: 'connected' | 'disconnected'): void {
    const existingDevice = this.state.discoveredDevices.find(d => d.id === deviceId);
    
    if (status === 'connected') {
      if (!existingDevice) {
        // Add new device (we'll get more info from P2P discovery)
        const device: NetworkDevice = {
          id: deviceId,
          name: `Device-${deviceId.slice(0, 8)}`,
          ipAddress: 'P2P',
          port: 0,
          lastSeen: new Date(),
          capabilities: ['p2p', 'sync']
        };
        this.state.discoveredDevices.push(device);
      } else {
        existingDevice.lastSeen = new Date();
      }
    } else {
      // Remove disconnected device
      this.state.discoveredDevices = this.state.discoveredDevices.filter(d => d.id !== deviceId);
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
        
        // Fallback after timeout - try to get a real IP, not localhost
        setTimeout(() => {
          this.state.localDevice.ipAddress = this.getNetworkIP() || 'unknown';
          pc.close();
          resolve();
        }, 2000);
      });
    } catch (error) {
      this.state.localDevice.ipAddress = this.getNetworkIP() || 'unknown';
      debugService.warning('NetworkService: Could not detect local IP via WebRTC, using alternative method');
    }
  }

  private async connectToWebSocketServer(): Promise<void> {
    // Skip WebSocket on mobile devices - they can't run servers anyway
    if (this.isMobileDevice()) {
      debugService.info('NetworkService: Mobile device detected - using P2P-only mode');
      // On mobile, we'll still have P2P available through WebRTC
      // Just no WebSocket server connectivity
      return; // Don't throw error, just skip WebSocket
    }
    
    try {
      // Use different port to avoid conflicts  
      const wsUrl = `ws://localhost:3001`;
      this.websocket = new WebSocket(wsUrl);
      
      // Wait for connection or timeout with proper event handling
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.websocket?.close();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
        
        const cleanup = () => {
          clearTimeout(timeout);
        };
        
        this.websocket!.onopen = () => {
          cleanup();
          debugService.info('NetworkService: Connected to WebSocket server');
          this.clearReconnectInterval();
          this.reconnectAttempts = 0;
          
          // Send initial device announcement
          this.websocket?.send(JSON.stringify({
            type: 'device_announce',
            device: this.state.localDevice
          }));
          
          // Set up persistent event handlers after successful connection
          this.setupWebSocketHandlers();
          resolve(void 0);
        };
        
        this.websocket!.onerror = () => {
          cleanup();
          reject(new Error('WebSocket connection failed'));
        };
        
        this.websocket!.onclose = () => {
          cleanup();
          reject(new Error('WebSocket connection closed during setup'));
        };
      });
      
    } catch (error) {
      debugService.warning('NetworkService: Could not connect to WebSocket server, continuing with P2P only mode');
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.websocket) return;
    
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        debugService.error('NetworkService: Error parsing WebSocket message', error);
      }
    };
    
    this.websocket.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        debugService.warning(`NetworkService: WebSocket connection closed, attempting reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.scheduleReconnect();
      } else {
        debugService.info('NetworkService: Max reconnect attempts reached, switching to P2P-only mode');
      }
    };
    
    this.websocket.onerror = (error) => {
      debugService.error('NetworkService: WebSocket error', error);
    };
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'device_announce':
        if (data.device && data.device.id !== this.state.localDevice.id) {
          this.addDiscoveredDevice(data.device);
        }
        break;
      case 'broadcast':
        if (data.message) {
          this.handleIncomingMessage(data.message);
        }
        break;
      case 'sync_data':
        // Handle data synchronization from server
        this.dispatchNetworkEvent('sync_received', data.payload);
        break;
      default:
        debugService.info('NetworkService: Unknown WebSocket message type', data.type);
    }
  }

  private scheduleReconnect(): void {
    // Don't schedule reconnect if we've already reached the limit
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      debugService.info('NetworkService: Max reconnect attempts reached, not scheduling more attempts');
      return;
    }
    
    this.clearReconnectInterval();
    this.reconnectAttempts++;
    
    const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Exponential backoff, max 30s
    debugService.info(`NetworkService: Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectInterval = window.setTimeout(async () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts && 
          (!this.websocket || this.websocket.readyState === WebSocket.CLOSED)) {
        debugService.info(`NetworkService: Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        try {
          await this.connectToWebSocketServer();
        } catch (error) {
          debugService.warning('NetworkService: Reconnection attempt failed', error);
          // If this was our last attempt, don't schedule more
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            debugService.info('NetworkService: Max reconnect attempts reached, switching to P2P-only mode');
          }
        }
      }
    }, delay);
  }

  private clearReconnectInterval(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = undefined;
    }
  }

  // Public method to reset reconnection attempts (useful for manual retry)
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    this.clearReconnectInterval();
    debugService.info('NetworkService: Reconnect attempts reset and intervals cleared');
  }

  // Public method to stop all reconnection attempts
  stopReconnecting(): void {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.clearReconnectInterval();
    debugService.info('NetworkService: All reconnection attempts stopped');
  }

  private startDiscovery(): void {
    // Real network discovery using server probing and WebSocket
    this.discoveryInterval = window.setInterval(() => {
      this.broadcastDiscovery();
    }, 15000); // Every 15 seconds (less frequent than simulation)
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
      debugService.warning('NetworkService: Device not found for connection', deviceId);
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

      // Store channel reference for later use
      (connection as any).inventoryDataChannel = channel;
      
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
      debugService.warning('NetworkService: No connection to device', deviceId);
      return false;
    }

    try {
      // For WebRTC, we need to track the data channel ourselves
      // This is a simplified approach - in production we'd maintain channel references
      const channel = (connection as any).inventoryDataChannel;
      if (channel && channel.readyState === 'open') {
        channel.send(JSON.stringify(message));
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
    
    // Also broadcast via real network discovery
    this.realNetworkBroadcast(message);
  }

  private realNetworkBroadcast(message: NetworkMessage): void {
    // Real network broadcasting via WebSocket to server
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'broadcast',
        message: message
      }));
    }
    
    // Also broadcast via local mDNS for direct P2P discovery
    if (message.type === 'discover') {
      this.performRealDeviceDiscovery();
    }
  }

  private async performRealDeviceDiscovery(): Promise<void> {
    try {
      // Check for local network servers on common ports
      const localNetworkRanges = this.generateLocalNetworkIPs();
      const discoveryPromises = localNetworkRanges.map(ip => this.probeNetworkDevice(ip));
      
      const results = await Promise.allSettled(discoveryPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          this.addDiscoveredDevice(result.value);
        }
      });
    } catch (error) {
      debugService.error('NetworkService: Real device discovery failed', error);
    }
  }

  private generateLocalNetworkIPs(): string[] {
    const baseIP = this.state.localDevice.ipAddress.split('.').slice(0, 3).join('.');
    const ips: string[] = [];
    
    // Probe common IP ranges in the same subnet
    for (let i = 1; i <= 254; i++) {
      if (i !== parseInt(this.state.localDevice.ipAddress.split('.')[3])) {
        ips.push(`${baseIP}.${i}`);
      }
    }
    
    return ips;
  }

  private async probeNetworkDevice(ip: string): Promise<NetworkDevice | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`http://${ip}:3001/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.type === 'home-server') {
          return {
            id: `server-${ip}`,
            name: `Home Server (${ip})`,
            ipAddress: ip,
            port: 3001,
            lastSeen: new Date(),
            capabilities: ['sync', 'discovery', 'server', 'websocket']
          };
        }
      }
    } catch (error) {
      // Ignore connection errors for unreachable IPs
    }
    
    return null;
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
        debugService.warning('NetworkService: Unhandled message type', message.type);
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
    
    this.clearReconnectInterval();
    
    // Close WebSocket connection
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }
    
    // Close all P2P connections
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

  // WebSocket connection status
  isWebSocketConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  // Sync data with server
  async syncWithServer(data: any): Promise<void> {
    if (this.isWebSocketConnected()) {
      this.websocket?.send(JSON.stringify({
        type: 'sync_data',
        payload: data,
        deviceId: this.state.localDevice.id
      }));
    }
  }

  // Connect directly to a discovered server
  async connectToServer(serverDevice: NetworkDevice): Promise<boolean> {
    try {
      const response = await fetch(`http://${serverDevice.ipAddress}:${serverDevice.port}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        debugService.info('NetworkService: Successfully connected to server', {
          server: serverDevice.name,
          ip: serverDevice.ipAddress,
          clients: data.clients
        });
        
        // Try to establish WebSocket connection to this specific server
        if (serverDevice.capabilities.includes('websocket')) {
          try {
            const wsUrl = `ws://${serverDevice.ipAddress}:3002`; // Different port for P2P WebSocket
            const serverWs = new WebSocket(wsUrl);
            
            serverWs.onopen = () => {
              debugService.info('NetworkService: Connected to remote server WebSocket', serverDevice.name);
              // Add this as an additional WebSocket connection
              serverWs.send(JSON.stringify({
                type: 'device_announce',
                device: this.state.localDevice
              }));
            };
            
            return true;
          } catch (wsError) {
            debugService.warning('NetworkService: Could not establish WebSocket to remote server', wsError);
            return true; // HTTP connection still successful
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      debugService.error('NetworkService: Failed to connect to server', error);
      return false;
    }
  }

  // Public methods for status checking
  getConnectionStatus(): { websocketConnected: boolean; attempts: number; maxAttempts: number; p2pMode: boolean } {
    return {
      websocketConnected: this.websocket?.readyState === WebSocket.OPEN,
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      p2pMode: this.reconnectAttempts >= this.maxReconnectAttempts
    };
  }

  // Helper methods
  private isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod|blackberry|windows phone|mobile/.test(userAgent);
  }

  private getNetworkIP(): string | null {
    // Try to determine network IP from common network interfaces
    // This is a fallback method when WebRTC fails
    try {
      // In browser environment, we can only get limited network info
      // The best we can do is parse connection info if available
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        debugService.info('NetworkService: Connection info available', connection);
      }
      
      // For browsers, we need to rely on external IP detection or server assistance
      // Since we don't want external dependencies, we'll return null
      // and let the WebRTC method handle IP detection
      debugService.info('NetworkService: Browser IP detection limited, using WebRTC method');
      return null;
    } catch (error) {
      debugService.warning('NetworkService: Could not determine network IP', error);
      return null;
    }
  }

  // Method to disable WebSocket for troubleshooting
  disableWebSocket(): void {
    this.stopReconnecting();
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }
    debugService.info('NetworkService: WebSocket manually disabled, using P2P-only mode');
  }

  // P2P Methods
  connectToP2PDevice(deviceId: string): Promise<boolean> {
    return webrtcService.connectToPeer(deviceId);
  }

  getP2PConnectedDevices(): string[] {
    return webrtcService.getConnectedPeers();
  }

  getP2PStats(): { totalPeers: number; connectedPeers: number; isInitialized: boolean } {
    return webrtcService.getStats();
  }

  syncWithDevice(deviceId: string): void {
    p2pSyncService.requestFullSync(deviceId);
  }

  syncWithAllDevices(): void {
    p2pSyncService.syncWithAllPeers();
  }

  getSyncStatus(): { 
    connectedPeers: number; 
    activeSyncs: number; 
    lastSyncTimes: Record<string, number> 
  } {
    return p2pSyncService.getSyncStatus();
  }

  sendP2PMessage(deviceId: string, type: string, data: any): boolean {
    return webrtcService.sendMessage(deviceId, {
      type: type as any,
      senderId: this.state.localDevice.id,
      timestamp: Date.now(),
      data
    });
  }

  broadcastP2PMessage(type: string, data: any): void {
    webrtcService.broadcastMessage({
      type: type as any,
      data
    });
  }
}

// Singleton instance
const networkService = new NetworkService();
export default networkService;