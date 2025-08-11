interface SyncConflict {
  id: string;
  type: 'warehouse' | 'room' | 'shelf' | 'item';
  objectId: string;
  objectName: string;
  field: string;
  localValue: any;
  serverValue: any;
  localTimestamp: number;
  serverTimestamp: number;
  deviceName: string;
}

interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  syncedItemsCount: number;
  errorMessage?: string;
}

class SyncService {
  private lastSyncTimestamp = 0;

  async performSync(masterIP: string, localData: any): Promise<SyncResult> {
    try {
      console.log(`Starting sync with master at ${masterIP}`);
      
      // Send local changes to master
      const response = await fetch(`http://${masterIP}:8765/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.getDeviceId(),
          timestamp: Date.now(),
          data: localData,
          lastSync: this.lastSyncTimestamp
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const syncResponse = await response.json();
      
      // Check for conflicts
      const conflicts = this.detectConflicts(localData, syncResponse.serverData);
      
      if (conflicts.length > 0) {
        return {
          success: false,
          conflicts: conflicts,
          syncedItemsCount: 0
        };
      }

      // No conflicts - merge data
      const mergedData = this.mergeData(localData, syncResponse.serverData);
      await this.applyMergedData(mergedData);
      
      this.lastSyncTimestamp = Date.now();
      
      return {
        success: true,
        conflicts: [],
        syncedItemsCount: this.countSyncedItems(localData, syncResponse.serverData)
      };

    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        conflicts: [],
        syncedItemsCount: 0,
        errorMessage: (error as Error).message
      };
    }
  }

  async resolveConflicts(
    masterIP: string, 
    conflicts: SyncConflict[], 
    resolutions: Record<string, 'local' | 'server' | 'merge'>
  ): Promise<boolean> {
    try {
      console.log('Resolving conflicts:', Object.keys(resolutions).length);
      
      // Apply resolutions locally
      for (const conflict of conflicts) {
        const resolution = resolutions[conflict.id];
        if (!resolution) continue;

        await this.applyConflictResolution(conflict, resolution);
      }

      // Send resolution back to master
      const response = await fetch(`http://${masterIP}:8765/api/sync-resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.getDeviceId(),
          timestamp: Date.now(),
          resolutions: resolutions
        })
      });

      if (response.ok) {
        this.lastSyncTimestamp = Date.now();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      return false;
    }
  }

  private detectConflicts(localData: any, serverData: any): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Compare warehouses
    if (localData.warehouses && serverData.warehouses) {
      conflicts.push(...this.compareWarehouses(localData.warehouses, serverData.warehouses));
    }

    return conflicts;
  }

  private compareWarehouses(localWarehouses: any[], serverWarehouses: any[]): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Create maps for easier comparison
    const localMap = new Map(localWarehouses.map(w => [w.id, w]));
    const serverMap = new Map(serverWarehouses.map(w => [w.id, w]));

    // Check for conflicts in existing warehouses
    for (const [id, localWarehouse] of localMap) {
      const serverWarehouse = serverMap.get(id);
      if (serverWarehouse) {
        // Check each field for conflicts
        const fieldConflicts = this.compareObjects(
          'warehouse',
          localWarehouse,
          serverWarehouse,
          ['name', 'description', 'lastModified']
        );
        conflicts.push(...fieldConflicts);
      }
    }

    return conflicts;
  }

  private compareObjects(
    type: 'warehouse' | 'room' | 'shelf' | 'item',
    localObj: any,
    serverObj: any,
    fields: string[]
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    for (const field of fields) {
      if (localObj[field] !== serverObj[field]) {
        // Check timestamps to determine if this is a real conflict
        const localTimestamp = localObj.lastModified || localObj.timestamp || 0;
        const serverTimestamp = serverObj.lastModified || serverObj.timestamp || 0;

        // Only consider it a conflict if both were modified recently
        const timeDiff = Math.abs(localTimestamp - serverTimestamp);
        if (timeDiff < 60000) { // Within 1 minute = potential conflict
          conflicts.push({
            id: `${localObj.id}-${field}`,
            type,
            objectId: localObj.id,
            objectName: localObj.name || localObj.id,
            field,
            localValue: localObj[field],
            serverValue: serverObj[field],
            localTimestamp,
            serverTimestamp,
            deviceName: this.getDeviceName()
          });
        }
      }
    }

    return conflicts;
  }

  private mergeData(localData: any, serverData: any): any {
    // Simple merge strategy - server wins for now
    // In a real implementation, this would be more sophisticated
    return {
      ...localData,
      warehouses: this.mergeArrays(
        localData.warehouses || [],
        serverData.warehouses || [],
        'id'
      )
    };
  }

  private mergeArrays(localArray: any[], serverArray: any[], idField: string): any[] {
    const merged = new Map();
    
    // Add server items first
    serverArray.forEach(item => merged.set(item[idField], item));
    
    // Add local items that don't exist on server
    localArray.forEach(item => {
      if (!merged.has(item[idField])) {
        merged.set(item[idField], item);
      }
    });
    
    return Array.from(merged.values());
  }

  private async applyMergedData(mergedData: any): Promise<void> {
    // Save merged data to local storage
    if (mergedData.warehouses) {
      localStorage.setItem('inventory-os-warehouses', JSON.stringify(mergedData.warehouses));
    }
    
    // Trigger data refresh event
    window.dispatchEvent(new CustomEvent('syncDataUpdated', { detail: mergedData }));
  }

  private async applyConflictResolution(conflict: SyncConflict, resolution: 'local' | 'server' | 'merge'): Promise<void> {
    console.log(`Applying resolution for ${conflict.objectName}.${conflict.field}: ${resolution}`);
    
    // Get current data
    const warehousesData = JSON.parse(localStorage.getItem('inventory-os-warehouses') || '[]');
    
    // Find and update the object
    const warehouse = warehousesData.find((w: any) => w.id === conflict.objectId);
    if (warehouse) {
      switch (resolution) {
        case 'local':
          warehouse[conflict.field] = conflict.localValue;
          break;
        case 'server':
          warehouse[conflict.field] = conflict.serverValue;
          break;
        case 'merge':
          // Simple merge strategy
          warehouse[conflict.field] = `${conflict.localValue} / ${conflict.serverValue}`;
          break;
      }
      
      warehouse.lastModified = Date.now();
    }
    
    // Save updated data
    localStorage.setItem('inventory-os-warehouses', JSON.stringify(warehousesData));
  }

  private countSyncedItems(localData: any, serverData: any): number {
    let count = 0;
    
    if (localData.warehouses) count += localData.warehouses.length;
    if (serverData.warehouses) count += serverData.warehouses.length;
    
    return count;
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
    return localStorage.getItem('device-name') || 
           `${navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'} Device`;
  }

  // Manual sync trigger
  async triggerManualSync(masterIP: string): Promise<SyncResult> {
    console.log('Manual sync triggered');
    
    // Get all local data
    const localData = {
      warehouses: JSON.parse(localStorage.getItem('inventory-os-warehouses') || '[]'),
      bucketItems: JSON.parse(localStorage.getItem('inventory-os-bucket') || '[]'),
      timestamp: Date.now()
    };
    
    return this.performSync(masterIP, localData);
  }

  getLastSyncTime(): number {
    return this.lastSyncTimestamp;
  }

  isRecentlySync(): boolean {
    const timeSinceSync = Date.now() - this.lastSyncTimestamp;
    return timeSinceSync < 300000; // Less than 5 minutes
  }
}

const syncService = new SyncService();
export default syncService;