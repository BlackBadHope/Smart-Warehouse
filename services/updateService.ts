interface UpdateInfo {
  version: string;
  changelog: string[];
  downloadUrl: string;
  isRequired: boolean;
  releaseDate: string;
}

interface UpdateConfig {
  checkInterval: number; // minutes
  autoDownload: boolean;
  autoInstall: boolean;
  channel: 'stable' | 'beta';
}

class UpdateService {
  private config: UpdateConfig;
  private checkTimer: number | null = null;
  private currentVersion: string;
  private updateCallbacks: Function[] = [];
  private readonly UPDATE_CHECK_URL = 'https://api.inventory-os.com/updates/check';
  private readonly CONFIG_KEY = 'update-config';

  constructor() {
    this.currentVersion = '2.6.0';
    this.config = this.loadConfig();
    this.startPeriodicCheck();
    this.registerServiceWorkerUpdate();
  }

  private loadConfig(): UpdateConfig {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        return { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading update config:', error);
    }
    return this.getDefaultConfig();
  }

  private getDefaultConfig(): UpdateConfig {
    return {
      checkInterval: 60, // 1 hour
      autoDownload: true,
      autoInstall: false,
      channel: 'stable'
    };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving update config:', error);
    }
  }

  // Check for updates
  async checkForUpdates(manual = false): Promise<UpdateInfo | null> {
    try {
      const response = await fetch(this.UPDATE_CHECK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentVersion: this.currentVersion,
          channel: this.config.channel,
          platform: this.getPlatform(),
          manual
        })
      });

      if (!response.ok) {
        throw new Error(`Update check failed: ${response.status}`);
      }

      const updateInfo: UpdateInfo = await response.json();

      // Compare versions
      if (this.isNewerVersion(updateInfo.version, this.currentVersion)) {
        this.notifyUpdateAvailable(updateInfo);
        
        if (this.config.autoDownload && !manual) {
          this.downloadUpdate(updateInfo);
        }
        
        return updateInfo;
      }

      if (manual) {
        this.notifyNoUpdatesAvailable();
      }

      return null;
    } catch (error) {
      console.error('Error checking for updates:', error);
      
      if (manual) {
        this.notifyUpdateError('Не удалось проверить обновления');
      }
      
      return null;
    }
  }

  // Download update
  private async downloadUpdate(updateInfo: UpdateInfo): Promise<boolean> {
    try {
      // For PWA, we can't really "download" in traditional sense
      // Instead, we'll cache the new version using Service Worker
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cache = await caches.open(`inventory-os-${updateInfo.version}`);
        
        // Pre-cache critical resources for the new version
        const criticalResources = [
          '/',
          '/assets/app.js',
          '/assets/app.css',
          '/manifest.webmanifest'
        ];

        await cache.addAll(criticalResources.map(path => 
          `${updateInfo.downloadUrl}${path}`
        ));

        this.notifyUpdateDownloaded(updateInfo);
        
        if (this.config.autoInstall) {
          this.installUpdate(updateInfo);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error downloading update:', error);
      this.notifyUpdateError('Ошибка загрузки обновления');
      return false;
    }
  }

  // Install update
  async installUpdate(updateInfo: UpdateInfo): Promise<boolean> {
    try {
      // For PWA, "installing" means reloading with new Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration?.waiting) {
          // There's a waiting service worker, activate it
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Wait for the new service worker to take control
          return new Promise((resolve) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              window.location.reload();
              resolve(true);
            });
          });
        }
      }

      // Fallback: force reload
      window.location.reload();
      return true;
    } catch (error) {
      console.error('Error installing update:', error);
      this.notifyUpdateError('Ошибка установки обновления');
      return false;
    }
  }

  // Service Worker update handling
  private registerServiceWorkerUpdate(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_AVAILABLE') {
          const updateInfo: UpdateInfo = {
            version: event.data.version || 'Новая версия',
            changelog: ['Исправления и улучшения'],
            downloadUrl: '',
            isRequired: false,
            releaseDate: new Date().toISOString()
          };
          
          this.notifyUpdateAvailable(updateInfo);
        }
      });

      // Check for updates when SW updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.notifyUpdateInstalled();
      });
    }
  }

  // Version comparison
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const parseVersion = (version: string) => 
      version.split('.').map(v => parseInt(v, 10));
    
    const newVer = parseVersion(newVersion);
    const curVer = parseVersion(currentVersion);
    
    for (let i = 0; i < Math.max(newVer.length, curVer.length); i++) {
      const newPart = newVer[i] || 0;
      const curPart = curVer[i] || 0;
      
      if (newPart > curPart) return true;
      if (newPart < curPart) return false;
    }
    
    return false;
  }

  // Platform detection
  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    if (userAgent.includes('windows')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('linux')) return 'linux';
    
    return 'web';
  }

  // Periodic update checks
  private startPeriodicCheck(): void {
    this.stopPeriodicCheck();
    
    // Check immediately, then every interval
    setTimeout(() => this.checkForUpdates(), 5000);
    
    this.checkTimer = window.setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval * 60 * 1000);
  }

  private stopPeriodicCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  // Notification methods
  private notifyUpdateAvailable(updateInfo: UpdateInfo): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback('update_available', updateInfo);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  private notifyUpdateDownloaded(updateInfo: UpdateInfo): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback('update_downloaded', updateInfo);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  private notifyUpdateInstalled(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback('update_installed', null);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  private notifyNoUpdatesAvailable(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback('no_updates', null);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  private notifyUpdateError(message: string): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback('update_error', { message });
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  // Public API
  onUpdate(callback: (type: string, data: any) => void): void {
    this.updateCallbacks.push(callback);
  }

  offUpdate(callback: Function): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  getConfig(): UpdateConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<UpdateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    
    // Restart periodic checks with new interval
    if (newConfig.checkInterval !== undefined) {
      this.startPeriodicCheck();
    }
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  async manualCheckForUpdates(): Promise<UpdateInfo | null> {
    return this.checkForUpdates(true);
  }

  // Force update (for critical updates)
  async forceUpdate(): Promise<void> {
    const updateInfo = await this.checkForUpdates(true);
    if (updateInfo) {
      await this.downloadUpdate(updateInfo);
      await this.installUpdate(updateInfo);
    }
  }
}

// Singleton instance
export const updateService = new UpdateService();
export default updateService;