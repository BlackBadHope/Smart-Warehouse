import { v4 as uuidv4 } from 'uuid';
import { Item, BucketItem, ItemCore } from '../types';
import debugService from './debugService';
import deviceIdentityService from './deviceIdentityService';

export interface TrashItem extends ItemCore {
  id: string;
  // Trash-specific fields
  disposedAt: Date;
  disposedBy: string; // User nickname
  disposedByDeviceId: string;
  originalLocation: string; // Where item was taken from
  disposalReason?: string; // Why was it disposed
  estimatedDecompositionDays?: number; // Based on item type
  actualDisposalDate?: Date; // When actually thrown out
  removalNotificationSent?: boolean;
}

export interface DisposalReminder {
  id: string;
  itemName: string;
  disposedAt: Date;
  estimatedRemovalDate: Date;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  isCompleted: boolean;
}

class TrashService {
  private static readonly TRASH_ITEMS_KEY = 'inventory-trash-items';
  private static readonly DISPOSAL_LOG_KEY = 'inventory-disposal-log';
  private static readonly REMINDERS_KEY = 'inventory-disposal-reminders';

  private trashItems: TrashItem[] = [];
  private disposalLog: TrashItem[] = [];
  private reminders: DisposalReminder[] = [];

  // Default decomposition times (in days)
  private readonly DECOMPOSITION_TIMES = {
    'organic': 7,      // Fruits, vegetables
    'dairy': 5,        // Milk, cheese
    'meat': 3,         // Meat, fish
    'bread': 7,        // Bread, pastries
    'leftovers': 3,    // Cooked food
    'paper': 14,       // Paper products
    'plastic': 365,    // Plastic containers
    'glass': 365,      // Glass containers
    'metal': 90,       // Metal cans
    'electronics': 30, // Small electronics
    'default': 7       // Default for unknown items
  };

  constructor() {
    this.loadData();
    this.checkReminders();
  }

  private loadData(): void {
    try {
      // Load trash items
      const trashStr = localStorage.getItem(TrashService.TRASH_ITEMS_KEY);
      if (trashStr) {
        const items = JSON.parse(trashStr);
        this.trashItems = items.map((item: any) => ({
          ...item,
          disposedAt: new Date(item.disposedAt),
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          actualDisposalDate: item.actualDisposalDate ? new Date(item.actualDisposalDate) : undefined
        }));
      }

      // Load disposal log
      const logStr = localStorage.getItem(TrashService.DISPOSAL_LOG_KEY);
      if (logStr) {
        const log = JSON.parse(logStr);
        this.disposalLog = log.map((item: any) => ({
          ...item,
          disposedAt: new Date(item.disposedAt),
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          actualDisposalDate: item.actualDisposalDate ? new Date(item.actualDisposalDate) : undefined
        }));
      }

      // Load reminders
      const remindersStr = localStorage.getItem(TrashService.REMINDERS_KEY);
      if (remindersStr) {
        const reminders = JSON.parse(remindersStr);
        this.reminders = reminders.map((reminder: any) => ({
          ...reminder,
          disposedAt: new Date(reminder.disposedAt),
          estimatedRemovalDate: new Date(reminder.estimatedRemovalDate)
        }));
      }

      debugService.info('TrashService: Data loaded', {
        trashItems: this.trashItems.length,
        disposalLog: this.disposalLog.length,
        reminders: this.reminders.length
      });
    } catch (error) {
      debugService.error('TrashService: Failed to load data', error);
    }
  }

  private saveData(): void {
    try {
      // Save trash items
      const trashToSave = this.trashItems.map(item => ({
        ...item,
        disposedAt: item.disposedAt.toISOString(),
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        actualDisposalDate: item.actualDisposalDate?.toISOString()
      }));
      localStorage.setItem(TrashService.TRASH_ITEMS_KEY, JSON.stringify(trashToSave));

      // Save disposal log
      const logToSave = this.disposalLog.map(item => ({
        ...item,
        disposedAt: item.disposedAt.toISOString(),
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        actualDisposalDate: item.actualDisposalDate?.toISOString()
      }));
      localStorage.setItem(TrashService.DISPOSAL_LOG_KEY, JSON.stringify(logToSave));

      // Save reminders
      const remindersToSave = this.reminders.map(reminder => ({
        ...reminder,
        disposedAt: reminder.disposedAt.toISOString(),
        estimatedRemovalDate: reminder.estimatedRemovalDate.toISOString()
      }));
      localStorage.setItem(TrashService.REMINDERS_KEY, JSON.stringify(remindersToSave));

      debugService.info('TrashService: Data saved');
    } catch (error) {
      debugService.error('TrashService: Failed to save data', error);
    }
  }

  private estimateDecompositionTime(item: Item | BucketItem): number {
    const category = item.category?.toLowerCase() || '';
    
    // Check for specific keywords in category or name
    const itemText = `${category} ${item.name}`.toLowerCase();
    
    for (const [type, days] of Object.entries(this.DECOMPOSITION_TIMES)) {
      if (type !== 'default' && itemText.includes(type)) {
        return days;
      }
    }
    
    // Special keyword detection
    if (itemText.includes('fruit') || itemText.includes('vegetable') || itemText.includes('produce')) {
      return this.DECOMPOSITION_TIMES.organic;
    }
    if (itemText.includes('milk') || itemText.includes('cheese') || itemText.includes('yogurt')) {
      return this.DECOMPOSITION_TIMES.dairy;
    }
    if (itemText.includes('meat') || itemText.includes('fish') || itemText.includes('chicken')) {
      return this.DECOMPOSITION_TIMES.meat;
    }
    
    return this.DECOMPOSITION_TIMES.default;
  }

  private createReminder(item: TrashItem): DisposalReminder {
    const estimatedRemovalDate = new Date(item.disposedAt);
    estimatedRemovalDate.setDate(estimatedRemovalDate.getDate() + (item.estimatedDecompositionDays || 7));

    let priority: 'high' | 'medium' | 'low' = 'medium';
    const decompositionDays = item.estimatedDecompositionDays || 7;
    
    if (decompositionDays <= 3) priority = 'high';
    else if (decompositionDays <= 7) priority = 'medium';
    else priority = 'low';

    return {
      id: uuidv4(),
      itemName: item.name,
      disposedAt: item.disposedAt,
      estimatedRemovalDate,
      priority,
      reason: this.getRemovalReason(item),
      isCompleted: false
    };
  }

  private getRemovalReason(item: TrashItem): string {
    const decompositionDays = item.estimatedDecompositionDays || 7;
    
    if (decompositionDays <= 3) {
      return 'Organic waste - remove soon to prevent odors';
    } else if (decompositionDays <= 7) {
      return 'Perishable item - remove within a week';
    } else if (decompositionDays <= 30) {
      return 'Regular waste - empty when convenient';
    } else {
      return 'Non-perishable - can stay longer if needed';
    }
  }

  // Public API
  disposeItem(item: Item | BucketItem, originalLocation: string, reason?: string): void {
    const userProfile = deviceIdentityService.getUserProfile();
    const deviceIdentity = deviceIdentityService.getDeviceIdentity();
    
    const decompositionDays = this.estimateDecompositionTime(item);
    
    const trashItem: TrashItem = {
      ...item,
      disposedAt: new Date(),
      disposedBy: userProfile?.nickname || 'Anonymous',
      disposedByDeviceId: deviceIdentity.deviceId,
      originalLocation,
      disposalReason: reason,
      estimatedDecompositionDays: decompositionDays,
      ownerId: deviceIdentity.deviceId,
      isPublic: false, // Trash is always private to the disposer
      createdBy: userProfile?.nickname || 'Anonymous'
    };

    this.trashItems.push(trashItem);
    
    // Create reminder
    const reminder = this.createReminder(trashItem);
    this.reminders.push(reminder);
    
    this.saveData();
    
    debugService.action('TrashService: Item disposed', {
      itemName: item.name,
      disposedBy: trashItem.disposedBy,
      estimatedRemovalDays: decompositionDays,
      originalLocation
    });
  }

  getTrashItems(): TrashItem[] {
    return [...this.trashItems];
  }

  getDisposalLog(): TrashItem[] {
    return [...this.disposalLog];
  }

  getActiveReminders(): DisposalReminder[] {
    return this.reminders.filter(r => !r.isCompleted);
  }

  getOverdueReminders(): DisposalReminder[] {
    const now = new Date();
    return this.reminders.filter(r => 
      !r.isCompleted && r.estimatedRemovalDate <= now
    );
  }

  markAsActuallyDisposed(itemId: string): boolean {
    const trashIndex = this.trashItems.findIndex(item => item.id === itemId);
    if (trashIndex === -1) return false;

    const item = this.trashItems[trashIndex];
    
    // Move to disposal log
    const disposedItem = {
      ...item,
      actualDisposalDate: new Date()
    };
    this.disposalLog.push(disposedItem);
    
    // Remove from trash
    this.trashItems.splice(trashIndex, 1);
    
    // Complete associated reminder
    const reminder = this.reminders.find(r => r.itemName === item.name && r.disposedAt.getTime() === item.disposedAt.getTime());
    if (reminder) {
      reminder.isCompleted = true;
    }
    
    this.saveData();
    
    debugService.action('TrashService: Item actually disposed', {
      itemName: item.name,
      daysinTrash: Math.floor((new Date().getTime() - item.disposedAt.getTime()) / (1000 * 60 * 60 * 24))
    });
    
    return true;
  }

  restoreFromTrash(itemId: string): TrashItem | null {
    const trashIndex = this.trashItems.findIndex(item => item.id === itemId);
    if (trashIndex === -1) return null;

    const item = this.trashItems.splice(trashIndex, 1)[0];
    
    // Remove associated reminder
    this.reminders = this.reminders.filter(r => 
      !(r.itemName === item.name && r.disposedAt.getTime() === item.disposedAt.getTime())
    );
    
    this.saveData();
    
    debugService.action('TrashService: Item restored from trash', {
      itemName: item.name,
      restoredBy: deviceIdentityService.getUserProfile()?.nickname || 'Anonymous'
    });
    
    return item;
  }

  completeReminder(reminderId: string): boolean {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (!reminder) return false;

    reminder.isCompleted = true;
    this.saveData();
    
    debugService.action('TrashService: Reminder completed', { reminderId });
    return true;
  }

  private checkReminders(): void {
    const overdueReminders = this.getOverdueReminders();
    if (overdueReminders.length > 0) {
      debugService.info('TrashService: Found overdue disposal reminders', {
        count: overdueReminders.length,
        items: overdueReminders.map(r => r.itemName)
      });
      
      // Dispatch event for UI to show notifications
      window.dispatchEvent(new CustomEvent('trashRemindersOverdue', {
        detail: { reminders: overdueReminders }
      }));
    }
  }

  // Statistics
  getStats() {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentDisposals = this.disposalLog.filter(item => item.disposedAt >= last30Days);
    const currentTrashCount = this.trashItems.length;
    const overdueCount = this.getOverdueReminders().length;
    
    return {
      currentTrashCount,
      totalDisposedItems: this.disposalLog.length,
      recentDisposals: recentDisposals.length,
      overdueReminders: overdueCount,
      avgTimeInTrash: this.calculateAverageTimeInTrash()
    };
  }

  private calculateAverageTimeInTrash(): number {
    if (this.disposalLog.length === 0) return 0;
    
    const totalDays = this.disposalLog.reduce((sum, item) => {
      if (item.actualDisposalDate) {
        const daysInTrash = Math.floor(
          (item.actualDisposalDate.getTime() - item.disposedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + daysInTrash;
      }
      return sum;
    }, 0);
    
    return Math.round(totalDays / this.disposalLog.length);
  }
}

const trashService = new TrashService();
export default trashService;