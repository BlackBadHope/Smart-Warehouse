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
      timestamp: new Date().toLocaleString(),
      type,
      message,
      details
    };

    this.events.unshift(event);
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Also log to console for web debugging
    const consoleMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[${type.toUpperCase()}] ${message}`, details || '');
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
}

export default new DebugService();