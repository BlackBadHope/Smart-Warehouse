interface License {
  id: string;
  type: 'FREE' | 'HOME_PRO' | 'MULTI_LOCATION' | 'ANALYTICS_PRO';
  isActive: boolean;
  expiresAt?: Date;
  features: string[];
  activatedAt: Date;
}

interface LimitsConfig {
  maxWarehouses: number;
  maxRooms: number;
  maxDevices: number;
  hasAnalytics: boolean;
  hasExport: boolean;
  canCustomizeLabels: boolean;
}

class LicenseService {
  private licenses: License[] = [];
  private readonly STORAGE_KEY = 'inventory-licenses';

  constructor() {
    this.loadLicenses();
    this.ensureFreeLicense();
  }

  private loadLicenses() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.licenses = JSON.parse(stored).map((license: any) => ({
          ...license,
          activatedAt: new Date(license.activatedAt),
          expiresAt: license.expiresAt ? new Date(license.expiresAt) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading licenses:', error);
      this.licenses = [];
    }
  }

  private saveLicenses() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.licenses));
    } catch (error) {
      console.error('Error saving licenses:', error);
    }
  }

  private ensureFreeLicense() {
    const hasFreeLicense = this.licenses.some(l => l.type === 'FREE' && l.isActive);
    if (!hasFreeLicense) {
      this.activateFreeLicense();
    }
  }

  private activateFreeLicense() {
    const freeLicense: License = {
      id: 'free-default',
      type: 'FREE',
      isActive: true,
      features: ['basic_inventory', 'local_storage', 'barcode_scanner'],
      activatedAt: new Date()
    };
    
    this.licenses.push(freeLicense);
    this.saveLicenses();
  }

  // Get current active licenses
  getActiveLicenses(): License[] {
    const now = new Date();
    return this.licenses.filter(license => {
      return license.isActive && (!license.expiresAt || license.expiresAt > now);
    });
  }

  // Get current limits based on active licenses
  getCurrentLimits(): LimitsConfig {
    const activeLicenses = this.getActiveLicenses();
    
    // Default FREE limits
    let limits: LimitsConfig = {
      maxWarehouses: 2,
      maxRooms: 10,
      maxDevices: 5,
      hasAnalytics: false,
      hasExport: false,
      canCustomizeLabels: false
    };

    // Apply license upgrades
    activeLicenses.forEach(license => {
      switch (license.type) {
        case 'HOME_PRO':
          limits.maxWarehouses = Infinity;
          limits.maxRooms = Infinity;
          limits.hasExport = true;
          limits.canCustomizeLabels = true;
          break;
          
        case 'MULTI_LOCATION':
          limits.maxDevices = 20;
          break;
          
        case 'ANALYTICS_PRO':
          limits.hasAnalytics = true;
          limits.hasExport = true;
          break;
      }
    });

    return limits;
  }

  // Check if feature is available
  hasFeature(feature: string): boolean {
    const activeLicenses = this.getActiveLicenses();
    return activeLicenses.some(license => license.features.includes(feature));
  }

  // Validate action against limits
  canPerformAction(action: string, currentCount: number): boolean {
    const limits = this.getCurrentLimits();
    
    switch (action) {
      case 'add_warehouse':
        return currentCount < limits.maxWarehouses;
      case 'add_room':
        return currentCount < limits.maxRooms;
      case 'connect_device':
        return currentCount < limits.maxDevices;
      default:
        return true;
    }
  }

  // Get upgrade suggestions
  getUpgradeSuggestions(action: string): string[] {
    const suggestions: string[] = [];
    
    switch (action) {
      case 'add_warehouse':
      case 'add_room':
        suggestions.push('HOME_PRO');
        break;
      case 'connect_device':
        suggestions.push('MULTI_LOCATION');
        break;
      case 'export_data':
        suggestions.push('HOME_PRO', 'ANALYTICS_PRO');
        break;
      case 'advanced_analytics':
        suggestions.push('ANALYTICS_PRO');
        break;
    }
    
    return suggestions;
  }

  // Activate license with key
  async activateLicense(licenseKey: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate license key format
      if (!this.isValidLicenseKeyFormat(licenseKey)) {
        return { success: false, message: 'Неверный формат ключа лицензии' };
      }

      // Parse license info from key
      const licenseInfo = this.parseLicenseKey(licenseKey);
      if (!licenseInfo) {
        return { success: false, message: 'Недействительный ключ лицензии' };
      }

      // Check if already activated
      const existing = this.licenses.find(l => l.id === licenseInfo.id);
      if (existing) {
        return { success: false, message: 'Лицензия уже активирована' };
      }

      // Add license
      this.licenses.push(licenseInfo);
      this.saveLicenses();

      return { 
        success: true, 
        message: `Лицензия ${this.getLicenseTypeName(licenseInfo.type)} успешно активирована!` 
      };
      
    } catch (error) {
      console.error('Error activating license:', error);
      return { success: false, message: 'Ошибка активации лицензии' };
    }
  }

  // Generate license key (for testing/demo)
  generateLicenseKey(type: License['type'], daysValid?: number): string {
    const id = this.generateId();
    const expiresAt = daysValid ? new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000) : undefined;
    
    const licenseData = {
      id,
      type,
      expiresAt: expiresAt?.getTime()
    };

    // Simple encoding (in production, use proper encryption)
    return btoa(JSON.stringify(licenseData)).replace(/=/g, '');
  }

  private isValidLicenseKeyFormat(key: string): boolean {
    return /^[A-Za-z0-9+/]{20,}$/.test(key);
  }

  private parseLicenseKey(key: string): License | null {
    try {
      // Add padding if needed
      const padded = key + '='.repeat((4 - key.length % 4) % 4);
      const decoded = atob(padded);
      const data = JSON.parse(decoded);

      const features = this.getLicenseFeatures(data.type);
      
      return {
        id: data.id,
        type: data.type,
        isActive: true,
        features,
        activatedAt: new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
      };
    } catch (error) {
      return null;
    }
  }

  private getLicenseFeatures(type: License['type']): string[] {
    const baseFeatures = ['basic_inventory', 'local_storage', 'barcode_scanner'];
    
    switch (type) {
      case 'HOME_PRO':
        return [...baseFeatures, 'unlimited_storage', 'export_data', 'custom_labels'];
      case 'MULTI_LOCATION':
        return [...baseFeatures, 'multi_device', 'network_sync'];
      case 'ANALYTICS_PRO':
        return [...baseFeatures, 'advanced_analytics', 'reports', 'export_data'];
      default:
        return baseFeatures;
    }
  }

  private getLicenseTypeName(type: License['type']): string {
    switch (type) {
      case 'HOME_PRO': return 'Home Pro';
      case 'MULTI_LOCATION': return 'Multi-Location';
      case 'ANALYTICS_PRO': return 'Analytics Pro';
      default: return 'Free';
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Get license status for UI
  getLicenseStatus() {
    const limits = this.getCurrentLimits();
    const activeLicenses = this.getActiveLicenses();
    
    return {
      limits,
      activeLicenses: activeLicenses.map(l => ({
        type: l.type,
        name: this.getLicenseTypeName(l.type),
        expiresAt: l.expiresAt
      })),
      isPro: activeLicenses.some(l => l.type !== 'FREE')
    };
  }

  // Deactivate license
  deactivateLicense(licenseId: string): boolean {
    const license = this.licenses.find(l => l.id === licenseId);
    if (license && license.type !== 'FREE') {
      license.isActive = false;
      this.saveLicenses();
      return true;
    }
    return false;
  }
}

// Singleton instance
export const licenseService = new LicenseService();
export default licenseService;