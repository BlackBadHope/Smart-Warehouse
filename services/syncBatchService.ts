import { v4 as uuidv4 } from 'uuid';
import debugService from './debugService';
import deviceIdentityService from './deviceIdentityService';
import rolesPermissionService from './rolesPermissionService';

export type SyncAction = 
  | 'item.create' | 'item.update' | 'item.delete' | 'item.move'
  | 'container.create' | 'container.update' | 'container.delete'
  | 'room.create' | 'room.update' | 'room.delete'
  | 'warehouse.create' | 'warehouse.update' | 'warehouse.delete';

export interface SyncChange {
  id: string;
  action: SyncAction;
  entityType: 'item' | 'container' | 'room' | 'warehouse';
  entityId: string;
  data: any;
  userId: string;
  userNickname: string;
  timestamp: Date;
  warehouseId?: string;
  conflictPriority: number; // Higher = more important
}

export interface SyncBatch {
  id: string;
  changes: SyncChange[];
  createdAt: Date;
  scheduledForSend: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
}

export interface SyncStatus {
  isPending: boolean;
  pendingChanges: number;
  timeUntilSend: number; // milliseconds
  lastSyncAt?: Date;
  failedBatches: number;
}

class SyncBatchService {
  private static readonly DEBOUNCE_TIME = 10000; // 10 seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly BATCH_STORAGE_KEY = 'inventory-sync-batches';

  private pendingBatch: SyncBatch | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private savedBatches: SyncBatch[] = [];
  private isOnline = true;
  private syncCallbacks: ((batch: SyncBatch) => Promise<boolean>)[] = [];

  constructor() {
    this.loadSavedBatches();
    this.setupEventListeners();
    
    // Try to send any pending batches on startup
    setTimeout(() => this.processPendingBatches(), 1000);
    
    debugService.info('SyncBatchService: Initialized');
  }

  private loadSavedBatches(): void {
    try {
      const batchesStr = localStorage.getItem(SyncBatchService.BATCH_STORAGE_KEY);
      if (batchesStr) {
        const batches = JSON.parse(batchesStr);
        this.savedBatches = batches.map((batch: any) => ({
          ...batch,
          createdAt: new Date(batch.createdAt),
          scheduledForSend: new Date(batch.scheduledForSend),
          changes: batch.changes.map((change: any) => ({
            ...change,
            timestamp: new Date(change.timestamp)
          }))
        }));
      }
      debugService.info('SyncBatchService: Loaded saved batches', { count: this.savedBatches.length });
    } catch (error) {
      debugService.error('SyncBatchService: Failed to load saved batches', error);
      this.savedBatches = [];
    }
  }

  private saveBatches(): void {
    try {
      const batchesToSave = this.savedBatches.map(batch => ({
        ...batch,
        createdAt: batch.createdAt.toISOString(),
        scheduledForSend: batch.scheduledForSend.toISOString(),
        changes: batch.changes.map(change => ({
          ...change,
          timestamp: change.timestamp.toISOString()
        }))
      }));
      localStorage.setItem(SyncBatchService.BATCH_STORAGE_KEY, JSON.stringify(batchesToSave));
    } catch (error) {
      debugService.error('SyncBatchService: Failed to save batches', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      debugService.info('SyncBatchService: Back online, processing pending batches');
      this.processPendingBatches();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      debugService.info('SyncBatchService: Gone offline, batching changes locally');
    });
  }

  private calculateConflictPriority(action: SyncAction, userRole: string): number {
    // Role-based priority
    let rolePriority = 0;
    switch (userRole) {
      case 'master': rolePriority = 1000; break;
      case 'admin': rolePriority = 800; break;
      case 'editor': rolePriority = 600; break;
      case 'viewer': rolePriority = 400; break;
      case 'guest': rolePriority = 200; break;
      default: rolePriority = 100;
    }

    // Action type priority
    let actionPriority = 0;
    if (action.includes('delete')) actionPriority = 100;
    else if (action.includes('create')) actionPriority = 50;
    else if (action.includes('update')) actionPriority = 25;
    else if (action.includes('move')) actionPriority = 10;

    // Timestamp priority (more recent = higher)
    const timePriority = Date.now() % 1000;

    return rolePriority + actionPriority + timePriority;
  }

  private createOrUpdateBatch(): void {
    const now = new Date();
    
    if (!this.pendingBatch) {
      this.pendingBatch = {
        id: uuidv4(),
        changes: [],
        createdAt: now,
        scheduledForSend: new Date(now.getTime() + SyncBatchService.DEBOUNCE_TIME),
        status: 'pending',
        retryCount: 0
      };
      debugService.info('SyncBatchService: Created new batch', { batchId: this.pendingBatch.id });
    }

    // Reset the timer - this is the debounce mechanism
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.pendingBatch.scheduledForSend = new Date(now.getTime() + SyncBatchService.DEBOUNCE_TIME);

    this.debounceTimer = setTimeout(() => {
      this.sendBatch();
    }, SyncBatchService.DEBOUNCE_TIME);

    debugService.info('SyncBatchService: Debounce timer reset', { 
      sendAt: this.pendingBatch.scheduledForSend.toISOString() 
    });
  }

  private async sendBatch(): Promise<void> {
    if (!this.pendingBatch || this.pendingBatch.changes.length === 0) {
      debugService.info('SyncBatchService: No changes to send');
      return;
    }

    const batchToSend = this.pendingBatch;
    this.pendingBatch = null;
    this.debounceTimer = null;

    if (!this.isOnline) {
      debugService.info('SyncBatchService: Offline, saving batch for later', { batchId: batchToSend.id });
      this.savedBatches.push(batchToSend);
      this.saveBatches();
      return;
    }

    batchToSend.status = 'sending';
    debugService.action('SyncBatchService: Sending batch', { 
      batchId: batchToSend.id, 
      changes: batchToSend.changes.length 
    });

    try {
      // Try all registered sync callbacks
      let success = false;
      for (const callback of this.syncCallbacks) {
        try {
          if (await callback(batchToSend)) {
            success = true;
            break;
          }
        } catch (error) {
          debugService.warn('SyncBatchService: Sync callback failed', error);
        }
      }

      if (success) {
        batchToSend.status = 'sent';
        debugService.action('SyncBatchService: Batch sent successfully', { batchId: batchToSend.id });
        
        // Dispatch success event for UI
        window.dispatchEvent(new CustomEvent('syncBatchSent', {
          detail: { batch: batchToSend }
        }));
      } else {
        throw new Error('No sync callback succeeded');
      }
    } catch (error) {
      debugService.error('SyncBatchService: Failed to send batch', error);
      batchToSend.status = 'failed';
      batchToSend.retryCount++;

      if (batchToSend.retryCount < SyncBatchService.MAX_RETRIES) {
        // Schedule retry
        this.savedBatches.push(batchToSend);
        this.saveBatches();
        
        // Retry with exponential backoff
        const retryDelay = Math.pow(2, batchToSend.retryCount) * 5000; // 5s, 10s, 20s
        setTimeout(() => this.processPendingBatches(), retryDelay);
        
        debugService.info('SyncBatchService: Scheduled retry', { 
          batchId: batchToSend.id, 
          retryCount: batchToSend.retryCount,
          retryIn: retryDelay
        });
      } else {
        debugService.error('SyncBatchService: Batch failed permanently', { batchId: batchToSend.id });
        
        // Dispatch failure event for UI
        window.dispatchEvent(new CustomEvent('syncBatchFailed', {
          detail: { batch: batchToSend, error }
        }));
      }
    }
  }

  private async processPendingBatches(): Promise<void> {
    if (!this.isOnline || this.savedBatches.length === 0) return;

    const batchesToRetry = this.savedBatches.filter(b => 
      b.status === 'failed' && b.retryCount < SyncBatchService.MAX_RETRIES
    );

    for (const batch of batchesToRetry) {
      // Remove from saved batches
      this.savedBatches = this.savedBatches.filter(b => b.id !== batch.id);
      
      // Try to send
      batch.status = 'sending';
      try {
        let success = false;
        for (const callback of this.syncCallbacks) {
          if (await callback(batch)) {
            success = true;
            break;
          }
        }

        if (success) {
          batch.status = 'sent';
          debugService.action('SyncBatchService: Retry succeeded', { batchId: batch.id });
        } else {
          throw new Error('No sync callback succeeded on retry');
        }
      } catch (error) {
        batch.status = 'failed';
        batch.retryCount++;
        
        if (batch.retryCount < SyncBatchService.MAX_RETRIES) {
          this.savedBatches.push(batch);
        }
        
        debugService.error('SyncBatchService: Retry failed', { batchId: batch.id, error });
      }
    }

    this.saveBatches();
  }

  // Public API
  addChange(
    action: SyncAction,
    entityType: 'item' | 'container' | 'room' | 'warehouse',
    entityId: string,
    data: any,
    warehouseId?: string
  ): void {
    const userProfile = deviceIdentityService.getUserProfile();
    const deviceIdentity = deviceIdentityService.getDeviceIdentity();
    const userRole = rolesPermissionService.getCurrentUserRole(warehouseId);

    const change: SyncChange = {
      id: uuidv4(),
      action,
      entityType,
      entityId,
      data,
      userId: deviceIdentity.deviceId,
      userNickname: userProfile?.nickname || 'Anonymous',
      timestamp: new Date(),
      warehouseId,
      conflictPriority: this.calculateConflictPriority(action, userRole)
    };

    this.createOrUpdateBatch();
    this.pendingBatch!.changes.push(change);

    debugService.action('SyncBatchService: Change added to batch', {
      action,
      entityType,
      entityId,
      userRole,
      priority: change.conflictPriority
    });

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('syncChangeAdded', {
      detail: { change, pendingChanges: this.pendingBatch!.changes.length }
    }));
  }

  getStatus(): SyncStatus {
    const now = new Date();
    const timeUntilSend = this.pendingBatch 
      ? Math.max(0, this.pendingBatch.scheduledForSend.getTime() - now.getTime())
      : 0;

    return {
      isPending: !!this.pendingBatch,
      pendingChanges: this.pendingBatch?.changes.length || 0,
      timeUntilSend,
      lastSyncAt: this.getLastSuccessfulSync(),
      failedBatches: this.savedBatches.filter(b => b.status === 'failed').length
    };
  }

  private getLastSuccessfulSync(): Date | undefined {
    // This should be enhanced to track actual successful syncs
    return undefined;
  }

  registerSyncCallback(callback: (batch: SyncBatch) => Promise<boolean>): void {
    this.syncCallbacks.push(callback);
    debugService.info('SyncBatchService: Sync callback registered');
  }

  unregisterSyncCallback(callback: (batch: SyncBatch) => Promise<boolean>): void {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    debugService.info('SyncBatchService: Sync callback unregistered');
  }

  // Force immediate send (for testing or urgent changes)
  forceSend(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.sendBatch();
  }

  // Clear all pending changes (for testing)
  clearPending(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingBatch = null;
    debugService.action('SyncBatchService: Cleared pending changes');
  }

  // Get conflict resolution data for UI
  getConflictData(changes: SyncChange[]): SyncChange[] {
    // Sort by priority (highest first) and timestamp (most recent first)
    return [...changes].sort((a, b) => {
      if (a.conflictPriority !== b.conflictPriority) {
        return b.conflictPriority - a.conflictPriority;
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }
}

const syncBatchService = new SyncBatchService();
export default syncBatchService;