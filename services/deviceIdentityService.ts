import { v4 as uuidv4 } from 'uuid';
import debugService from './debugService';

export interface DeviceIdentity {
  deviceId: string;
  deviceName: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface UserProfile {
  deviceId: string;
  nickname: string;
  isFirstTimeUser: boolean;
  setupCompletedAt?: Date;
}

class DeviceIdentityService {
  private static readonly DEVICE_ID_KEY = 'inventory-device-id';
  private static readonly DEVICE_NAME_KEY = 'inventory-device-name';
  private static readonly USER_PROFILE_KEY = 'inventory-user-profile';
  private static readonly DEVICE_CREATED_KEY = 'inventory-device-created';
  private static readonly DEVICE_LAST_ACTIVE_KEY = 'inventory-device-last-active';

  private deviceIdentity: DeviceIdentity | null = null;
  private userProfile: UserProfile | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      this.deviceIdentity = this.loadOrCreateDeviceIdentity();
      this.userProfile = this.loadUserProfile();
      
      // Update last active timestamp
      this.updateLastActive();
      
      debugService.info('DeviceIdentityService: Initialized', {
        deviceId: this.deviceIdentity.deviceId,
        hasUserProfile: !!this.userProfile,
        isFirstTime: this.userProfile?.isFirstTimeUser ?? true
      });
    } catch (error) {
      debugService.error('DeviceIdentityService: Failed to initialize', error);
      throw error;
    }
  }

  private loadOrCreateDeviceIdentity(): DeviceIdentity {
    let deviceId = localStorage.getItem(DeviceIdentityService.DEVICE_ID_KEY);
    let deviceName = localStorage.getItem(DeviceIdentityService.DEVICE_NAME_KEY);
    let createdAtStr = localStorage.getItem(DeviceIdentityService.DEVICE_CREATED_KEY);
    let lastActiveAtStr = localStorage.getItem(DeviceIdentityService.DEVICE_LAST_ACTIVE_KEY);

    // Generate new device ID if doesn't exist
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem(DeviceIdentityService.DEVICE_ID_KEY, deviceId);
      debugService.action('DeviceIdentityService: Generated new device ID', { deviceId });
    }

    // Generate default device name if doesn't exist
    if (!deviceName) {
      deviceName = `Device-${deviceId.slice(0, 8)}`;
      localStorage.setItem(DeviceIdentityService.DEVICE_NAME_KEY, deviceName);
    }

    // Set creation timestamp if doesn't exist
    const now = new Date();
    if (!createdAtStr) {
      localStorage.setItem(DeviceIdentityService.DEVICE_CREATED_KEY, now.toISOString());
      createdAtStr = now.toISOString();
    }

    if (!lastActiveAtStr) {
      localStorage.setItem(DeviceIdentityService.DEVICE_LAST_ACTIVE_KEY, now.toISOString());
      lastActiveAtStr = now.toISOString();
    }

    return {
      deviceId,
      deviceName,
      createdAt: new Date(createdAtStr),
      lastActiveAt: new Date(lastActiveAtStr)
    };
  }

  private loadUserProfile(): UserProfile | null {
    const profileStr = localStorage.getItem(DeviceIdentityService.USER_PROFILE_KEY);
    if (!profileStr) return null;

    try {
      const profile = JSON.parse(profileStr);
      return {
        ...profile,
        setupCompletedAt: profile.setupCompletedAt ? new Date(profile.setupCompletedAt) : undefined
      };
    } catch (error) {
      debugService.error('DeviceIdentityService: Failed to parse user profile', error);
      return null;
    }
  }

  private updateLastActive(): void {
    const now = new Date();
    localStorage.setItem(DeviceIdentityService.DEVICE_LAST_ACTIVE_KEY, now.toISOString());
    if (this.deviceIdentity) {
      this.deviceIdentity.lastActiveAt = now;
    }
  }

  // Public API
  getDeviceIdentity(): DeviceIdentity {
    if (!this.deviceIdentity) {
      throw new Error('Device identity not initialized');
    }
    return { ...this.deviceIdentity };
  }

  getUserProfile(): UserProfile | null {
    return this.userProfile ? { ...this.userProfile } : null;
  }

  isFirstTimeUser(): boolean {
    return !this.userProfile || this.userProfile.isFirstTimeUser;
  }

  needsWelcomeScreen(): boolean {
    return this.isFirstTimeUser() || !this.userProfile?.nickname;
  }

  completeUserSetup(nickname: string): void {
    if (!this.deviceIdentity) {
      throw new Error('Device identity not initialized');
    }

    const now = new Date();
    this.userProfile = {
      deviceId: this.deviceIdentity.deviceId,
      nickname: nickname.trim(),
      isFirstTimeUser: false,
      setupCompletedAt: now
    };

    localStorage.setItem(DeviceIdentityService.USER_PROFILE_KEY, JSON.stringify({
      ...this.userProfile,
      setupCompletedAt: now.toISOString()
    }));

    debugService.action('DeviceIdentityService: User setup completed', {
      deviceId: this.deviceIdentity.deviceId,
      nickname: this.userProfile.nickname
    });

    // Dispatch event for other services
    window.dispatchEvent(new CustomEvent('userSetupCompleted', {
      detail: { userProfile: this.userProfile }
    }));
  }

  updateNickname(newNickname: string): void {
    if (!this.userProfile) {
      throw new Error('User profile not initialized');
    }

    const oldNickname = this.userProfile.nickname;
    this.userProfile.nickname = newNickname.trim();

    localStorage.setItem(DeviceIdentityService.USER_PROFILE_KEY, JSON.stringify({
      ...this.userProfile,
      setupCompletedAt: this.userProfile.setupCompletedAt?.toISOString()
    }));

    debugService.action('DeviceIdentityService: Nickname updated', {
      deviceId: this.userProfile.deviceId,
      oldNickname,
      newNickname: this.userProfile.nickname
    });

    // Dispatch event for other services
    window.dispatchEvent(new CustomEvent('nicknameChanged', {
      detail: { 
        oldNickname, 
        newNickname: this.userProfile.nickname,
        userProfile: this.userProfile 
      }
    }));
  }

  updateDeviceName(newDeviceName: string): void {
    if (!this.deviceIdentity) {
      throw new Error('Device identity not initialized');
    }

    const oldDeviceName = this.deviceIdentity.deviceName;
    this.deviceIdentity.deviceName = newDeviceName.trim();

    localStorage.setItem(DeviceIdentityService.DEVICE_NAME_KEY, this.deviceIdentity.deviceName);

    debugService.action('DeviceIdentityService: Device name updated', {
      deviceId: this.deviceIdentity.deviceId,
      oldDeviceName,
      newDeviceName: this.deviceIdentity.deviceName
    });
  }

  // Network-related helpers
  getNetworkIdentity() {
    const device = this.getDeviceIdentity();
    const user = this.getUserProfile();
    
    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      userNickname: user?.nickname || 'Anonymous',
      lastActiveAt: device.lastActiveAt
    };
  }

  // For P2P authentication
  generateAuthToken(): string {
    const device = this.getDeviceIdentity();
    const user = this.getUserProfile();
    
    return btoa(JSON.stringify({
      deviceId: device.deviceId,
      nickname: user?.nickname || 'Anonymous',
      timestamp: Date.now()
    }));
  }

  // Reset (for testing/debugging only)
  resetIdentity(): void {
    localStorage.removeItem(DeviceIdentityService.DEVICE_ID_KEY);
    localStorage.removeItem(DeviceIdentityService.DEVICE_NAME_KEY);
    localStorage.removeItem(DeviceIdentityService.USER_PROFILE_KEY);
    localStorage.removeItem(DeviceIdentityService.DEVICE_CREATED_KEY);
    localStorage.removeItem(DeviceIdentityService.DEVICE_LAST_ACTIVE_KEY);
    
    debugService.action('DeviceIdentityService: Identity reset');
    
    // Re-initialize
    this.initialize();
  }
}

const deviceIdentityService = new DeviceIdentityService();
export default deviceIdentityService;