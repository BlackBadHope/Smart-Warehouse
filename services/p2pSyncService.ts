import webrtcService from './webrtcService';
import * as localStorageService from './localStorageService';
import debugService from './debugService';
import { Warehouse, Item, Room, Shelf } from '../types';

interface SyncRequest {
  type: 'full_sync' | 'incremental_sync' | 'warehouse_request' | 'conflict_resolution';
  timestamp: number;
  lastSyncTime?: number;
  warehouseId?: string;
  data?: any;
}

interface SyncResponse {
  type: 'sync_data' | 'sync_acknowledge' | 'sync_conflict' | 'sync_error';
  timestamp: number;
  requestId?: string;
  data?: any;
  conflictItems?: any[];
  error?: string;
}

interface ConflictItem {
  id: string;
  localVersion: any;
  remoteVersion: any;
  lastModified: {
    local: Date;
    remote: Date;
  };
  type: 'warehouse' | 'room' | 'shelf' | 'item';
}

class P2PSyncService {
  private lastSyncTimes = new Map<string, number>(); // deviceId -> timestamp
  private syncInProgress = new Set<string>(); // track ongoing syncs
  private conflictResolutionCallbacks = new Map<string, Function>();
  
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for P2P messages
    document.addEventListener('p2p-message', (event: any) => {
      const { senderId, message } = event.detail;
      
      if (message.type === 'inventory_sync') {
        this.handleSyncMessage(senderId, message.data);
      }
    });

    // Listen for peer connections
    document.addEventListener('peer-connected', (event: any) => {
      const { deviceId } = event.detail;
      debugService.info('P2PSyncService: Peer connected, initiating sync', deviceId);
      
      // Wait a bit for connection to stabilize, then sync
      setTimeout(() => {
        this.requestFullSync(deviceId);
      }, 2000);
    });

    // Listen for local data changes
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('inventory-')) {
        this.onLocalDataChange(event.key, event.newValue);
      }
    });

    // Listen for inventory sync requests (from QR connections)
    document.addEventListener('inventory-sync-request', (event: any) => {
      const { deviceId, action } = event.detail;
      debugService.info('P2PSyncService: Received inventory sync request', { deviceId, action });
      
      if (action === 'full_sync') {
        this.requestFullSync(deviceId);
      }
    });
  }

  private async handleSyncMessage(senderId: string, data: SyncRequest | SyncResponse): Promise<void> {
    debugService.info('P2PSyncService: Handling sync message', { senderId, type: data.type });

    if ('type' in data) {
      if (this.isSyncRequest(data)) {
        await this.handleSyncRequest(senderId, data);
      } else {
        await this.handleSyncResponse(senderId, data);
      }
    }
  }

  private isSyncRequest(data: any): data is SyncRequest {
    return ['full_sync', 'incremental_sync', 'warehouse_request', 'conflict_resolution'].includes(data.type);
  }

  private async handleSyncRequest(senderId: string, request: SyncRequest): Promise<void> {
    switch (request.type) {
      case 'full_sync':
        await this.handleFullSyncRequest(senderId, request);
        break;
      case 'incremental_sync':
        await this.handleIncrementalSyncRequest(senderId, request);
        break;
      case 'warehouse_request':
        await this.handleWarehouseRequest(senderId, request);
        break;
      case 'conflict_resolution':
        await this.handleConflictResolution(senderId, request);
        break;
    }
  }

  private async handleSyncResponse(senderId: string, response: SyncResponse): Promise<void> {
    switch (response.type) {
      case 'sync_data':
        await this.handleSyncData(senderId, response);
        break;
      case 'sync_conflict':
        await this.handleSyncConflict(senderId, response);
        break;
      case 'sync_acknowledge':
        this.handleSyncAcknowledge(senderId, response);
        break;
      case 'sync_error':
        this.handleSyncError(senderId, response);
        break;
    }
  }

  // Public API methods
  async requestFullSync(deviceId: string): Promise<void> {
    if (this.syncInProgress.has(deviceId)) {
      debugService.info('P2PSyncService: Sync already in progress with device', deviceId);
      return;
    }

    this.syncInProgress.add(deviceId);
    
    const request: SyncRequest = {
      type: 'full_sync',
      timestamp: Date.now(),
      lastSyncTime: this.lastSyncTimes.get(deviceId) || 0
    };

    const success = webrtcService.sendMessage(deviceId, {
      type: 'inventory_sync',
      senderId: '', // Will be set by webrtcService
      timestamp: Date.now(),
      data: request
    });

    if (!success) {
      this.syncInProgress.delete(deviceId);
      debugService.error('P2PSyncService: Failed to send sync request', deviceId);
    }
  }

  async syncWarehouse(deviceId: string, warehouseId: string): Promise<void> {
    const request: SyncRequest = {
      type: 'warehouse_request',
      timestamp: Date.now(),
      warehouseId
    };

    webrtcService.sendMessage(deviceId, {
      type: 'inventory_sync',
      senderId: '',
      timestamp: Date.now(),
      data: request
    });
  }

  // Sync request handlers
  private async handleFullSyncRequest(senderId: string, request: SyncRequest): Promise<void> {
    try {
      const warehouses = localStorageService.getWarehouses();
      const lastSyncTime = request.lastSyncTime || 0;
      
      // Filter data based on last sync time and permissions
      const syncData = {
        warehouses: warehouses.filter(w => this.shouldSyncWarehouse(w, senderId)),
        timestamp: Date.now(),
        deviceId: this.getLocalDeviceId()
      };

      const response: SyncResponse = {
        type: 'sync_data',
        timestamp: Date.now(),
        data: syncData
      };

      webrtcService.sendMessage(senderId, {
        type: 'inventory_sync',
        senderId: '',
        timestamp: Date.now(),
        data: response
      });

      debugService.info('P2PSyncService: Sent full sync data', { 
        senderId, 
        warehousesCount: syncData.warehouses.length 
      });
    } catch (error) {
      this.sendSyncError(senderId, 'Failed to prepare sync data: ' + error);
    }
  }

  private async handleIncrementalSyncRequest(senderId: string, request: SyncRequest): Promise<void> {
    // Similar to full sync but only send changes since lastSyncTime
    const lastSyncTime = request.lastSyncTime || 0;
    const warehouses = localStorageService.getWarehouses();
    
    const changedWarehouses = warehouses.filter(w => 
      this.shouldSyncWarehouse(w, senderId) && 
      this.getLastModified(w) > lastSyncTime
    );

    const response: SyncResponse = {
      type: 'sync_data',
      timestamp: Date.now(),
      data: {
        warehouses: changedWarehouses,
        isIncremental: true,
        deviceId: this.getLocalDeviceId()
      }
    };

    webrtcService.sendMessage(senderId, {
      type: 'inventory_sync',
      senderId: '',
      timestamp: Date.now(),
      data: response
    });
  }

  private async handleWarehouseRequest(senderId: string, request: SyncRequest): Promise<void> {
    if (!request.warehouseId) {
      this.sendSyncError(senderId, 'Warehouse ID not provided');
      return;
    }

    const warehouse = localStorageService.getWarehouses().find(w => w.id === request.warehouseId);
    
    if (!warehouse) {
      this.sendSyncError(senderId, 'Warehouse not found');
      return;
    }

    if (!this.shouldSyncWarehouse(warehouse, senderId)) {
      this.sendSyncError(senderId, 'Access denied to warehouse');
      return;
    }

    const response: SyncResponse = {
      type: 'sync_data',
      timestamp: Date.now(),
      data: { warehouse }
    };

    webrtcService.sendMessage(senderId, {
      type: 'inventory_sync',
      senderId: '',
      timestamp: Date.now(),
      data: response
    });
  }

  // Sync response handlers
  private async handleSyncData(senderId: string, response: SyncResponse): Promise<void> {
    try {
      const { warehouses, isIncremental = false } = response.data;
      const conflicts: ConflictItem[] = [];
      
      if (warehouses && Array.isArray(warehouses)) {
        for (const remoteWarehouse of warehouses) {
          const conflict = await this.mergePeerWarehouse(remoteWarehouse, senderId);
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }

      if (conflicts.length > 0) {
        // Send conflict notification
        const conflictResponse: SyncResponse = {
          type: 'sync_conflict',
          timestamp: Date.now(),
          conflictItems: conflicts
        };

        webrtcService.sendMessage(senderId, {
          type: 'inventory_sync',
          senderId: '',
          timestamp: Date.now(),
          data: conflictResponse
        });

        // Notify UI about conflicts
        document.dispatchEvent(new CustomEvent('sync-conflicts-detected', {
          detail: { senderId, conflicts }
        }));
      } else {
        // Send acknowledgment
        this.sendSyncAcknowledge(senderId);
      }

      // Update last sync time
      this.lastSyncTimes.set(senderId, Date.now());
      this.syncInProgress.delete(senderId);

      debugService.info('P2PSyncService: Processed sync data', { 
        senderId, 
        warehousesCount: warehouses?.length || 0,
        conflictsCount: conflicts.length 
      });

    } catch (error) {
      this.sendSyncError(senderId, 'Failed to process sync data: ' + error);
      this.syncInProgress.delete(senderId);
    }
  }

  private async mergePeerWarehouse(remoteWarehouse: Warehouse, senderId: string): Promise<ConflictItem | null> {
    const localWarehouses = localStorageService.getWarehouses();
    const existingWarehouse = localWarehouses.find(w => w.id === remoteWarehouse.id);

    if (!existingWarehouse) {
      // New warehouse, just add it
      localWarehouses.push(remoteWarehouse);
      localStorageService.setWarehouses(localWarehouses);
      
      debugService.info('P2PSyncService: Added new warehouse from peer', { 
        warehouseId: remoteWarehouse.id,
        senderId 
      });
      return null;
    }

    // Check for conflicts
    const localModified = this.getLastModified(existingWarehouse);
    const remoteModified = this.getLastModified(remoteWarehouse);

    if (localModified > remoteModified) {
      // Local is newer, keep local version
      debugService.info('P2PSyncService: Local warehouse is newer, keeping local version', {
        warehouseId: remoteWarehouse.id
      });
      return null;
    } else if (remoteModified > localModified) {
      // Remote is newer, update local
      const index = localWarehouses.findIndex(w => w.id === remoteWarehouse.id);
      localWarehouses[index] = remoteWarehouse;
      localStorageService.setWarehouses(localWarehouses);
      
      debugService.info('P2PSyncService: Updated warehouse from peer', {
        warehouseId: remoteWarehouse.id,
        senderId
      });
      return null;
    } else {
      // Same timestamp, check content differences
      if (JSON.stringify(existingWarehouse) !== JSON.stringify(remoteWarehouse)) {
        // Content differs, return conflict
        return {
          id: remoteWarehouse.id,
          localVersion: existingWarehouse,
          remoteVersion: remoteWarehouse,
          lastModified: {
            local: new Date(localModified),
            remote: new Date(remoteModified)
          },
          type: 'warehouse'
        };
      }
    }

    return null;
  }

  private handleSyncConflict(senderId: string, response: SyncResponse): void {
    debugService.info('P2PSyncService: Received sync conflicts', { 
      senderId, 
      conflictsCount: response.conflictItems?.length || 0 
    });

    document.dispatchEvent(new CustomEvent('sync-conflicts-received', {
      detail: { senderId, conflicts: response.conflictItems }
    }));
  }

  private handleSyncAcknowledge(senderId: string, response: SyncResponse): void {
    this.syncInProgress.delete(senderId);
    debugService.info('P2PSyncService: Sync acknowledged', senderId);
  }

  private handleSyncError(senderId: string, response: SyncResponse): void {
    this.syncInProgress.delete(senderId);
    debugService.error('P2PSyncService: Sync error from peer', { 
      senderId, 
      error: response.error 
    });
  }

  // Utility methods
  private shouldSyncWarehouse(warehouse: Warehouse, peerId: string): boolean {
    // Check if warehouse should be shared with this peer
    // For now, sync all public warehouses and private ones where peer has access
    return warehouse.accessControl?.accessLevel === 'public' || 
           this.hasWarehouseAccess(warehouse, peerId);
  }

  private hasWarehouseAccess(warehouse: Warehouse, peerId: string): boolean {
    // Check if peer has access to this warehouse
    // This would typically check the warehouse's permission list
    return warehouse.accessControl?.permissions?.some(p => p.userId === peerId) || false;
  }

  private getLastModified(item: any): number {
    return item.lastModifiedAt ? new Date(item.lastModifiedAt).getTime() : 
           item.createdAt ? new Date(item.createdAt).getTime() : 0;
  }

  private getLocalDeviceId(): string {
    return localStorage.getItem('inventory-device-id') || 'unknown';
  }

  private sendSyncError(deviceId: string, error: string): void {
    const response: SyncResponse = {
      type: 'sync_error',
      timestamp: Date.now(),
      error
    };

    webrtcService.sendMessage(deviceId, {
      type: 'inventory_sync',
      senderId: '',
      timestamp: Date.now(),
      data: response
    });
  }

  private sendSyncAcknowledge(deviceId: string): void {
    const response: SyncResponse = {
      type: 'sync_acknowledge',
      timestamp: Date.now()
    };

    webrtcService.sendMessage(deviceId, {
      type: 'inventory_sync',
      senderId: '',
      timestamp: Date.now(),
      data: response
    });
  }

  private onLocalDataChange(key: string, newValue: string | null): void {
    // Debounce local changes and notify peers
    clearTimeout((this as any).changeTimeout);
    (this as any).changeTimeout = setTimeout(() => {
      this.broadcastLocalChange(key, newValue);
    }, 1000); // Wait 1 second for batch changes
  }

  private broadcastLocalChange(key: string, newValue: string | null): void {
    const connectedPeers = webrtcService.getConnectedPeers();
    
    if (connectedPeers.length === 0) return;

    const changeNotification = {
      type: 'data_change',
      key,
      timestamp: Date.now(),
      hasValue: newValue !== null
    };

    // Don't send actual data in broadcast, peers can request it
    webrtcService.broadcastMessage({
      type: 'warehouse_update',
      data: changeNotification
    });

    debugService.info('P2PSyncService: Broadcasted local change notification', { 
      key, 
      peersCount: connectedPeers.length 
    });
  }

  // Public status methods
  getSyncStatus(): { 
    connectedPeers: number; 
    activeSyncs: number; 
    lastSyncTimes: Record<string, number> 
  } {
    return {
      connectedPeers: webrtcService.getConnectedPeers().length,
      activeSyncs: this.syncInProgress.size,
      lastSyncTimes: Object.fromEntries(this.lastSyncTimes)
    };
  }

  // Manual sync triggers
  syncWithAllPeers(): void {
    const connectedPeers = webrtcService.getConnectedPeers();
    
    connectedPeers.forEach(peerId => {
      this.requestFullSync(peerId);
    });

    debugService.info('P2PSyncService: Initiated sync with all peers', { 
      peersCount: connectedPeers.length 
    });
  }

  async resolveConflict(deviceId: string, conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    const request: SyncRequest = {
      type: 'conflict_resolution',
      timestamp: Date.now(),
      data: { conflictId, resolution }
    };

    webrtcService.sendMessage(deviceId, {
      type: 'inventory_sync',
      senderId: '',
      timestamp: Date.now(),
      data: request
    });
  }
}

export default new P2PSyncService();