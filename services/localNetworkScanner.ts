// Local Network Scanner for finding shared warehouses
class LocalNetworkScanner {
  private isScanning = false;
  private discoveredServers: Map<string, any> = new Map();

  async scanLocalNetwork(): Promise<Array<{ip: string, warehouses: any[]}>> {
    if (this.isScanning) {
      console.log('Scan already in progress');
      return Array.from(this.discoveredServers.values());
    }

    this.isScanning = true;
    this.discoveredServers.clear();

    try {
      console.log('Scanning local network for shared warehouses...');
      
      // Get our local IP to determine network range
      const localIP = await this.getLocalIP();
      const networkBase = this.getNetworkBase(localIP);
      
      const scanPromises = [];
      
      // Scan common local IP ranges
      for (let i = 1; i <= 254; i++) {
        const targetIP = `${networkBase}.${i}`;
        scanPromises.push(this.checkDevice(targetIP));
      }

      // Wait for all scans with timeout
      await Promise.allSettled(scanPromises);
      
      console.log(`Network scan complete. Found ${this.discoveredServers.size} servers.`);
      return Array.from(this.discoveredServers.values());

    } finally {
      this.isScanning = false;
    }
  }

  private async checkDevice(ip: string): Promise<void> {
    try {
      // Try to connect to discovery endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 sec timeout

      const response = await fetch(`http://${ip}:8765/api/discovery`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        if (data.service === 'inventory-os-local') {
          console.log(`Found Inventory OS server at ${ip}:`, data);
          
          // Get available warehouses
          const warehousesResponse = await fetch(`http://${ip}:8765/api/warehouses`);
          if (warehousesResponse.ok) {
            const warehousesData = await warehousesResponse.json();
            
            this.discoveredServers.set(ip, {
              ip,
              device_name: data.device_name,
              warehouses: warehousesData.shared_warehouses || [],
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (error) {
      // Ignore network errors - device not reachable or not running our service
    }
  }

  private async getLocalIP(): Promise<string> {
    // Simple method to get local IP
    try {
      const pc = new RTCPeerConnection();
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
        
        // Fallback
        setTimeout(() => {
          pc.close();
          resolve('192.168.1.100'); // Default assumption
        }, 3000);
      });
    } catch {
      return '192.168.1.100'; // Default fallback
    }
  }

  private getNetworkBase(ip: string): string {
    // Extract network base from IP (assumes /24 subnet)
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  async connectToWarehouse(serverIP: string, warehouseId: string): Promise<any> {
    try {
      console.log(`Connecting to warehouse ${warehouseId} on ${serverIP}...`);
      
      const response = await fetch(`http://${serverIP}:8765/api/warehouse/${warehouseId}`);
      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      console.log(`Successfully connected to warehouse: ${data.warehouse.name}`);
      return data.warehouse;

    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  getDiscoveredServers(): Array<{ip: string, device_name: string, warehouses: any[]}> {
    return Array.from(this.discoveredServers.values());
  }
}

const localNetworkScanner = new LocalNetworkScanner();
export default localNetworkScanner;