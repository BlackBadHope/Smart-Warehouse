import React, { useState } from 'react';
import { Settings, Wifi, MessageCircle, QrCode, Download, ImageIcon, Bug, TestTube, Archive, UserCircle, Users, Info, Palette, Globe } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import localizationService from '../services/localizationService';
import rolesPermissionService from '../services/rolesPermissionService';
import userService from '../services/userService';

interface SettingsMenuProps {
  // Navigation handlers
  onShowNetworkManager: () => void;
  onShowQRConnection: () => void;
  onShowQRSync: () => void;
  onShowVisual: () => void;
  onShowSocialChat: () => void;
  onShowUserManagement: () => void;
  onShowImportExport: () => void;
  onShowDebug: () => void;
  onShowSelfTest: () => void;
  onShowP2PTest: () => void;
  onShowInfo: () => void;
  
  // Current state
  selectedWarehouseId: string | null;
  selectedWarehouseName: string | null;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  description?: string;
  badge?: string;
  adminOnly?: boolean;
  requiresWarehouse?: boolean;
  color?: string;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  onShowNetworkManager,
  onShowQRConnection,
  onShowQRSync,
  onShowVisual,
  onShowSocialChat,
  onShowUserManagement,
  onShowImportExport,
  onShowDebug,
  onShowSelfTest,
  onShowP2PTest,
  onShowInfo,
  selectedWarehouseId,
  selectedWarehouseName,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuSections: MenuSection[] = [
    {
      title: 'Connection & Sync',
      items: [
        {
          id: 'network',
          label: 'Simple P2P Network',
          icon: <Wifi size={18} className="text-blue-400" />,
          onClick: () => { onShowNetworkManager(); setIsOpen(false); },
          description: 'Easy P2P connections - test with multiple tabs',
          color: 'text-blue-400'
        },
        {
          id: 'qr-connection',
          label: 'QR P2P Connection',
          icon: <QrCode size={18} className="text-green-400" />,
          onClick: () => { onShowQRConnection(); setIsOpen(false); },
          description: 'Connect to other devices via QR code',
          color: 'text-green-400'
        },
        {
          id: 'device-sync',
          label: 'Device Sync',
          icon: <Download size={18} className="text-purple-400" />,
          onClick: () => { onShowQRSync(); setIsOpen(false); },
          description: 'Synchronize data with other devices',
          color: 'text-purple-400'
        },
      ]
    },
    {
      title: 'Collaboration',
      items: [
        {
          id: 'warehouse-chat',
          label: 'Warehouse Chat',
          icon: <MessageCircle size={18} className="text-green-400" />,
          onClick: () => { onShowSocialChat(); setIsOpen(false); },
          description: `Chat for ${selectedWarehouseName || 'selected warehouse'}`,
          requiresWarehouse: true,
          color: 'text-green-400'
        },
        {
          id: 'user-management',
          label: 'User Management',
          icon: <Users size={18} className="text-blue-400" />,
          onClick: () => { onShowUserManagement(); setIsOpen(false); },
          description: 'Manage user roles and permissions',
          adminOnly: true,
          color: 'text-blue-400'
        },
      ]
    },
    {
      title: 'Tools & Views',
      items: [
        {
          id: 'visual-view',
          label: 'Visual View',
          icon: <ImageIcon size={18} className="text-yellow-400" />,
          onClick: () => { onShowVisual(); setIsOpen(false); },
          description: 'Browse inventory with visual interface',
          color: 'text-yellow-400'
        },
        {
          id: 'import-export',
          label: 'Import/Export',
          icon: <Archive size={18} className="text-orange-400" />,
          onClick: () => { onShowImportExport(); setIsOpen(false); },
          description: 'Backup and restore inventory data',
          adminOnly: true,
          badge: 'Master',
          color: 'text-orange-400'
        },
      ]
    },
    {
      title: 'Diagnostics & Testing',
      items: [
        {
          id: 'self-test',
          label: 'Self-Test Suite',
          icon: <TestTube size={18} className="text-purple-400" />,
          onClick: () => { onShowSelfTest(); setIsOpen(false); },
          description: 'Run comprehensive system tests',
          color: 'text-purple-400'
        },
        {
          id: 'p2p-test',
          label: 'P2P Family Test',
          icon: <Wifi size={18} className="text-cyan-400" />,
          onClick: () => { onShowP2PTest(); setIsOpen(false); },
          description: 'Test P2P family collaboration scenarios',
          color: 'text-cyan-400'
        },
        {
          id: 'debug-log',
          label: 'Debug Log',
          icon: <Bug size={18} className="text-orange-400" />,
          onClick: () => { onShowDebug(); setIsOpen(false); },
          description: 'View system logs and debug information',
          adminOnly: true,
          color: 'text-orange-400'
        },
      ]
    },
    {
      title: 'About',
      items: [
        {
          id: 'info',
          label: 'App Info',
          icon: <Info size={18} className="text-gray-400" />,
          onClick: () => { onShowInfo(); setIsOpen(false); },
          description: 'About Inventory OS v2.6',
          color: 'text-gray-400'
        },
      ]
    }
  ];

  const filteredSections = menuSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // ВРЕМЕННО: показываем все кнопки для тестирования
      // TODO: вернуть фильтрацию после отладки
      return true;
      
      // // Hide admin-only items if user doesn't have permissions
      // if (item.adminOnly && !rolesPermissionService.hasPermission('user.assign-roles', selectedWarehouseId || undefined) && !userService.canExportData()) {
      //   return false;
      // }
      // 
      // // Hide warehouse-specific items if no warehouse is selected
      // if (item.requiresWarehouse && !selectedWarehouseId) {
      //   return false;
      // }
      // 
      // return true;
    })
  })).filter(section => section.items.length > 0);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} transition-colors`}
        title="Settings & Tools"
      >
        <Settings size={18} className="text-gray-300" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(false)}
        className={`${ASCII_COLORS.buttonBg} p-2 rounded-md border ${ASCII_COLORS.border} bg-yellow-600 text-black`}
        title="Close Settings"
      >
        <Settings size={18} />
      </button>
      
      {/* Close overlay - MUST be before panel for proper z-index */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setIsOpen(false)}
      />
      
      {/* Settings Panel */}
      <div className={`absolute top-12 right-0 w-80 ${ASCII_COLORS.modalBg} border-2 ${ASCII_COLORS.border} rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4 border-b ${ASCII_COLORS.border} pb-2">
            <h3 className={`${ASCII_COLORS.accent} text-lg font-bold`}>
              ⚙️ Settings & Tools
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Close"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            {filteredSections.map(section => (
              <div key={section.title}>
                <h4 className={`${ASCII_COLORS.text} text-sm font-semibold mb-2 opacity-70`}>
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onClick();
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 transition-colors text-left`}
                      title={item.description}
                    >
                      {item.icon}
                      <div className="flex-1 min-w-0">
                        <div className={`${ASCII_COLORS.text} text-sm truncate`}>
                          {item.label}
                          {item.badge && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-600 text-black rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-400 truncate">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;