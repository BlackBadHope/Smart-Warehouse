import debugService from './debugService';

// Event types for UI updates
export type UIUpdateEvent = 
  | 'warehouse-added' 
  | 'warehouse-updated' 
  | 'warehouse-deleted'
  | 'room-added' 
  | 'room-updated' 
  | 'room-deleted'
  | 'shelf-added' 
  | 'shelf-updated' 
  | 'shelf-deleted'
  | 'item-added' 
  | 'item-updated' 
  | 'item-deleted'
  | 'item-moved'
  | 'bucket-updated'
  | 'user-changed'
  | 'test-progress'
  | 'test-completed'
  | 'theme-changed'
  | 'language-changed'
  | 'data-imported'
  | 'data-exported';

export interface UIUpdatePayload {
  type: UIUpdateEvent;
  data?: any;
  timestamp: number;
  source: string; // Which service triggered this
}

type UIUpdateHandler = (payload: UIUpdatePayload) => void;

class UIUpdateService {
  private handlers: Map<UIUpdateEvent, UIUpdateHandler[]> = new Map();
  private globalHandlers: UIUpdateHandler[] = [];
  private isEnabled = true;
  private batchQueue: UIUpdatePayload[] = [];
  private batchTimeout?: number;
  private readonly BATCH_DELAY = 50; // ms - batch updates to avoid spam

  constructor() {
    debugService.info('UIUpdateService: Initialized');
    
    // Listen for localStorage changes from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key?.startsWith('inventory-')) {
        this.emit('data-imported', { source: 'external-tab' }, 'storage-event');
      }
    });
  }

  // Subscribe to specific event type
  on(eventType: UIUpdateEvent, handler: UIUpdateHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
    
    debugService.info('UIUpdateService: Handler registered', { eventType });
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  // Subscribe to all events (useful for main app component)
  onAny(handler: UIUpdateHandler): () => void {
    this.globalHandlers.push(handler);
    
    debugService.info('UIUpdateService: Global handler registered');
    
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }

  // Emit event with batching to avoid UI spam
  emit(eventType: UIUpdateEvent, data?: any, source: string = 'unknown'): void {
    if (!this.isEnabled) return;

    const payload: UIUpdatePayload = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source
    };

    // Add to batch queue
    this.batchQueue.push(payload);

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Set new timeout to process batch
    this.batchTimeout = window.setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);

    debugService.info('UIUpdateService: Event queued', { 
      eventType, 
      source, 
      queueSize: this.batchQueue.length 
    });
  }

  private processBatch(): void {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    debugService.info('UIUpdateService: Processing batch', { 
      batchSize: batch.length,
      events: batch.map(p => p.type)
    });

    // Process each event in batch
    for (const payload of batch) {
      this.processEvent(payload);
    }
  }

  private processEvent(payload: UIUpdatePayload): void {
    try {
      // Call specific handlers
      const specificHandlers = this.handlers.get(payload.type) || [];
      specificHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          debugService.error('UIUpdateService: Handler error', { 
            eventType: payload.type, 
            error 
          });
        }
      });

      // Call global handlers
      this.globalHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          debugService.error('UIUpdateService: Global handler error', { 
            eventType: payload.type, 
            error 
          });
        }
      });

    } catch (error) {
      debugService.error('UIUpdateService: Event processing error', { 
        payload, 
        error 
      });
    }
  }

  // Emit multiple related events at once (useful for complex operations)
  emitBatch(events: Array<{ type: UIUpdateEvent; data?: any }>, source: string = 'batch'): void {
    events.forEach(event => {
      this.emit(event.type, event.data, source);
    });
  }

  // Temporarily disable updates (useful during bulk operations)
  disable(): void {
    this.isEnabled = false;
    debugService.info('UIUpdateService: Disabled');
  }

  // Re-enable updates
  enable(): void {
    this.isEnabled = true;
    debugService.info('UIUpdateService: Enabled');
  }

  // Force immediate processing of queued events
  flush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }
    this.processBatch();
  }

  // Get statistics
  getStats(): {
    activeHandlers: number;
    globalHandlers: number;
    queuedEvents: number;
    isEnabled: boolean;
  } {
    const activeHandlers = Array.from(this.handlers.values())
      .reduce((sum, handlers) => sum + handlers.length, 0);

    return {
      activeHandlers,
      globalHandlers: this.globalHandlers.length,
      queuedEvents: this.batchQueue.length,
      isEnabled: this.isEnabled
    };
  }

  // Clear all handlers (useful for cleanup)
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.length = 0;
    this.batchQueue.length = 0;
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }
    debugService.info('UIUpdateService: Cleared all handlers');
  }
}

// Singleton instance
const uiUpdateService = new UIUpdateService();
export default uiUpdateService;