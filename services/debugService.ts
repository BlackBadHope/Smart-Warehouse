interface DebugEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'action';
  message: string;
  details?: any;
}

class DebugService {
  private events: DebugEvent[] = [];
  private maxEvents = 1000;

  log(type: DebugEvent['type'], message: string, details?: any) {
    const event: DebugEvent = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };

    this.events.unshift(event);
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Also log to console for web debugging with better formatting
    const timestamp = new Date().toLocaleTimeString();
    const consoleMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${timestamp}] [${type.toUpperCase()}] ${message}`, details || '');
    
    // Persist critical events to localStorage for debugging
    if (type === 'error') {
      this.persistCriticalEvent(event);
    }
  }

  private persistCriticalEvent(event: DebugEvent) {
    try {
      const criticalEvents = JSON.parse(localStorage.getItem('inventory-critical-events') || '[]');
      criticalEvents.unshift(event);
      // Keep last 50 critical events
      if (criticalEvents.length > 50) {
        criticalEvents.splice(50);
      }
      localStorage.setItem('inventory-critical-events', JSON.stringify(criticalEvents));
    } catch (error) {
      console.error('Failed to persist critical event:', error);
    }
  }

  getEvents(): DebugEvent[] {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }

  // Convenience methods
  info(message: string, details?: any) {
    this.log('info', message, details);
  }

  warning(message: string, details?: any) {
    this.log('warning', message, details);
  }

  error(message: string, details?: any) {
    this.log('error', message, details);
  }

  action(message: string, details?: any) {
    this.log('action', message, details);
  }

  // Advanced debugging methods
  getCriticalEvents(): DebugEvent[] {
    try {
      return JSON.parse(localStorage.getItem('inventory-critical-events') || '[]');
    } catch {
      return [];
    }
  }

  clearCriticalEvents() {
    localStorage.removeItem('inventory-critical-events');
  }

  exportLogs(): string {
    const data = {
      timestamp: new Date().toISOString(),
      version: '2.6.0',
      events: this.events,
      criticalEvents: this.getCriticalEvents(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
    return JSON.stringify(data, null, 2);
  }

  getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      memoryInfo: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : 'Not available'
    };
  }
}

export default new DebugService();