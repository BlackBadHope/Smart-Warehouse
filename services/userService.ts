import { UserAccount, UserRole, DEFAULT_ROLE_PERMISSIONS, RolePermissions } from '../types/roles';
import debugService from './debugService';

const USERS_STORAGE_KEY = 'inventory-os-users';
const CURRENT_USER_KEY = 'inventory-os-current-user';

class UserService {
  private users: UserAccount[] = [];
  private currentUser: UserAccount | null = null;

  constructor() {
    this.loadUsers();
    this.loadCurrentUser();
  }

  // Initialize first-time setup with master user
  initializeFirstUser(name: string): UserAccount {
    const masterUser: UserAccount = {
      id: 'master-' + Date.now(),
      name: name || 'Master',
      role: 'master',
      createdAt: new Date(),
      lastActive: new Date(),
      personalContainers: [],
      hiddenContainers: []
    };

    this.users = [masterUser];
    this.currentUser = masterUser;
    this.saveUsers();
    this.saveCurrentUser();
    
    debugService.info('UserService: Master user initialized', { userId: masterUser.id, name: masterUser.name });
    return masterUser;
  }

  // Get current user
  getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  // Set current user
  setCurrentUser(userId: string): boolean {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.currentUser = user;
      user.lastActive = new Date();
      this.saveCurrentUser();
      this.saveUsers();
      debugService.action('UserService: User switched', { userId, userName: user.name, role: user.role });
      return true;
    }
    debugService.warning('UserService: Failed to switch user', { userId });
    return false;
  }

  // Add new user (only master can do this)
  addUser(name: string, role: UserRole): UserAccount | null {
    if (!this.canManageUsers()) {
      debugService.error('UserService: Permission denied - cannot manage users');
      return null;
    }

    const newUser: UserAccount = {
      id: role + '-' + Date.now(),
      name,
      role,
      createdAt: new Date(),
      lastActive: new Date(),
      personalContainers: [],
      hiddenContainers: []
    };

    this.users.push(newUser);
    this.saveUsers();
    debugService.info('UserService: New user added', { userId: newUser.id, name, role });
    return newUser;
  }

  // Get all users
  getAllUsers(): UserAccount[] {
    return [...this.users];
  }

  // Check if current user has permission
  hasPermission(permission: keyof RolePermissions): boolean {
    if (!this.currentUser) return false;
    return DEFAULT_ROLE_PERMISSIONS[this.currentUser.role][permission];
  }

  // Quick permission checks
  canManageUsers(): boolean {
    return this.hasPermission('canManageUsers');
  }

  canDeleteWarehouses(): boolean {
    return this.hasPermission('canDeleteWarehouses');
  }

  canViewHiddenContainers(): boolean {
    return this.hasPermission('canViewHiddenContainers');
  }

  canExportData(): boolean {
    return this.hasPermission('canExportData');
  }

  // Container ownership
  addPersonalContainer(containerId: string): void {
    if (this.currentUser) {
      if (!this.currentUser.personalContainers.includes(containerId)) {
        this.currentUser.personalContainers.push(containerId);
        this.saveUsers();
      }
    }
  }

  addHiddenContainer(containerId: string): void {
    if (this.currentUser && this.currentUser.role === 'family') {
      if (!this.currentUser.hiddenContainers.includes(containerId)) {
        this.currentUser.hiddenContainers.push(containerId);
        this.saveUsers();
      }
    }
  }

  isContainerVisible(containerId: string): boolean {
    if (!this.currentUser) return false;
    
    // Master can see everything
    if (this.currentUser.role === 'master') return true;
    
    // Check if container is hidden from this user
    const containerOwner = this.users.find(user => 
      user.hiddenContainers.includes(containerId)
    );
    
    if (containerOwner && containerOwner.id !== this.currentUser.id) {
      // If master wants to see hidden containers
      return this.canViewHiddenContainers();
    }
    
    return true;
  }

  // Data persistence
  private loadUsers(): void {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        this.users = JSON.parse(stored);
      }
    } catch (error) {
      debugService.error('UserService: Failed to load users', error);
      this.users = [];
    }
  }

  private saveUsers(): void {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
    } catch (error) {
      debugService.error('UserService: Failed to save users', error);
    }
  }

  private loadCurrentUser(): void {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        const userData = JSON.parse(stored);
        this.currentUser = this.users.find(u => u.id === userData.id) || null;
      }
    } catch (error) {
      debugService.error('UserService: Failed to load current user', error);
    }
  }

  private saveCurrentUser(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ id: this.currentUser.id }));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch (error) {
      debugService.error('UserService: Failed to save current user', error);
    }
  }

  // Check if this is first time setup
  needsInitialSetup(): boolean {
    return this.users.length === 0;
  }
}

export default new UserService();