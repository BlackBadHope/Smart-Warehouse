import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Home, Box, List, Info, ShoppingCart, MoveUpRight, Archive, UserCircle, BrainCircuit, Image as ImageIcon, Download, Bug, TestTube, Wifi, MessageCircle, QrCode } from 'lucide-react';

import { Warehouse, Room, Shelf, Item, ItemCore, BucketItem, UserProfile } from './types';
import { ASCII_COLORS } from './constants';
import * as localStorageService from './services/localStorageService';

import InputModal from './components/InputModal';
import InfoModal from './components/InfoModal';
import ConfirmModal from './components/ConfirmModal';
import AddItemModal from './components/AddItemModal';
import ChatModal from './components/ChatModal';
import ImportExportModal from './components/ImportExportModal';
import VisualView from './components/VisualView';
import ItemCard from './components/ItemCard';
import LanguageSwitcher from './components/LanguageSwitcher';
import DebugModal from './components/DebugModal';
import CurrencySelector from './components/CurrencySelector';
import UserSwitcher from './components/UserSwitcher';
import QRSyncModal from './components/QRSyncModal';
import NetworkManager from './components/NetworkManager';
import SimpleNetworkStatus from './components/SimpleNetworkStatus';
import SimpleNetworkPanel from './components/SimpleNetworkPanel';
import SocialChat from './components/SocialChat';
import SelfTestModal from './components/SelfTestModal';
import WelcomeScreen from './components/WelcomeScreen';
import CreateEntityModal from './components/CreateEntityModal';
import TrashModal from './components/TrashModal';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import UserManagementModal from './components/UserManagementModal';
import P2PTestRunner from './components/P2PTestRunner';
import SimpleQRModal from './components/SimpleQRModal';
import SettingsMenu from './components/SettingsMenu';
import ActionFeedback from './components/ActionFeedback';
import NavigationBreadcrumbs from './components/NavigationBreadcrumbs';
import localizationService from './services/localizationService';
import debugService from './services/debugService';
import userService from './services/userService';
import themeService from './services/themeService';
import uiUpdateService from './services/uiUpdateService';
import deviceIdentityService from './services/deviceIdentityService';
import rolesPermissionService from './services/rolesPermissionService';
import trashService from './services/trashService';
import syncBatchService from './services/syncBatchService';
import simpleP2PService from './services/simpleP2PService';

const InventoryApp: React.FC = () => {
  const [currentCurrency, setCurrentCurrency] = useState<string>(
    localStorage.getItem('inventory-os-currency') || localizationService.getAvailableCurrencies()[0] || 'USD'
  );
  const [currentLocale, setCurrentLocale] = useState<string>(localizationService.getCurrentLocale());
  
  const userProfile: UserProfile = {
    username: localizationService.translate('user.name', {}),
    currency: currentCurrency
  };
  
  const handleCurrencyChange = (newCurrency: string) => {
    setCurrentCurrency(newCurrency);
    localStorage.setItem('inventory-os-currency', newCurrency);
    debugService.info('Currency changed globally', { newCurrency });
  };

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [selectedWarehouseName, setSelectedWarehouseName] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomName, setSelectedRoomName] = useState<string | null>(null);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [selectedShelfName, setSelectedShelfName] = useState<string | null>(null);
  
  const [shelfItems, setShelfItems] = useState<Item[]>([]);
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | BucketItem | null>(null);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const [showInputModal, setShowInputModal] = useState(false);
  const [inputModalConfig, setInputModalConfig] = useState<{ title: string; label: string; onSubmit: (value: string) => Promise<void>; initialValue?: string }>({ title: '', label: '', onSubmit: async () => {} });
  
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showBucketView, setShowBucketView] = useState(false);

  const [containerToMove, setContainerToMove] = useState<Shelf | null>(null);
  
  const [itemToMoveFromBucket, setItemToMoveFromBucket] = useState<BucketItem | null>(null);
  const [showDestinationSelector, setShowDestinationSelector] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showVisual, setShowVisual] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showQRSync, setShowQRSync] = useState(false);
  const [showSelfTest, setShowSelfTest] = useState(false);
  const [showNetworkManager, setShowNetworkManager] = useState(false);
  const [showSocialChat, setShowSocialChat] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showQRConnection, setShowQRConnection] = useState(false);
  const [showLocalSharing, setShowLocalSharing] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showP2PTest, setShowP2PTest] = useState(false);
  const [showSimpleNetworkPanel, setShowSimpleNetworkPanel] = useState(false);
  const [createEntityConfig, setCreateEntityConfig] = useState<{
    type: 'warehouse' | 'room' | 'shelf' | 'item';
    title: string;
    label: string;
    parentContext?: string;
  }>({ type: 'warehouse', title: '', label: '' });

  // Filtering and sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'priority' | 'expiryDate' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // UX Feedback states
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'loading' | 'success' | 'warning' | 'tip';
    message: string;
    show: boolean;
  }>({
    type: 'tip',
    message: '',
    show: false
  });

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') setSuccessMessage(message);
    else setErrorMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 4000);
  }, []);

  const showActionFeedback = useCallback((message: string, type: 'loading' | 'success' | 'warning' | 'tip' = 'tip', duration = 3000) => {
    setActionFeedback({ type, message, show: true });
    if (type !== 'loading') {
      setTimeout(() => {
        setActionFeedback(prev => ({ ...prev, show: false }));
      }, duration);
    }
  }, []);

  const hideActionFeedback = useCallback(() => {
    setActionFeedback(prev => ({ ...prev, show: false }));
  }, []);

  // Initialize and load data
  useEffect(() => {
    debugService.info('Initializing Inventory OS');
    localStorageService.initializeLocalStorage();
    showActionFeedback('Welcome to Inventory OS! 📦 Everything simplified.', 'tip', 4000);
    
    // Initialize Simple P2P (non-blocking, much simpler!)
    const initializeSimpleP2P = async () => {
      try {
        debugService.info('Initializing Simple P2P system...');
        await simpleP2PService.initialize();
        debugService.info('Simple P2P ready! Open another tab to test.');
        showActionFeedback('P2P Network ready! 🌐 Open another tab to test.', 'success', 3000);
      } catch (error) {
        debugService.warning('Simple P2P initialization failed - no big deal!', error);
        showActionFeedback('P2P offline mode - working locally 🏠', 'tip', 2000);
      }
    };
    
    // Start Simple P2P in background (much faster)
    setTimeout(() => initializeSimpleP2P(), 1000);
    
    // Check if this is first time user
    if (deviceIdentityService.needsWelcomeScreen()) {
      setShowWelcomeScreen(true);
      debugService.info('First time user detected, showing welcome screen');
    }
    
    loadWarehouses();
    loadBucketItems();
    // Initialize theme service
    themeService.onUserChanged();
    
    // Set up UIUpdateService listeners for reactive UI updates
    const unsubscribers: (() => void)[] = [];
    
    // Listen for theme changes
    unsubscribers.push(uiUpdateService.on('theme-changed', (payload) => {
      debugService.info('Theme changed, forcing re-render', payload);
      setCurrentCurrency(curr => curr); // Force re-render
    }));
    
    // Listen for language changes
    unsubscribers.push(uiUpdateService.on('language-changed', (payload) => {
      debugService.info('Language changed, updating interface', payload);
      setCurrentLocale(payload.data?.locale || localizationService.getCurrentLocale());
    }));
    
    // Listen for warehouse changes
    unsubscribers.push(uiUpdateService.on('warehouse-added', () => {
      debugService.info('Warehouse added, reloading list');
      loadWarehouses();
    }));
    
    unsubscribers.push(uiUpdateService.on('warehouse-updated', () => {
      debugService.info('Warehouse updated, reloading data');
      loadWarehouses();
    }));
    
    unsubscribers.push(uiUpdateService.on('warehouse-deleted', () => {
      debugService.info('Warehouse deleted, reloading list');
      loadWarehouses();
    }));
    
    // Listen for room changes
    unsubscribers.push(uiUpdateService.on('room-added', () => {
      debugService.info('Room added, reloading rooms');
      if (selectedWarehouseId) loadRooms(selectedWarehouseId);
    }));
    
    unsubscribers.push(uiUpdateService.on('room-updated', () => {
      debugService.info('Room updated, reloading rooms');
      if (selectedWarehouseId) loadRooms(selectedWarehouseId);
    }));
    
    unsubscribers.push(uiUpdateService.on('room-deleted', () => {
      debugService.info('Room deleted, reloading rooms');
      if (selectedWarehouseId) loadRooms(selectedWarehouseId);
    }));
    
    // Listen for shelf/container changes
    unsubscribers.push(uiUpdateService.on('shelf-added', () => {
      debugService.info('Shelf added, reloading shelves');
      if (selectedWarehouseId && selectedRoomId) loadShelves(selectedWarehouseId, selectedRoomId);
    }));
    
    unsubscribers.push(uiUpdateService.on('shelf-updated', () => {
      debugService.info('Shelf updated, reloading shelves');
      if (selectedWarehouseId && selectedRoomId) loadShelves(selectedWarehouseId, selectedRoomId);
    }));
    
    unsubscribers.push(uiUpdateService.on('shelf-deleted', () => {
      debugService.info('Shelf deleted, reloading shelves');
      if (selectedWarehouseId && selectedRoomId) loadShelves(selectedWarehouseId, selectedRoomId);
    }));
    
    // Listen for item changes
    unsubscribers.push(uiUpdateService.on('item-added', () => {
      debugService.info('Item added, reloading items');
      if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
        loadItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      }
    }));
    
    unsubscribers.push(uiUpdateService.on('item-updated', () => {
      debugService.info('Item updated, reloading items');
      if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
        loadItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      }
    }));
    
    unsubscribers.push(uiUpdateService.on('item-deleted', () => {
      debugService.info('Item deleted, reloading items');
      if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
        loadItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      }
    }));
    
    unsubscribers.push(uiUpdateService.on('item-moved', () => {
      debugService.info('Item moved, reloading data');
      loadBucketItems();
      if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
        loadItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      }
    }));
    
    // Listen for bucket changes
    unsubscribers.push(uiUpdateService.on('bucket-updated', () => {
      debugService.info('Bucket updated, reloading bucket');
      loadBucketItems();
    }));
    
    // Listen for test events
    unsubscribers.push(uiUpdateService.on('test-progress', (payload) => {
      debugService.info('Test progress update', payload);
      // Test modal will handle this internally
    }));
    
    unsubscribers.push(uiUpdateService.on('test-completed', () => {
      debugService.info('Test completed, refreshing all data');
      loadWarehouses();
      loadBucketItems();
    }));
    
    // Listen for data import/export
    unsubscribers.push(uiUpdateService.on('data-imported', (payload) => {
      debugService.info('Data imported, refreshing all data', payload);
      
      // Force full refresh
      loadWarehouses();
      loadBucketItems();
      
      // Clear selections when data is reset
      if (payload.data?.action === 'reset-all') {
        setSelectedWarehouseId(null);
        setSelectedRoomId(null);
        setSelectedShelfId(null);
        setRooms([]);
        setShelves([]);
        setShelfItems([]);
        showNotification('All data has been reset');
      } else {
        showNotification('Data imported successfully');
      }
    }));
    
    unsubscribers.push(uiUpdateService.on('data-exported', () => {
      debugService.info('Data exported successfully');
      showNotification('Data exported successfully');
    }));
    
    // Keep old event listeners for backward compatibility
    const handleThemeChange = (event: CustomEvent) => {
      debugService.info('Legacy theme change event', event.detail);
      setCurrentCurrency(curr => curr);
    };
    
    const handleLocaleChange = (event: CustomEvent) => {
      debugService.info('Legacy locale change event', event.detail);
      setCurrentLocale(event.detail.locale);
    };
    
    const handleWarehouseUpdate = (event: CustomEvent) => {
      debugService.info('Legacy warehouse event', event.detail);
      loadWarehouses();
    };
    
    document.addEventListener('themeChanged', handleThemeChange as EventListener);
    document.addEventListener('localeChanged', handleLocaleChange as EventListener);
    document.addEventListener('warehouseCreated', handleWarehouseUpdate as EventListener);
    document.addEventListener('warehouseUpdated', handleWarehouseUpdate as EventListener);
    
    debugService.action('App initialized successfully');
    
    return () => {
      // Cleanup UIUpdateService listeners
      unsubscribers.forEach(unsubscribe => unsubscribe());
      
      // Cleanup legacy DOM event listeners
      document.removeEventListener('themeChanged', handleThemeChange as EventListener);
      document.removeEventListener('localeChanged', handleLocaleChange as EventListener);
      document.removeEventListener('warehouseCreated', handleWarehouseUpdate as EventListener);
      document.removeEventListener('warehouseUpdated', handleWarehouseUpdate as EventListener);
      
      debugService.info('InventoryApp: Cleanup completed');
    };
  }, []);

  const loadWarehouses = () => {
    const warehousesData = localStorageService.getWarehouses();
    
    // Filter warehouses based on user role and privacy settings
    const filteredWarehouses = warehousesData.filter(warehouse => {
      // Master and admin can see all warehouses they have access to
      if (rolesPermissionService.getCurrentUserRole(warehouse.id) !== 'guest') {
        return true;
      }
      
      // Guests can only see public warehouses
      return warehouse.accessControl?.accessLevel === 'public' || warehouse.networkVisible;
    });
    
    setWarehouses(filteredWarehouses);
    debugService.info('Warehouses loaded with privacy filtering', { 
      total: warehousesData.length, 
      visible: filteredWarehouses.length,
      userRole: rolesPermissionService.getCurrentUserRole()
    });
  };

  const loadRooms = (warehouseId: string) => {
    const roomsData = localStorageService.getRooms(warehouseId);
    
    // Filter rooms based on user role and privacy
    const filteredRooms = roomsData.filter(room => {
      if (rolesPermissionService.getCurrentUserRole(warehouseId) !== 'guest') {
        return true;
      }
      // Guests only see public rooms (when room has isPublic field)
      return (room as any).isPublic !== false; // Allow rooms without isPublic field for backward compatibility
    });
    
    setRooms(filteredRooms);
  };

  const loadShelves = (warehouseId: string, roomId: string) => {
    const shelvesData = localStorageService.getShelves(warehouseId, roomId);
    
    // Filter shelves based on user role and privacy
    const filteredShelves = shelvesData.filter(shelf => {
      if (rolesPermissionService.getCurrentUserRole(warehouseId) !== 'guest') {
        return true;
      }
      // Guests only see public shelves
      return (shelf as any).isPublic !== false;
    });
    
    setShelves(filteredShelves);
  };

  const loadShelfItems = (warehouseId: string, roomId: string, shelfId: string) => {
    const itemsData = localStorageService.getItems(warehouseId, roomId, shelfId);
    
    // Filter items based on user role and privacy
    const filteredItems = itemsData.filter(item => {
      if (rolesPermissionService.getCurrentUserRole(warehouseId) !== 'guest') {
        return true;
      }
      // Guests only see public items
      return (item as any).isPublic !== false;
    });
    
    setShelfItems(filteredItems);
  };

  const loadBucketItems = () => {
    const bucketData = localStorageService.getBucketItems();
    setBucketItems(bucketData);
  };

  // Update selected items when selections change
  useEffect(() => {
    if (selectedWarehouseId) {
      loadRooms(selectedWarehouseId);
      const wh = warehouses.find(w => w.id === selectedWarehouseId);
      setSelectedWarehouseName(wh ? wh.name : null);
    } else {
      setRooms([]);
      setSelectedWarehouseName(null);
    }
  }, [selectedWarehouseId, warehouses]);

  useEffect(() => {
    if (selectedWarehouseId && selectedRoomId) {
      loadShelves(selectedWarehouseId, selectedRoomId);
      const r = rooms.find(rm => rm.id === selectedRoomId);
      setSelectedRoomName(r ? r.name : null);
    } else {
      setShelves([]);
      setSelectedRoomName(null);
    }
  }, [selectedWarehouseId, selectedRoomId, rooms]);

  useEffect(() => {
    if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
      loadShelfItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      const sh = shelves.find(s => s.id === selectedShelfId);
      setSelectedShelfName(sh ? sh.name : null);
    } else {
      setShelfItems([]);
      setSelectedShelfName(null);
    }
  }, [selectedWarehouseId, selectedRoomId, selectedShelfId, shelves]);

  useEffect(() => { setSelectedRoomId(null); setSelectedShelfId(null);}, [selectedWarehouseId]);
  useEffect(() => { setSelectedShelfId(null);}, [selectedRoomId]);

  const handleConfirm = (action: () => Promise<void>, message: string) => {
    setConfirmAction(() => async () => { await action(); });
    setConfirmMessage(message);
    setShowConfirmModal(true);
  };

  const executeConfirmedAction = async () => {
    if (confirmAction) {
      try {
        await confirmAction();
        loadWarehouses(); // Refresh data
        loadBucketItems();
      } catch (e) {
        showNotification(`Action failed: ${(e as Error).message}`, 'error');
      }
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const createEntity = (type: 'warehouse' | 'room' | 'shelf') => {
    debugService.action(`Creating ${type}`, { selectedWarehouseId, selectedRoomId, selectedShelfId });
    
    let title = '', label = '', parentContext = '';
    
    if (type === 'warehouse') {
      title = 'CREATE NEW WAREHOUSE';
      label = 'Warehouse Name:';
    } else if (type === 'room' && selectedWarehouseId) {
      title = 'CREATE NEW ROOM';
      label = 'Room Name:';
      parentContext = `in ${selectedWarehouseName || 'Selected Warehouse'}`;
    } else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) {
      title = 'CREATE NEW CONTAINER';
      label = 'Container Name:';
      parentContext = `in ${selectedRoomName || 'Selected Room'}`;
    } else {
      debugService.error(`Cannot create ${type}: missing parent selection`, { selectedWarehouseId, selectedRoomId });
      showNotification("Please select the parent location first.", "error");
      return;
    }

    setCreateEntityConfig({ type, title, label, parentContext });
    setShowCreateEntity(true);
  };

  const handleCreateEntitySubmit = async (name: string, isPublic: boolean) => {
    const { type } = createEntityConfig;
    
    try {
      debugService.action(`Attempting to create ${type} with name: ${name}, public: ${isPublic}`);
      
      const userProfile = deviceIdentityService.getUserProfile();
      const deviceIdentity = deviceIdentityService.getDeviceIdentity();
      const createdBy = userProfile?.nickname || 'Anonymous';
      const ownerId = deviceIdentity.deviceId;
      
      let entityId = '';
      
      if (type === 'warehouse') {
        // TODO: Update localStorageService.addWarehouse to support new fields
        entityId = localStorageService.addWarehouse(name);
        debugService.info(`Warehouse "${name}" created successfully`);
        
        // Add to sync batch
        syncBatchService.addChange(
          'warehouse.create',
          'warehouse',
          entityId,
          { name, isPublic, ownerId, createdBy }
        );
      } else if (type === 'room' && selectedWarehouseId) {
        // TODO: Update localStorageService.addRoom to support new fields  
        entityId = localStorageService.addRoom(selectedWarehouseId, name);
        debugService.info(`Room "${name}" created successfully in warehouse ${selectedWarehouseId}`);
        
        // Add to sync batch
        syncBatchService.addChange(
          'room.create',
          'room',
          entityId,
          { name, isPublic, ownerId, createdBy, warehouseId: selectedWarehouseId },
          selectedWarehouseId
        );
      } else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) {
        // TODO: Update localStorageService.addShelf to support new fields
        entityId = localStorageService.addShelf(selectedWarehouseId, selectedRoomId, name);
        debugService.info(`Container "${name}" created successfully in room ${selectedRoomId}`);
        
        // Add to sync batch
        syncBatchService.addChange(
          'container.create',
          'container',
          entityId,
          { name, isPublic, ownerId, createdBy, warehouseId: selectedWarehouseId, roomId: selectedRoomId },
          selectedWarehouseId
        );
      }
      
      showNotification(`${type} "${name}" created as ${isPublic ? 'public' : 'private'}!`);
      setShowCreateEntity(false);
      loadWarehouses();
      if (selectedWarehouseId) loadRooms(selectedWarehouseId);
      if (selectedWarehouseId && selectedRoomId) loadShelves(selectedWarehouseId, selectedRoomId);
    } catch (e) {
      debugService.error(`Error creating ${type}`, { error: (e as Error).message, name, selectedWarehouseId, selectedRoomId });
      throw new Error(`Failed to create ${type}: ${(e as Error).message}`);
    }
  };

  const renameEntity = (type: 'warehouse' | 'room' | 'shelf', entity: Warehouse | Room | Shelf) => {
    setInputModalConfig({
      title: `RENAME ${type.toUpperCase()}`,
      label: 'New Name:',
      initialValue: entity.name,
      onSubmit: async (name) => {
        try {
          if (type === 'warehouse') {
            localStorageService.updateWarehouseName(entity.id, name);
          } else if (type === 'room' && selectedWarehouseId) {
            localStorageService.updateRoomName(selectedWarehouseId, entity.id, name);
          } else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) {
            localStorageService.updateShelfName(selectedWarehouseId, selectedRoomId, entity.id, name);
          }
          
          showNotification(`${type} renamed to "${name}"!`);
          setShowInputModal(false);
          loadWarehouses();
          if (selectedWarehouseId) loadRooms(selectedWarehouseId);
          if (selectedWarehouseId && selectedRoomId) loadShelves(selectedWarehouseId, selectedRoomId);
        } catch (e) {
          showNotification(`Error renaming ${type}: ${(e as Error).message}`, 'error');
        }
      }
    });
    setShowInputModal(true);
  };

  const deleteEntity = (type: 'warehouse' | 'room' | 'shelf', entity: Warehouse | Room | Shelf) => {
    handleConfirm(async () => {
      if (type === 'warehouse') {
        localStorageService.deleteWarehouse(entity.id);
        if (selectedWarehouseId === entity.id) setSelectedWarehouseId(null);
      } else if (type === 'room' && selectedWarehouseId) {
        localStorageService.deleteRoom(selectedWarehouseId, entity.id);
        if (selectedRoomId === entity.id) setSelectedRoomId(null);
      } else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) {
        localStorageService.deleteShelf(selectedWarehouseId, selectedRoomId, entity.id);
        if (selectedShelfId === entity.id) setSelectedShelfId(null);
      }
      
      showNotification(`${type} "${entity.name}" and all its contents deleted.`);
      loadWarehouses();
      if (selectedWarehouseId) loadRooms(selectedWarehouseId);
      if (selectedWarehouseId && selectedRoomId) loadShelves(selectedWarehouseId, selectedRoomId);
    }, `Delete ${type} "${entity.name}" and ALL its contents? This cannot be undone.`);
  };

  const handleMoveContainer = async (container: Shelf, newRoomId: string) => {
    if (!selectedWarehouseId || !selectedRoomId) return;
    try {
      localStorageService.moveShelf(selectedWarehouseId, selectedRoomId, container.id, newRoomId);
      showNotification(`Container "${container.name}" moved successfully.`);
      setContainerToMove(null);
      if (selectedShelfId === container.id) setSelectedShelfId(null);
      loadRooms(selectedWarehouseId);
      loadShelves(selectedWarehouseId, selectedRoomId);
    } catch (error) {
      showNotification("Failed to move container.", 'error');
    }
  };

  const handleOpenAddItemModal = () => {
    if (!showBucketView && (!selectedWarehouseId || !selectedRoomId || !selectedShelfId)) {
      showNotification("Please select a container first.", "error");
      return;
    }
    setEditingItem(null);
    setShowAddItemModal(true);
  };
  
  const handleOpenEditItemModal = (item: Item | BucketItem) => {
    setEditingItem(item);
    setShowAddItemModal(true);
  };

  const handleItemFormSubmit = async (itemDataFromModal: Partial<ItemCore>, editId: string | null) => {
    try {
      const isEditing = !!(editId && editingItem);
      const itemNameForNotification = itemDataFromModal.name || (isEditing ? editingItem!.name : 'Unknown Item');

      if (isEditing) {
        const updateData: Partial<ItemCore> = {};
        if (itemDataFromModal.name !== undefined) updateData.name = itemDataFromModal.name;
        if (itemDataFromModal.quantity !== undefined) updateData.quantity = itemDataFromModal.quantity;
        if (itemDataFromModal.unit !== undefined) updateData.unit = itemDataFromModal.unit;
        if (itemDataFromModal.priority !== undefined) updateData.priority = itemDataFromModal.priority;
        updateData.category = itemDataFromModal.category || "";
        updateData.price = itemDataFromModal.price;
        updateData.purchaseDate = itemDataFromModal.purchaseDate || "";
        updateData.expiryDate = itemDataFromModal.expiryDate || "";
        updateData.description = itemDataFromModal.description || "";
        updateData.labels = itemDataFromModal.labels || [];

        if ('originalPath' in editingItem!) {
          localStorageService.updateBucketItem(editId!, updateData);
        } else {
          if (!selectedWarehouseId || !selectedRoomId || !selectedShelfId) throw new Error("Current location is not set for editing a storage item.");
          localStorageService.updateItem(selectedWarehouseId, selectedRoomId, selectedShelfId, editId!, updateData);
        }
        showNotification(`Item "${itemNameForNotification}" updated!`);
      } else {
        const itemDataForAdd: ItemCore = {
          name: itemDataFromModal.name || 'Unnamed Item',
          quantity: itemDataFromModal.quantity === undefined ? 1 : itemDataFromModal.quantity,
          priority: itemDataFromModal.priority || 'Normal',
          unit: itemDataFromModal.unit || 'pcs',
          ...(itemDataFromModal.category && { category: itemDataFromModal.category }),
          ...(itemDataFromModal.price !== undefined && { price: itemDataFromModal.price }),
          ...(itemDataFromModal.purchaseDate && { purchaseDate: itemDataFromModal.purchaseDate }),
          ...(itemDataFromModal.expiryDate && { expiryDate: itemDataFromModal.expiryDate }),
          ...(itemDataFromModal.description && { description: itemDataFromModal.description }),
          ...(itemDataFromModal.labels && itemDataFromModal.labels.length > 0 && { labels: itemDataFromModal.labels }),
        };

        if (showBucketView) {
          const bucketItem = localStorageService.addItemToBucket(itemDataForAdd as Item, '');
          setBucketItems(prev => [...prev, bucketItem]);
        } else {
          if (!selectedWarehouseId || !selectedRoomId || !selectedShelfId) throw new Error("Location context is missing for adding a new item.");
          localStorageService.addItem(selectedWarehouseId, selectedRoomId, selectedShelfId, itemDataForAdd);
        }
        showNotification(`Item "${itemDataForAdd.name}" added!`);
      }
      
      setShowAddItemModal(false);
      setEditingItem(null);
      
      // Refresh data
      if (showBucketView) {
        loadBucketItems();
      } else if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
        loadShelfItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      }
    } catch (error) {
      showNotification(`Failed to save item: ${(error as Error).message}`, 'error');
    }
  };
  
  const handleTakeItem = (item: Item | BucketItem) => {
    handleConfirm(async () => {
      if (showBucketView) {
        // From bucket - move to personal hands (simulate taking)
        localStorageService.removeBucketItem(item.id);
        loadBucketItems();
        showNotification(`Took "${item.name}" from bucket. Item is now in your hands.`);
      } else if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
        // From storage - move to bucket first, then to hands
        const originalPath = `${selectedWarehouseName} > ${selectedRoomName} > ${selectedShelfName}`;
        localStorageService.addItemToBucket(item as Item, originalPath);
        localStorageService.deleteItem(selectedWarehouseId, selectedRoomId, selectedShelfId, item.id);
        loadShelfItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
        loadBucketItems();
        showNotification(`Took "${item.name}" from storage. Item moved to your bucket.`);
      } else {
        throw new Error("No context to take item from.");
      }
      
      debugService.action('Item taken by user', {
        itemName: item.name,
        fromLocation: showBucketView ? 'bucket' : 'storage',
        takenBy: deviceIdentityService.getUserProfile()?.nickname || 'Anonymous'
      });
    }, `Take "${item.name}" ${showBucketView ? 'from bucket' : 'from storage'}? ${showBucketView ? 'This will remove it from your bucket.' : 'This will move it to your bucket.'}`);
  };

  const handleDisposeToTrash = (item: Item | BucketItem, reason?: string) => {
    handleConfirm(async () => {
      let originalLocation = '';
      
      if (showBucketView) {
        originalLocation = (item as BucketItem).originalPath || 'Bucket';
        localStorageService.removeBucketItem(item.id);
        loadBucketItems();
      } else if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
        originalLocation = `${selectedWarehouseName} > ${selectedRoomName} > ${selectedShelfName}`;
        localStorageService.deleteItem(selectedWarehouseId, selectedRoomId, selectedShelfId, item.id);
        loadShelfItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      } else {
        throw new Error("No context to dispose item from.");
      }
      
      // Add to trash service
      trashService.disposeItem(item, originalLocation, reason);
      
      showNotification(`Item "${item.name}" disposed to trash.`);
      
      debugService.action('Item disposed to trash', {
        itemName: item.name,
        fromLocation: originalLocation,
        disposedBy: deviceIdentityService.getUserProfile()?.nickname || 'Anonymous'
      });
    }, `Dispose "${item.name}" to trash? You can restore it later or mark it as actually disposed.`);
  };

  // Keep the old delete function for permanent deletion (will be used later)
  const handleDeleteItem = (item: Item | BucketItem) => {
    handleConfirm(async () => {
      if (showBucketView) {
        localStorageService.removeBucketItem(item.id);
        loadBucketItems();
      } else if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
        localStorageService.deleteItem(selectedWarehouseId, selectedRoomId, selectedShelfId, item.id);
        loadShelfItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      } else {
        throw new Error("No context to delete item from.");
      }
      showNotification(`Item "${item.name}" deleted permanently.`);
    }, `Permanently delete "${item.name}"? This cannot be undone.`);
  };

  const handleUpdateQuantity = async (item: Item | BucketItem, amount: number) => {
    const newQuantity = Math.max(0, (item.quantity || 0) + amount);
    try {
      if (showBucketView && 'originalPath' in item) {
        localStorageService.updateBucketItem(item.id, { quantity: newQuantity });
        // Instant UI update
        setBucketItems(prev => prev.map(i => i.id === item.id ? {...i, quantity: newQuantity} : i));
      } else if (!showBucketView && selectedWarehouseId && selectedRoomId && selectedShelfId) {
        localStorageService.updateItemQuantity(selectedWarehouseId, selectedRoomId, selectedShelfId, item.id, newQuantity);
        // Instant UI update
        setShelfItems(prev => prev.map(i => i.id === item.id ? {...i, quantity: newQuantity} : i));
      } else {
        throw new Error("No context to update item quantity.");
      }
    } catch (error) {
      showNotification(`Failed to update quantity: ${(error as Error).message}`, 'error');
    }
  };

  const handleMoveToBucket = async (item: Item) => {
    if (!selectedWarehouseId || !selectedRoomId || !selectedShelfId) {
      showNotification("Cannot move item: current path unknown.", "error");
      return;
    }
    try {
      const originalPath = `${selectedWarehouseName} > ${selectedRoomName} > ${selectedShelfName}`;
      localStorageService.addItemToBucket(item, originalPath);
      localStorageService.deleteItem(selectedWarehouseId, selectedRoomId, selectedShelfId, item.id);
      showNotification(`Item "${item.name}" moved to bucket.`);
      loadShelfItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
      loadBucketItems();
    } catch (error) {
      showNotification(`Failed to move item to bucket: ${(error as Error).message}`, 'error');
    }
  };

  const handleEditBucketItemPath = (item: BucketItem) => {
    setItemToMoveFromBucket(item);
    setShowDestinationSelector(true);
  };
  
  const handleSelectDestinationForItem = (warehouse: Warehouse, room: Room, shelf: Shelf) => {
    if (!itemToMoveFromBucket) return;
    const destination = {
      warehouseId: warehouse.id, warehouseName: warehouse.name,
      roomId: room.id, roomName: room.name,
      shelfId: shelf.id, shelfName: shelf.name,
    };
    
    localStorageService.updateBucketItem(itemToMoveFromBucket.id, { destination });
    showNotification(`Destination for "${itemToMoveFromBucket.name}" updated.`);
    setItemToMoveFromBucket(null);
    setShowDestinationSelector(false);
    loadBucketItems();
  };

  const handleToggleTransfer = async (bucketItem: BucketItem) => {
    try {
      localStorageService.updateBucketItem(bucketItem.id, { isReadyToTransfer: !bucketItem.isReadyToTransfer });
      loadBucketItems();
    } catch (error) {
      showNotification(`Failed to update transfer status: ${(error as Error).message}`, 'error');
    }
  };

  const handleTransferMarkedItems = async () => {
    const itemsToTransfer = bucketItems.filter(item => item.isReadyToTransfer && item.destination);
    if (itemsToTransfer.length === 0) {
      showNotification("No items marked for transfer or destination not set.", "error");
      return;
    }
    handleConfirm(async () => {
      let successCount = 0;
      let errorCount = 0;
      
      showNotification(`Transferring ${itemsToTransfer.length} item(s)...`, "info");
      
      // Process items with small delays to prevent UI blocking
      for (let i = 0; i < itemsToTransfer.length; i++) {
        const item = itemsToTransfer[i];
        try {
          localStorageService.transferBucketItem(item);
          successCount++;
          
          // Add small delay every 5 items to keep UI responsive
          if (i % 5 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (err) {
          console.error('Transfer error:', err);
          errorCount++;
        }
      }
      
      // Refresh data after transfer
      await Promise.all([
        new Promise(resolve => { loadBucketItems(); resolve(undefined); }),
        new Promise(resolve => { loadWarehouses(); resolve(undefined); })
      ]);
      
      showNotification(
        `Transfer completed: ${successCount} item(s) transferred.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`,
        errorCount > 0 ? "warning" : "success"
      );
    }, `Transfer ${itemsToTransfer.length} item(s) to their destinations?`);
  };

  // Handle welcome screen completion
  const handleWelcomeComplete = () => {
    setShowWelcomeScreen(false);
    debugService.action('Welcome screen completed, user setup finished');
    
    // Refresh data after setup
    loadWarehouses();
    loadBucketItems();
    showNotification('Welcome to Inventory OS! You\'re all set up.', 'success');
  };

  // Handle data refresh when SMARTIE makes changes
  const handleDataChange = () => {
    loadWarehouses();
    loadBucketItems();
    // Refresh current view if applicable
    if (selectedWarehouseId) loadRooms(selectedWarehouseId);
    if (selectedWarehouseId && selectedRoomId) loadShelves(selectedWarehouseId, selectedRoomId);
    if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
      loadShelfItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
    }
  };
  
  // Apply filtering and sorting
  const getFilteredAndSortedItems = () => {
    const baseItems = showBucketView ? bucketItems : shelfItems;
    
    // Filter by search query and tags
    let filtered = baseItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTag = !tagFilter || 
        item.labels?.some(label => label.toLowerCase().includes(tagFilter.toLowerCase()));
      
      return matchesSearch && matchesTag;
    });
    
    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'priority':
          const priorityOrder = { 'High': 3, 'Normal': 2, 'Low': 1, 'Dispose': 0 };
          comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case 'expiryDate':
          const aDate = a.expiryDate ? new Date(a.expiryDate) : new Date('2099-12-31');
          const bDate = b.expiryDate ? new Date(b.expiryDate) : new Date('2099-12-31');
          comparison = aDate.getTime() - bDate.getTime();
          break;
        case 'createdAt':
          const aCreated = a.createdAt instanceof Date ? a.createdAt : 
                          a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const bCreated = b.createdAt instanceof Date ? b.createdAt : 
                          b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          comparison = bCreated.getTime() - aCreated.getTime(); // Newest first by default
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  };
  
  const itemsToDisplay = getFilteredAndSortedItems();
  const currentDisplayContext = showBucketView ? 'bucket' : 'storage';
  const displayTitle = showBucketView 
    ? localizationService.translate('nav.bucket') + " - " + localizationService.translate('ui.staging_area')
    : (selectedShelfName || (selectedRoomName ? `Room: ${selectedRoomName} (${localizationService.translate('ui.select_container')})` : (selectedWarehouseName ? `Warehouse: ${selectedWarehouseName} (${localizationService.translate('ui.select_room')})` : localizationService.translate('ui.select_warehouse'))));

  const DestinationSelectorModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onSelect: (warehouse: Warehouse, room: Room, shelf: Shelf) => void;
    warehouses: Warehouse[];
  }> = ({ show, onClose, onSelect, warehouses: allWarehouses }) => {
    const [selWh, setSelWh] = useState<Warehouse | null>(null);
    const [selR, setSelR] = useState<Room | null>(null);
    const [selSh, setSelSh] = useState<Shelf | null>(null);

    useEffect(() => {
      if (selWh) {
        setSelR(null);
        setSelSh(null);
      }
    }, [selWh]);

    useEffect(() => {
      if (selR) {
        setSelSh(null);
      }
    }, [selR]);

    if (!show) return null;
    return (
      <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
        <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-md border-2 ${ASCII_COLORS.border}`}>
          <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>Select Destination</h3>
          <div className="space-y-2">
            <select 
              value={selWh?.id || ""} 
              onChange={(e) => setSelWh(allWarehouses.find(w => w.id === e.target.value) || null)} 
              className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
            >
              <option value="">Select Warehouse</option>
              {allWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {selWh && (
              <select 
                value={selR?.id || ""} 
                onChange={(e) => setSelR(selWh.rooms?.find(r => r.id === e.target.value) || null)} 
                className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
              >
                <option value="">Select Room</option>
                {selWh.rooms?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            {selR && (
              <select 
                value={selSh?.id || ""} 
                onChange={(e) => setSelSh(selR.shelves?.find(s => s.id === e.target.value) || null)} 
                className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
              >
                <option value="">Select Container</option>
                {selR.shelves?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-3 rounded`}>Cancel</button>
            <button 
              onClick={() => selWh && selR && selSh && onSelect(selWh, selR, selSh)} 
              disabled={!selSh} 
              className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-3 rounded disabled:opacity-50`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${ASCII_COLORS.bg} ${ASCII_COLORS.text} min-h-screen font-mono p-4 sm:p-6 lg:p-8`}>
      <WelcomeScreen show={showWelcomeScreen} onComplete={handleWelcomeComplete} />
      <CreateEntityModal
        show={showCreateEntity}
        type={createEntityConfig.type}
        title={createEntityConfig.title}
        label={createEntityConfig.label}
        parentContext={createEntityConfig.parentContext}
        onSubmit={handleCreateEntitySubmit}
        onCancel={() => setShowCreateEntity(false)}
      />
      <InfoModal show={showInfoModal} onCancel={() => setShowInfoModal(false)} />
      <InputModal 
        show={showInputModal} 
        title={inputModalConfig.title} 
        label={inputModalConfig.label} 
        initialValue={inputModalConfig.initialValue} 
        onSubmit={inputModalConfig.onSubmit} 
        onCancel={() => setShowInputModal(false)} 
      />
      <ConfirmModal 
        show={showConfirmModal} 
        message={confirmMessage} 
        onConfirm={executeConfirmedAction} 
        onCancel={() => setShowConfirmModal(false)} 
      />
      <AddItemModal 
        show={showAddItemModal} 
        onClose={() => { setShowAddItemModal(false); setEditingItem(null); }} 
        onSubmit={handleItemFormSubmit} 
        initialData={editingItem} 
        editingItemId={editingItem?.id} 
        currency={currentCurrency} 
      />
      <ChatModal 
        show={showChat} 
        onClose={() => setShowChat(false)} 
        onDataChange={handleDataChange}
      />
      <TrashModal 
        show={showTrash} 
        onClose={() => setShowTrash(false)} 
      />
      <UserManagementModal 
        show={showUserManagement} 
        onClose={() => setShowUserManagement(false)}
        warehouseId={selectedWarehouseId || undefined}
        warehouseName={selectedWarehouseName || undefined}
      />
      <DestinationSelectorModal 
        show={showDestinationSelector} 
        onClose={() => { setShowDestinationSelector(false); setItemToMoveFromBucket(null);}} 
        onSelect={handleSelectDestinationForItem}
        warehouses={warehouses}
      />

      {(successMessage || errorMessage) && (
        <div className={`fixed top-5 right-5 p-3 rounded-md shadow-lg z-[200] text-sm ${successMessage ? 'feedback-success animate-bounce-in' : 'feedback-error animate-shake'} ${successMessage ? ASCII_COLORS.success : ASCII_COLORS.error} border ${successMessage ? 'border-green-600' : 'border-red-600'}`}>
          {successMessage || errorMessage}
        </div>
      )}

      <header className="mb-6 border-b-2 pb-4 border-dashed border-yellow-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-4">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-shrink">
            <h1 className={`${ASCII_COLORS.accent} text-sm sm:text-xl lg:text-3xl font-bold truncate`}>
              📦 INVENTORY OS v2.6
            </h1>
            <SimpleNetworkStatus onClick={() => setShowSimpleNetworkPanel(true)} />
          </div>
          
          {/* SIMPLIFIED Header - Only Essential Actions */}
          <div className="flex items-center justify-between lg:justify-end gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
            {/* Essential User Actions */}
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
              <UserSwitcher onUserChange={() => {
                loadWarehouses();
                loadBucketItems();
                themeService.onUserChanged();
              }} />
              
              {/* Storage/Bucket Toggle */}
              <button 
                onClick={() => {
                  const newBucketView = !showBucketView;
                  setShowBucketView(newBucketView);
                  
                  // Show feedback
                  showActionFeedback(
                    newBucketView ? 
                      `Switched to Bucket view 🛒 ${bucketItems.length} items waiting` : 
                      'Switched to Storage view 🏠 Browse your inventory',
                    'success',
                    2500
                  );
                  
                  setTimeout(() => {
                    if (newBucketView) {
                      loadBucketItems();
                    } else if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
                      loadItems(selectedWarehouseId, selectedRoomId, selectedShelfId);
                    }
                  }, 0);
                }} 
                className={`${ASCII_COLORS.buttonBg} p-2 sm:p-3 rounded-lg ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} relative font-semibold transition-all`} 
                title={showBucketView ? "Switch to Storage View" : "Switch to Bucket View"}
              >
                <div className="flex items-center gap-2">
                  {showBucketView ? (
                    <>
                      <Archive size={16} className="sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Storage</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} className="sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Bucket</span>
                    </>
                  )}
                </div>
                {bucketItems.length > 0 && !showBucketView && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                    {bucketItems.length}
                  </span>
                )}
              </button>

              {/* Trash - Important for lifecycle management */}
              <button 
                onClick={() => setShowTrash(true)} 
                className={`${ASCII_COLORS.buttonBg} p-2 sm:p-3 rounded-lg ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} transition-all`} 
                title="Trash & Disposal Management"
              >
                <Trash2 size={16} className="sm:w-5 sm:h-5 text-red-400"/>
              </button>

              {/* AI Assistant - Key feature */}
              <button 
                onClick={() => setShowChat(true)} 
                className={`${ASCII_COLORS.buttonBg} p-2 sm:p-3 rounded-lg ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} transition-all`} 
                title="AI Assistant SMARTIE"
              >
                <BrainCircuit size={16} className="sm:w-5 sm:h-5 text-purple-400"/>
              </button>
            </div>

            {/* Quick Access */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Language & Currency */}
              <LanguageSwitcher />
              <CurrencySelector 
                currentCurrency={currentCurrency}
                onCurrencyChange={handleCurrencyChange}
              />
              
              {/* Everything else goes into Settings */}
              <SettingsMenu
                onShowNetworkManager={() => setShowSimpleNetworkPanel(true)}
                onShowQRConnection={() => setShowQRConnection(true)}
                onShowQRSync={() => setShowQRSync(true)}
                onShowVisual={() => setShowVisual(true)}
                onShowSocialChat={() => setShowSocialChat(true)}
                onShowUserManagement={() => setShowUserManagement(true)}
                onShowImportExport={() => setShowImportExport(true)}
                onShowDebug={() => setShowDebug(true)}
                onShowSelfTest={() => setShowSelfTest(true)}
                onShowP2PTest={() => setShowP2PTest(true)}
                onShowInfo={() => setShowInfoModal(true)}
                selectedWarehouseId={selectedWarehouseId}
                selectedWarehouseName={selectedWarehouseName}
              />
            </div>
          </div>
        </div>
      </header>
      
      <main>
        {/* Navigation Breadcrumbs */}
        <NavigationBreadcrumbs
          showBucketView={showBucketView}
          selectedWarehouseName={selectedWarehouseName}
          selectedRoomName={selectedRoomName}
          selectedShelfName={selectedShelfName}
          onNavigateToWarehouse={() => {
            setSelectedRoomId(null);
            setSelectedShelfId(null);
            showActionFeedback('Navigated to warehouse level', 'tip', 2000);
          }}
          onNavigateToRoom={() => {
            setSelectedShelfId(null);
            showActionFeedback('Navigated to room level', 'tip', 2000);
          }}
        />

        <ImportExportModal 
          show={showImportExport} 
          onClose={() => setShowImportExport(false)} 
          onDataChange={handleDataChange}
        />
        <VisualView show={showVisual} onClose={() => setShowVisual(false)} />
        <DebugModal show={showDebug} onClose={() => setShowDebug(false)} />
        <QRSyncModal show={showQRSync} onClose={() => setShowQRSync(false)} />
        <NetworkManager show={showNetworkManager} onClose={() => setShowNetworkManager(false)} />
        <SimpleQRModal 
          show={showQRConnection} 
          onClose={() => setShowQRConnection(false)}
          onDeviceConnected={(deviceInfo) => {
            showNotification(`Подключено к устройству: ${deviceInfo.name} (${deviceInfo.ip})`, 'success');
          }}
        />
        {selectedWarehouseId && selectedWarehouseName && (
          <SocialChat 
            warehouseId={selectedWarehouseId} 
            warehouseName={selectedWarehouseName}
            show={showSocialChat} 
            onClose={() => setShowSocialChat(false)} 
          />
        )}
        <SelfTestModal show={showSelfTest} onClose={() => setShowSelfTest(false)} />
        <SimpleNetworkPanel show={showSimpleNetworkPanel} onClose={() => setShowSimpleNetworkPanel(false)} />
        
        {/* P2P Test Runner Modal */}
        {showP2PTest && (
          <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-95 flex items-center justify-center z-50 p-4`}>
            <div className="w-full max-w-6xl">
              <P2PTestRunner />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowP2PTest(false)}
                  className={`${ASCII_COLORS.buttonBg} px-6 py-2 rounded border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {containerToMove ? (
          <div className={`${ASCII_COLORS.inputBg} p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
            <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent}`}>Move Container: {containerToMove.name}</h2>
            <p>Select the new destination room (must be in the same warehouse: {selectedWarehouseName}):</p>
            <ul className="h-48 overflow-y-auto border border-yellow-700 p-2 rounded-md my-4 bg-black">
              {rooms.filter(r => r.id !== selectedRoomId).map(r => (
                <li 
                  key={r.id} 
                  onClick={() => handleMoveContainer(containerToMove, r.id)} 
                  className="p-2 rounded cursor-pointer hover:bg-gray-700"
                >
                  {r.name}
                </li>
              ))}
              {rooms.filter(r => r.id !== selectedRoomId).length === 0 && (
                <li className="p-2 text-gray-500">No other rooms available in this warehouse.</li>
              )}
            </ul>
            <button 
              onClick={() => setContainerToMove(null)} 
              className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} py-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
            >
              [CANCEL MOVE]
            </button>
          </div>
        ) : (
        <>
        {!showBucketView && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">{localizationService.translate('nav.warehouses')}</h2>
                {rolesPermissionService.hasPermission('warehouse.create') && (
                  <button 
                    onClick={() => createEntity('warehouse')} 
                    className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
                  >
                    <Plus/>
                  </button>
                )}
              </div>
              <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px] max-h-[300px] overflow-y-auto`}>
                <ul className="space-y-1">
                  {warehouses.map(w => (
                    <li 
                      key={w.id} 
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedWarehouseId === w.id ? 'bg-yellow-600 text-black font-bold' : 'hover:bg-gray-700'}`} 
                      onClick={() => {
                        setSelectedWarehouseId(w.id);
                        // Force immediate UI refresh for navigation
                        setTimeout(() => {
                          if (selectedWarehouseId !== w.id) {
                            loadRooms(w.id);
                          }
                        }, 0);
                      }}
                    >
                      <span className="flex items-center truncate">
                        <Home className="w-4 h-4 mr-2 shrink-0"/>{w.name}
                      </span>
                      <span className="flex items-center">
                        {rolesPermissionService.hasPermission('warehouse.edit', selectedWarehouseId || undefined) && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); renameEntity('warehouse', w); }} 
                            className="p-1 hover:text-yellow-400"
                          >
                            <Edit size={16}/>
                          </button>
                        )}
                        {rolesPermissionService.hasPermission('warehouse.edit', selectedWarehouseId || undefined) && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteEntity('warehouse', w); }} 
                            className="p-1 hover:text-red-500"
                          >
                            <Trash2 size={16}/>
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h2 className={`text-xl font-bold ${!selectedWarehouseId ? 'opacity-50' : ''}`}>{localizationService.translate('nav.rooms')}</h2>
                {rolesPermissionService.hasPermission('room.create', selectedWarehouseId || undefined) && (
                  <button 
                    onClick={() => createEntity('room')} 
                    disabled={!selectedWarehouseId} 
                    className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}
                  >
                    <Plus/>
                  </button>
                )}
              </div>
              <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px] max-h-[300px] overflow-y-auto`}>
                <ul className="space-y-1">
                  {rooms.map(r => (
                    <li 
                      key={r.id} 
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedRoomId === r.id ? 'bg-yellow-600 text-black font-bold' : 'hover:bg-gray-700'}`} 
                      onClick={() => {
                        setSelectedRoomId(r.id);
                        // Force immediate UI refresh for navigation
                        setTimeout(() => {
                          if (selectedWarehouseId && selectedRoomId !== r.id) {
                            loadShelves(selectedWarehouseId, r.id);
                          }
                        }, 0);
                      }}
                    >
                      <span className="flex items-center truncate">
                        <Box className="w-4 h-4 mr-2 shrink-0"/>{r.name}
                      </span>
                      <span className="flex items-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); renameEntity('room', r); }} 
                          className="p-1 hover:text-yellow-400"
                        >
                          <Edit size={16}/>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteEntity('room', r); }} 
                          className="p-1 hover:text-red-500"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h2 className={`text-xl font-bold ${!selectedRoomId ? 'opacity-50' : ''}`}>{localizationService.translate('nav.containers')}</h2>
                {rolesPermissionService.hasPermission('container.create', selectedWarehouseId || undefined) && (
                  <button 
                    onClick={() => createEntity('shelf')} 
                    disabled={!selectedRoomId} 
                    className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}
                  >
                    <Plus/>
                  </button>
                )}
              </div>
              <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px] max-h-[300px] overflow-y-auto`}>
                <ul className="space-y-1">
                  {shelves.map(s => (
                    <li 
                      key={s.id} 
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedShelfId === s.id ? 'bg-yellow-600 text-black font-bold' : 'hover:bg-gray-700'}`} 
                      onClick={() => {
                        setSelectedShelfId(s.id);
                        // Force immediate UI refresh for navigation
                        setTimeout(() => {
                          if (selectedWarehouseId && selectedRoomId && selectedShelfId !== s.id) {
                            loadItems(selectedWarehouseId, selectedRoomId, s.id);
                          }
                        }, 0);
                      }}
                    >
                      <span className="flex items-center truncate">
                        <List className="w-4 h-4 mr-2 shrink-0"/>{s.name}
                      </span>
                      <span className="flex items-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setContainerToMove(s); }} 
                          className="p-1 hover:text-blue-400" 
                          title="Move Container"
                        >
                          <MoveUpRight size={16}/>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); renameEntity('shelf', s); }} 
                          className="p-1 hover:text-yellow-400"
                        >
                          <Edit size={16}/>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteEntity('shelf', s); }} 
                          className="p-1 hover:text-red-500"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <div className={`${ASCII_COLORS.inputBg} p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
          <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
            <h2 className={`text-xl font-bold ${ASCII_COLORS.accent}`}>{displayTitle}</h2>
            <div className="flex items-center gap-2">
              {showBucketView && bucketItems.filter(i=>i.isReadyToTransfer && i.destination).length > 0 && (
                <button 
                  onClick={handleTransferMarkedItems} 
                  className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border border-green-500 text-green-400 flex items-center`}
                >
                  <Archive className="w-4 h-4 mr-2"/>TRANSFER ({bucketItems.filter(i=>i.isReadyToTransfer && i.destination).length})
                </button>
              )}
              {rolesPermissionService.hasPermission('item.create', selectedWarehouseId || undefined) && (
                <button 
                  onClick={handleOpenAddItemModal} 
                  disabled={!showBucketView && (!selectedWarehouseId || !selectedRoomId || !selectedShelfId)} 
                  className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center`}
                >
                  <Plus className="w-4 h-4 mr-1"/>ADD ITEM {showBucketView ? "TO BUCKET" : ""}
                </button>
              )}
            </div>
          </div>
          
          {/* Filtering and Sorting Controls */}
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-black/40 rounded-lg border border-gray-700">
            <div className="flex flex-col flex-1 min-w-[200px]">
              <label className="text-sm text-gray-400 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, description, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} p-2 rounded border ${ASCII_COLORS.border} text-sm`}
              />
            </div>
            
            <div className="flex flex-col min-w-[150px]">
              <label className="text-sm text-gray-400 mb-1">Filter by Tag</label>
              <input
                type="text"
                placeholder="Tag filter..."
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className={`${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} p-2 rounded border ${ASCII_COLORS.border} text-sm`}
              />
            </div>
            
            <div className="flex flex-col min-w-[120px]">
              <label className="text-sm text-gray-400 mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} p-2 rounded border ${ASCII_COLORS.border} text-sm`}
              >
                <option value="name">Name</option>
                <option value="quantity">Quantity</option>
                <option value="priority">Priority</option>
                <option value="expiryDate">Expiry</option>
                <option value="createdAt">Created</option>
              </select>
            </div>
            
            <div className="flex flex-col min-w-[100px]">
              <label className="text-sm text-gray-400 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className={`${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} p-2 rounded border ${ASCII_COLORS.border} text-sm`}
              >
                <option value="asc">↑ Asc</option>
                <option value="desc">↓ Desc</option>
              </select>
            </div>
            
            <div className="flex flex-col justify-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTagFilter('');
                  setSortBy('name');
                  setSortOrder('asc');
                }}
                className={`${ASCII_COLORS.buttonBg} p-2 px-3 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-sm`}
              >
                Clear
              </button>
            </div>
          </div>
          
          {itemsToDisplay.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {itemsToDisplay.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  context={currentDisplayContext} 
                  currency={item.currency || currentCurrency} 
                  onMoveClick={showBucketView ? (itm) => handleEditBucketItemPath(itm as BucketItem) : (itm) => handleMoveToBucket(itm as Item)}
                  onEditClick={handleOpenEditItemModal} 
                  onDeleteClick={handleTakeItem} 
                  onUpdateQuantity={handleUpdateQuantity}
                  onToggleTransfer={showBucketView ? handleToggleTransfer : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-center py-8 opacity-70">
              {(showBucketView || (selectedWarehouseId && selectedRoomId && selectedShelfId) || (selectedWarehouseId && !selectedRoomId) || (selectedRoomId && !selectedShelfId)) 
                ? 'No items here. Add one or select a sub-location!' 
                : 'Select a Warehouse to begin.'
              }
            </p>
          )}
        </div>
        </>
        )}
      </main>
      
      {/* Footer with Claude attribution */}
      <footer className={`mt-8 py-4 border-t ${ASCII_COLORS.border} text-center`}>
        <p className={`text-sm ${ASCII_COLORS.text} opacity-60`}>
          Made with <span className={`${ASCII_COLORS.accent}`}>Claude</span>, with love ❤️
        </p>
      </footer>

      {/* Action Feedback */}
      <ActionFeedback
        type={actionFeedback.type}
        message={actionFeedback.message}
        show={actionFeedback.show}
      />
    </div>
  );
}

export default InventoryApp;