interface SyncMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface ServerInfo {
  ip: string;
  port: number;
  name: string;
  version: string;
}

class NetworkSyncService {
  private ws: WebSocket | null = null;
  private serverUrl: string | null = null;
  private reconnectInterval: number | null = null;
  private eventCallbacks: Map<string, Function[]> = new Map();
  private isConnected = false;

  // Auto-discovery of local servers
  async discoverServers(): Promise<ServerInfo[]> {
    try {
      // Try common local network IPs
      const commonIPs = this.generateLocalIPs();
      const servers: ServerInfo[] = [];

      for (const ip of commonIPs) {
        try {
          const response = await fetch(`http://${ip}:3001/api/health`, {
            method: 'GET',
            timeout: 1000
          } as any);
          
          if (response.ok) {
            const data = await response.json();
            if (data.type === 'home-server') {
              servers.push({
                ip,
                port: 3001,
                name: 'Inventory OS Home',
                version: data.version
              });
            }
          }
        } catch (error) {
          // Server not found on this IP, continue
        }
      }

      return servers;
    } catch (error) {
      console.error('Error discovering servers:', error);
      return [];
    }
  }

  private generateLocalIPs(): string[] {
    const ips: string[] = [];
    
    // Common local network ranges
    for (let i = 1; i < 255; i++) {
      ips.push(`192.168.1.${i}`);
      ips.push(`192.168.0.${i}`);
    }
    
    return ips;
  }

  // Connect to server
  async connectToServer(serverUrl: string): Promise<boolean> {
    try {
      this.serverUrl = serverUrl;
      const wsUrl = serverUrl.replace('http', 'ws').replace('3001', '3002');
      
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        if (!this.ws) return resolve(false);

        this.ws.onopen = () => {
          console.log('🔄 Connected to Home Server');
          this.isConnected = true;
          this.startHeartbeat();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SyncMessage = JSON.parse(event.data);
            this.handleSyncMessage(message);
          } catch (error) {
            console.error('Error parsing sync message:', error);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('❌ Disconnected from Home Server');
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          resolve(false);
        };

        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);
      });
    } catch (error) {
      console.error('Error connecting to server:', error);
      return false;
    }
  }

  // Send sync message to server
  sendSyncMessage(type: string, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot sync: not connected to server');
      return;
    }

    const message: SyncMessage = {
      type,
      data,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(message));
  }

  // Handle incoming sync messages
  private handleSyncMessage(message: SyncMessage) {
    const callbacks = this.eventCallbacks.get(message.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(message.data);
      } catch (error) {
        console.error('Error handling sync message:', error);
      }
    });
  }

  // Subscribe to sync events
  on(eventType: string, callback: Function) {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);
  }

  // Unsubscribe from sync events
  off(eventType: string, callback: Function) {
    const callbacks = this.eventCallbacks.get(eventType) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  // Heartbeat to keep connection alive
  private startHeartbeat() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000); // Every 30 seconds
  }

  // Reconnect logic
  private scheduleReconnect() {
    if (this.reconnectInterval) return;

    this.reconnectInterval = window.setTimeout(() => {
      if (this.serverUrl) {
        console.log('🔄 Attempting to reconnect...');
        this.connectToServer(this.serverUrl);
      }
      this.reconnectInterval = null;
    }, 5000);
  }

  // Get connection status
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  // Disconnect from server
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    
    this.isConnected = false;
  }

  // Hybrid storage: try server first, fallback to localStorage
  async hybridRead(key: string): Promise<any> {
    if (this.isConnected && this.serverUrl) {
      try {
        const response = await fetch(`${this.serverUrl}/api/${key}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn('Server read failed, using localStorage');
      }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  // Hybrid storage: save to both server and localStorage
  async hybridWrite(key: string, data: any): Promise<boolean> {
    let success = false;

    // Save to localStorage first (always works)
    try {
      localStorage.setItem(key, JSON.stringify(data));
      success = true;
    } catch (error) {
      console.error('localStorage save failed:', error);
    }

    // Try to sync to server if connected
    if (this.isConnected && this.serverUrl) {
      try {
        const response = await fetch(`${this.serverUrl}/api/${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          // Notify other clients about the change
          this.sendSyncMessage(`${key}_updated`, data);
        }
      } catch (error) {
        console.warn('Server sync failed:', error);
      }
    }

    return success;
  }
}

// Singleton instance
export const networkSync = new NetworkSyncService();

// Export for use in React components
export default networkSync;