export type UserRole = 'master' | 'family' | 'guest';

export interface RolePermissions {
  canCreateWarehouses: boolean;
  canDeleteWarehouses: boolean;
  canCreateRooms: boolean;
  canDeleteRooms: boolean;
  canCreateContainers: boolean;
  canDeleteContainers: boolean;
  canAddItems: boolean;
  canDeleteItems: boolean;
  canEditItems: boolean;
  canViewAllContainers: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canChangeSettings: boolean;
  canViewHiddenContainers: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  lastActive: Date;
  personalContainers: string[]; // Container IDs this user owns
  hiddenContainers: string[];   // Container IDs hidden from others
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  master: {
    canCreateWarehouses: true,
    canDeleteWarehouses: true,
    canCreateRooms: true,
    canDeleteRooms: true,
    canCreateContainers: true,
    canDeleteContainers: true,
    canAddItems: true,
    canDeleteItems: true,
    canEditItems: true,
    canViewAllContainers: true,
    canExportData: true,
    canManageUsers: true,
    canChangeSettings: true,
    canViewHiddenContainers: true
  },
  family: {
    canCreateWarehouses: false,
    canDeleteWarehouses: false,
    canCreateRooms: false,
    canDeleteRooms: false,
    canCreateContainers: true,
    canDeleteContainers: false, // Only own containers
    canAddItems: true,
    canDeleteItems: true,      // Only own items
    canEditItems: true,        // Only own items
    canViewAllContainers: true,
    canExportData: false,
    canManageUsers: false,
    canChangeSettings: false,
    canViewHiddenContainers: false
  },
  guest: {
    canCreateWarehouses: false,
    canDeleteWarehouses: false,
    canCreateRooms: false,
    canDeleteRooms: false,
    canCreateContainers: false,
    canDeleteContainers: false,
    canAddItems: false,
    canDeleteItems: false,
    canEditItems: false,
    canViewAllContainers: false, // Only public containers
    canExportData: false,
    canManageUsers: false,
    canChangeSettings: false,
    canViewHiddenContainers: false
  }
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  master: 'Master (Full Access)',
  family: 'Family Member',
  guest: 'Guest (View Only)'
};