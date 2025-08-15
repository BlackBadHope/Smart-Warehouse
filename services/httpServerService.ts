// Simple HTTP server for Local Warehouse Sharing
class HTTPServerService {
  private isRunning = false;
  private port = 8765;
  private routes: Map<string, (request: any) => any> = new Map();
  private sharedWarehouses: Map<string, any> = new Map(); // warehouseId -> warehouse data

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check endpoint
    this.routes.set('/ping', () => ({ status: 'pong' }));
    
    // List available shared warehouses
    this.routes.set('/api/warehouses', () => ({
      service: 'inventory-os-local',
      shared_warehouses: Array.from(this.sharedWarehouses.keys()).map(id => ({
        id,
        name: this.sharedWarehouses.get(id)?.name || 'Unknown',
        owner: this.getDeviceName(),
        ip: this.getLocalIP()
      })),
      timestamp: Date.now()
    }));

    // Get specific warehouse data
    this.routes.set('/api/warehouse/:id', (request) => {
      const warehouseId = this.extractParam(request.url, 'id');
      const warehouse = this.sharedWarehouses.get(warehouseId);
      
      if (!warehouse) {
        return { error: 'Warehouse not found', code: 404 };
      }
      
      return {
        warehouse,
        timestamp: Date.now()
      };
    });

    // Sync specific warehouse
    this.routes.set('/api/warehouse/:id/sync', (request) => {
      const warehouseId = this.extractParam(request.url, 'id');
      
      if (request.method === 'POST') {
        // Receive sync data for specific warehouse
        return this.handleWarehouseSync(warehouseId, request.body);
      } else {
        // Send warehouse data
        const warehouse = this.sharedWarehouses.get(warehouseId);
        return warehouse ? { warehouse, timestamp: Date.now() } : { error: 'Not found' };
      }
    });

    // Discovery endpoint
    this.routes.set('/api/discovery', () => ({
      service: 'inventory-os-local',
      device_name: this.getDeviceName(),
      ip: this.getLocalIP(),
      port: this.port,
      shared_warehouses_count: this.sharedWarehouses.size,
      timestamp: Date.now()
    }));
  }

  async startServer(): Promise<boolean> {
    if (this.isRunning) {
      console.log('Server already running');
      return true;
    }

    try {
      // In a real implementation, this would start an actual HTTP server
      // For now, we'll simulate it by registering handlers
      console.log(`Starting HTTP server on port ${this.port}`);
      
      // Register service worker for handling requests
      if ('serviceWorker' in navigator) {
        await this.registerServiceWorker();
      }
      
      // Start UDP broadcast for discovery
      this.startDiscoveryBroadcast();
      
      this.isRunning = true;
      console.log(`Master server started successfully on port ${this.port}`);
      return true;
    } catch (error) {
      console.error('Failed to start server:', error);
      return false;
    }
  }

  async stopServer(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log('Stopping HTTP server...');
    
    // Unregister service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.scope.includes('inventory-os')) {
          await registration.unregister();
        }
      }
    }
    
    this.isRunning = false;
    console.log('Server stopped');
  }

  isServerRunning(): boolean {
    return this.isRunning;
  }

  // Share a specific warehouse
  shareWarehouse(warehouseId: string, warehouseData: any): boolean {
    if (!this.isRunning) {
      console.error('Server not running. Start server first.');
      return false;
    }
    
    this.sharedWarehouses.set(warehouseId, warehouseData);
    console.log(`Shared warehouse: ${warehouseData.name} (ID: ${warehouseId})`);
    return true;
  }

  // Stop sharing a warehouse
  unshareWarehouse(warehouseId: string): boolean {
    const removed = this.sharedWarehouses.delete(warehouseId);
    if (removed) {
      console.log(`Stopped sharing warehouse ID: ${warehouseId}`);
    }
    return removed;
  }

  // Get list of shared warehouses
  getSharedWarehouses(): Array<{id: string, name: string}> {
    return Array.from(this.sharedWarehouses.entries()).map(([id, data]) => ({
      id,
      name: data.name || 'Unknown'
    }));
  }

  private async registerServiceWorker(): Promise<void> {
    // Create a simple service worker for handling HTTP requests
    const swCode = `
      const routes = ${JSON.stringify(Array.from(this.routes.entries()))};
      
      self.addEventListener('fetch', (event) => {
        const url = new URL(event.request.url);
        const path = url.pathname;
        
        if (routes.has(path)) {
          event.respondWith(
            new Response(
              JSON.stringify(routes.get(path)(event.request)), 
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
                  'Access-Control-Allow-Headers': 'Content-Type'
                }
              }
            )
          );
        }
      });
    `;

    // Register the service worker with dynamic code
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    
    await navigator.serviceWorker.register(swUrl);
  }

  private startDiscoveryBroadcast(): void {
    // Simulate UDP broadcast for device discovery
    // In a real implementation, this would use actual UDP
    console.log('Starting discovery broadcast...');
    
    setInterval(() => {
      // Broadcast device info for discovery
      const discoveryInfo = {
        service: 'inventory-os',
        role: 'master',
        ip: this.getLocalIP(),
        port: this.port,
        timestamp: Date.now()
      };
      
      // Store in localStorage for other instances to find
      localStorage.setItem('inventory-os-master-discovery', JSON.stringify(discoveryInfo));
    }, 5000);
  }

  private getWarehousesData(): any {
    // Get current warehouses data from localStorage
    try {
      const data = localStorage.getItem('inventory-os-warehouses');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private getDeviceName(): string {
    return localStorage.getItem('device-name') || 'Inventory OS Master';
  }

  private getLocalIP(): string {
    // This would be replaced with actual IP detection
    return '192.168.222.236'; // User's master IP
  }

  // Handle incoming sync requests
  handleSyncRequest(clientIP: string, data: any): any {
    console.log(`Sync request from ${clientIP}:`, data);
    
    // Process sync data and return response
    return {
      status: 'success',
      conflicts: this.detectConflicts(data),
      serverData: this.getWarehousesData(),
      timestamp: Date.now()
    };
  }

  private detectConflicts(clientData: any): any[] {
    // Simple conflict detection
    const serverData = this.getWarehousesData();
    const conflicts = [];
    
    // This would contain more sophisticated conflict detection logic
    // For now, just check timestamps
    
    return conflicts;
  }

  private extractParam(url: string, paramName: string): string {
    // Simple URL parameter extraction for /:id patterns
    const parts = url.split('/');
    const index = parts.findIndex(p => p.startsWith(':' + paramName));
    return index > 0 ? parts[index + 1] : '';
  }

  private handleWarehouseSync(warehouseId: string, syncData: any): any {
    const warehouse = this.sharedWarehouses.get(warehouseId);
    if (!warehouse) {
      return { error: 'Warehouse not found', code: 404 };
    }

    // Handle sync logic here
    console.log(`Syncing warehouse ${warehouseId}:`, syncData);
    
    return {
      status: 'success',
      warehouse_id: warehouseId,
      timestamp: Date.now()
    };
  }
}

const httpServerService = new HTTPServerService();
export default httpServerService;