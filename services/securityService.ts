interface SecurityConfig {
  enableInputSanitization: boolean;
  enableRateLimiting: boolean;
  enableDataValidation: boolean;
  maxRequestsPerMinute: number;
  sessionTimeout: number; // minutes
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class SecurityService {
  private config: SecurityConfig;
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private blockedIPs = new Set<string>();
  private securityLog: Array<{ timestamp: Date; type: string; details: string; severity: 'low' | 'medium' | 'high' }> = [];
  
  private readonly CONFIG_KEY = 'security-config';
  private readonly BLOCKED_IPS_KEY = 'blocked-ips';

  constructor() {
    this.config = this.loadConfig();
    this.loadBlockedIPs();
    this.startCleanupTimer();
  }

  private loadConfig(): SecurityConfig {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        return { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading security config:', error);
    }
    return this.getDefaultConfig();
  }

  private getDefaultConfig(): SecurityConfig {
    return {
      enableInputSanitization: true,
      enableRateLimiting: true,
      enableDataValidation: true,
      maxRequestsPerMinute: 60,
      sessionTimeout: 120 // 2 hours
    };
  }

  private loadBlockedIPs(): void {
    try {
      const stored = localStorage.getItem(this.BLOCKED_IPS_KEY);
      if (stored) {
        this.blockedIPs = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading blocked IPs:', error);
    }
  }

  private saveBlockedIPs(): void {
    try {
      localStorage.setItem(this.BLOCKED_IPS_KEY, JSON.stringify([...this.blockedIPs]));
    } catch (error) {
      console.error('Error saving blocked IPs:', error);
    }
  }

  private startCleanupTimer(): void {
    // Clean up rate limit entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.rateLimitMap.entries()) {
        if (now > entry.resetTime) {
          this.rateLimitMap.delete(key);
        }
      }
    }, 60000);
  }

  // Input sanitization
  sanitizeInput(input: string): string {
    if (!this.config.enableInputSanitization) {
      return input;
    }

    return input
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove script content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Escape special characters
      .replace(/[<>"'&]/g, (char) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[char] || char;
      })
      // Remove potential SQL injection patterns
      .replace(/('|(\\)|(;)|(--)|(\|)|(\*)|(\%)|(\+)|(select|union|insert|drop|delete|update|create|alter|exec|execute))/gi, '')
      // Limit length
      .slice(0, 1000);
  }

  // Data validation
  validateItemData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.enableDataValidation) {
      return { isValid: true, errors: [] };
    }

    // Required fields
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Name is required and must be a string');
    }

    // Validate quantity
    if (data.quantity !== undefined) {
      if (typeof data.quantity !== 'number' || data.quantity < 0 || data.quantity > 1000000) {
        errors.push('Quantity must be a positive number less than 1,000,000');
      }
    }

    // Validate price
    if (data.price !== undefined) {
      if (typeof data.price !== 'number' || data.price < 0 || data.price > 1000000) {
        errors.push('Price must be a positive number less than 1,000,000');
      }
    }

    // Validate dates
    if (data.purchaseDate && !this.isValidDate(data.purchaseDate)) {
      errors.push('Purchase date must be in YYYY-MM-DD format');
    }

    if (data.expiryDate && !this.isValidDate(data.expiryDate)) {
      errors.push('Expiry date must be in YYYY-MM-DD format');
    }

    // Validate priority
    if (data.priority && !['High', 'Normal', 'Low', 'Dispose'].includes(data.priority)) {
      errors.push('Priority must be High, Normal, Low, or Dispose');
    }

    // Validate unit
    if (data.unit && !['pcs', 'kg', 'g', 'l', 'ml', 'box', 'pack'].includes(data.unit)) {
      errors.push('Unit must be one of: pcs, kg, g, l, ml, box, pack');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  }

  // Rate limiting
  checkRateLimit(identifier: string): boolean {
    if (!this.config.enableRateLimiting) {
      return true;
    }

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    const entry = this.rateLimitMap.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.rateLimitMap.set(identifier, {
        count: 1,
        resetTime: now + 60000
      });
      return true;
    }

    if (entry.count >= this.config.maxRequestsPerMinute) {
      // Rate limit exceeded
      this.logSecurityEvent('rate_limit_exceeded', `Identifier: ${identifier}`, 'medium');
      return false;
    }

    // Increment counter
    entry.count++;
    return true;
  }

  // IP blocking
  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    this.saveBlockedIPs();
    this.logSecurityEvent('ip_blocked', `IP: ${ip}, Reason: ${reason}`, 'high');
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.saveBlockedIPs();
    this.logSecurityEvent('ip_unblocked', `IP: ${ip}`, 'low');
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  // Content Security Policy headers (for server implementation)
  getCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for React dev mode
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "connect-src 'self' ws: wss:",
        "font-src 'self' data:",
        "object-src 'none'",
        "media-src 'self'",
        "child-src 'none'"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  // Secure data storage
  encryptData(data: string, key?: string): string {
    try {
      // Simple encryption for demo (use proper encryption in production)
      const cryptoKey = key || 'inventory-os-key';
      const encrypted = btoa(
        data
          .split('')
          .map((char, i) => 
            String.fromCharCode(char.charCodeAt(0) ^ cryptoKey.charCodeAt(i % cryptoKey.length))
          )
          .join('')
      );
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return data; // Fallback to unencrypted
    }
  }

  decryptData(encryptedData: string, key?: string): string {
    try {
      const cryptoKey = key || 'inventory-os-key';
      const decrypted = atob(encryptedData)
        .split('')
        .map((char, i) => 
          String.fromCharCode(char.charCodeAt(0) ^ cryptoKey.charCodeAt(i % cryptoKey.length))
        )
        .join('');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData; // Fallback to encrypted data
    }
  }

  // Security logging
  private logSecurityEvent(type: string, details: string, severity: 'low' | 'medium' | 'high'): void {
    const event = {
      timestamp: new Date(),
      type,
      details,
      severity
    };

    this.securityLog.push(event);

    // Keep only last 1000 events
    if (this.securityLog.length > 1000) {
      this.securityLog = this.securityLog.slice(-1000);
    }

    // Log to console for debugging
    console.log(`[SECURITY] ${severity.toUpperCase()}: ${type} - ${details}`);

    // Auto-block on repeated high-severity events
    if (severity === 'high') {
      this.checkAutoBlock(type, details);
    }
  }

  private checkAutoBlock(type: string, details: string): void {
    // Extract IP from details if present
    const ipMatch = details.match(/IP: (\d+\.\d+\.\d+\.\d+)/);
    if (!ipMatch) return;

    const ip = ipMatch[1];
    const recentEvents = this.securityLog.filter(event => 
      event.details.includes(ip) && 
      event.severity === 'high' &&
      Date.now() - event.timestamp.getTime() < 300000 // Last 5 minutes
    );

    if (recentEvents.length >= 3) {
      this.blockIP(ip, `Auto-blocked: ${recentEvents.length} high-severity events in 5 minutes`);
    }
  }

  // Public API
  getSecurityLog(): Array<{ timestamp: Date; type: string; details: string; severity: string }> {
    return [...this.securityLog];
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving security config:', error);
    }
  }

  // Generate secure random string
  generateSecureToken(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    if (crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      // Fallback for older browsers
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  // Validate file uploads
  validateFileUpload(file: File): { isValid: boolean; error?: string } {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { isValid: false, error: 'File size must be less than 10MB' };
    }

    // Check file type
    const allowedTypes = ['application/json', 'text/csv', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not allowed. Only JSON and CSV files are supported.' };
    }

    // Check file name
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      return { isValid: false, error: 'File name contains invalid characters' };
    }

    return { isValid: true };
  }

  // Session management
  createSession(): string {
    const sessionId = this.generateSecureToken();
    const session = {
      id: sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.config.sessionTimeout * 60 * 1000)
    };

    try {
      sessionStorage.setItem('security-session', JSON.stringify(session));
    } catch (error) {
      console.error('Error creating session:', error);
    }

    return sessionId;
  }

  validateSession(): boolean {
    try {
      const stored = sessionStorage.getItem('security-session');
      if (!stored) return false;

      const session = JSON.parse(stored);
      
      if (Date.now() > session.expiresAt) {
        sessionStorage.removeItem('security-session');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }
}

// Singleton instance
export const securityService = new SecurityService();
export default securityService;