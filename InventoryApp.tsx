import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Home, Box, List, Info, ShoppingCart, MoveUpRight, Archive, UserCircle, BrainCircuit, Image as ImageIcon, Download, Bug, TestTube } from 'lucide-react';

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
import SelfTestModal from './components/SelfTestModal';
import localizationService from './services/localizationService';
import debugService from './services/debugService';
import userService from './services/userService';
import themeService from './services/themeService';

const InventoryApp: React.FC = () => {
  const [currentCurrency, setCurrentCurrency] = useState<string>(
    localStorage.getItem('inventory-os-currency') || localizationService.getAvailableCurrencies()[0] || 'USD'
  );
  
  const userProfile: UserProfile = {
    username: localizationService.getCurrentLocale() === 'uk' ? 'Користувач' : 
              localizationService.getCurrentLocale() === 'en' ? 'User' : 
              localizationService.getCurrentLocale() === 'de' ? 'Benutzer' :
              localizationService.getCurrentLocale() === 'pl' ? 'Użytkownik' : 'Пользователь',
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

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') setSuccessMessage(message);
    else setErrorMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 4000);
  }, []);

  // Initialize and load data
  useEffect(() => {
    debugService.info('Initializing Inventory OS');
    localStorageService.initializeLocalStorage();
    loadWarehouses();
    loadBucketItems();
    // Initialize theme service
    themeService.onUserChanged();
    
    // Listen for theme changes
    const handleThemeChange = (event: CustomEvent) => {
      debugService.info('Theme changed, forcing re-render', event.detail);
      // Force component re-render by updating a dummy state
      setCurrentCurrency(curr => curr);
    };
    
    // Listen for locale changes
    const handleLocaleChange = (event: CustomEvent) => {
      debugService.info('Locale changed, updating interface', event.detail);
      // Force component re-render to update all text
      setCurrentCurrency(curr => curr);
    };
    
    document.addEventListener('themeChanged', handleThemeChange as EventListener);
    document.addEventListener('localeChanged', handleLocaleChange as EventListener);
    
    debugService.action('App initialized successfully');
    
    return () => {
      document.removeEventListener('themeChanged', handleThemeChange as EventListener);
      document.removeEventListener('localeChanged', handleLocaleChange as EventListener);
    };
  }, []);

  const loadWarehouses = () => {
    const warehousesData = localStorageService.getWarehouses();
    setWarehouses(warehousesData);
  };

  const loadRooms = (warehouseId: string) => {
    const roomsData = localStorageService.getRooms(warehouseId);
    setRooms(roomsData);
  };

  const loadShelves = (warehouseId: string, roomId: string) => {
    const shelvesData = localStorageService.getShelves(warehouseId, roomId);
    setShelves(shelvesData);
  };

  const loadShelfItems = (warehouseId: string, roomId: string, shelfId: string) => {
    const itemsData = localStorageService.getItems(warehouseId, roomId, shelfId);
    setShelfItems(itemsData);
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
    
    let title = '', label = '';
    
    if (type === 'warehouse') {
      title = 'CREATE NEW WAREHOUSE';
      label = 'Warehouse Name:';
    } else if (type === 'room' && selectedWarehouseId) {
      title = `CREATE NEW ROOM (in ${selectedWarehouseName || 'Selected Warehouse'})`;
      label = 'Room Name:';
    } else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) {
      title = `CREATE NEW CONTAINER (in ${selectedRoomName || 'Selected Room'})`;
      label = 'Container Name:';
    } else {
      debugService.error(`Cannot create ${type}: missing parent selection`, { selectedWarehouseId, selectedRoomId });
      showNotification("Please select the parent location first.", "error");
      return;
    }

    setInputModalConfig({
      title, label, initialValue: '',
      onSubmit: async (name) => {
        try {
          debugService.action(`Attempting to create ${type} with name: ${name}`);
          
          if (type === 'warehouse') {
            localStorageService.addWarehouse(name);
            debugService.info(`Warehouse "${name}" created successfully`);
          } else if (type === 'room' && selectedWarehouseId) {
            localStorageService.addRoom(selectedWarehouseId, name);
            debugService.info(`Room "${name}" created successfully in warehouse ${selectedWarehouseId}`);
          } else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) {
            localStorageService.addShelf(selectedWarehouseId, selectedRoomId, name);
            debugService.info(`Container "${name}" created successfully in room ${selectedRoomId}`);
          }
          
          showNotification(`${type} "${name}" created!`);
          setShowInputModal(false);
          loadWarehouses();
          if (selectedWarehouseId) loadRooms(selectedWarehouseId);
          if (selectedWarehouseId && selectedRoomId) loadShelves(selectedWarehouseId, selectedRoomId);
        } catch (e) {
          debugService.error(`Error creating ${type}`, { error: (e as Error).message, name, selectedWarehouseId, selectedRoomId });
          showNotification(`Error creating ${type}: ${(e as Error).message}`, 'error');
        }
      }
    });
    setShowInputModal(true);
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
      showNotification(`Item "${item.name}" deleted.`);
    }, `Delete item "${item.name}"? This cannot be undone.`);
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
      for (const item of itemsToTransfer) {
        try {
          localStorageService.transferBucketItem(item);
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }
      showNotification(`${successCount} item(s) transferred. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
      loadBucketItems();
      loadWarehouses();
    }, `Transfer ${itemsToTransfer.length} item(s) to their destinations?`);
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
  
  const itemsToDisplay = showBucketView ? bucketItems : shelfItems;
  const currentDisplayContext = showBucketView ? 'bucket' : 'storage';
  const displayTitle = showBucketView 
    ? "BUCKET - Staging Area" 
    : (selectedShelfName || (selectedRoomName ? `Room: ${selectedRoomName} (Select Container)` : (selectedWarehouseName ? `Warehouse: ${selectedWarehouseName} (Select Room)` : 'Select a Warehouse')));

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
      <DestinationSelectorModal 
        show={showDestinationSelector} 
        onClose={() => { setShowDestinationSelector(false); setItemToMoveFromBucket(null);}} 
        onSelect={handleSelectDestinationForItem}
        warehouses={warehouses}
      />

      {(successMessage || errorMessage) && (
        <div className={`fixed top-5 right-5 p-3 rounded-md shadow-lg z-[200] text-sm ${successMessage ? ASCII_COLORS.success : ASCII_COLORS.error} border ${successMessage ? 'border-green-600' : 'border-red-600'}`}>
          {successMessage || errorMessage}
        </div>
      )}

      <header className="mb-6 border-b-2 pb-4 border-dashed border-yellow-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h1 className={`${ASCII_COLORS.accent} text-xl sm:text-2xl lg:text-3xl font-bold`}>
            📦 INVENTORY OS v2.6
          </h1>
          
          {/* Main Action Buttons */}
          <div className="flex items-center justify-between lg:justify-end gap-2 flex-wrap">
            {/* Primary Actions */}
            <div className="flex items-center gap-1">
              <UserSwitcher onUserChange={() => {
                loadWarehouses();
                loadBucketItems();
                themeService.onUserChanged();
              }} />
              
              <button 
                onClick={() => setShowBucketView(!showBucketView)} 
                className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} relative`} 
                title={showBucketView ? "View Storage" : "View Bucket"}
              >
                {showBucketView ? <Archive size={18} /> : <ShoppingCart size={18} />}
                {bucketItems.length > 0 && !showBucketView && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {bucketItems.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setShowChat(true)} 
                className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} 
                title="AI Assistant SMARTIE"
              >
                <BrainCircuit size={18} className="text-purple-400"/>
              </button>
            </div>

            {/* Secondary Actions Group */}
            <div className="flex items-center gap-1">
              

              <button 
                onClick={() => setShowQRSync(true)} 
                className={`${ASCII_COLORS.buttonBg} p-1.5 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} 
                title="Device Sync"
              >
                <Download size={16}/>
              </button>

              <button 
                onClick={() => setShowVisual(true)} 
                className={`${ASCII_COLORS.buttonBg} p-1.5 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} 
                title="Visual View"
              >
                <ImageIcon size={16}/>
              </button>
            </div>

            {/* Utility Group */}
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <CurrencySelector 
                currentCurrency={currentCurrency}
                onCurrencyChange={handleCurrencyChange}
              />
            </div>

            {/* Admin Only */}
            {userService.canExportData() && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowImportExport(true)} 
                  className={`${ASCII_COLORS.buttonBg} p-1.5 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} 
                  title="Import/Export (Master)"
                >
                  <Archive size={16} className="text-orange-400"/>
                </button>
                
                <button 
                  onClick={() => setShowDebug(true)} 
                  className={`${ASCII_COLORS.buttonBg} p-1.5 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} 
                  title="Debug Log"
                >
                  <Bug size={16} className="text-orange-400"/>
                </button>
                
                <button 
                  onClick={() => setShowSelfTest(true)} 
                  className={`${ASCII_COLORS.buttonBg} p-1.5 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} 
                  title="Self-Test Suite"
                >
                  <TestTube size={16} className="text-purple-400"/>
                </button>
              </div>
            )}

            {/* Info - Always Last */}
            <button 
              onClick={() => setShowInfoModal(true)} 
              className={`${ASCII_COLORS.buttonBg} p-1.5 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} 
              title="Info"
            >
              <Info size={16}/>
            </button>
          </div>
        </div>
      </header>
      
      <main>
        <ImportExportModal show={showImportExport} onClose={() => setShowImportExport(false)} />
        <VisualView show={showVisual} onClose={() => setShowVisual(false)} />
        <DebugModal show={showDebug} onClose={() => setShowDebug(false)} />
        <QRSyncModal show={showQRSync} onClose={() => setShowQRSync(false)} />
        <SelfTestModal show={showSelfTest} onClose={() => setShowSelfTest(false)} />
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
                <h2 className="text-xl font-bold">WAREHOUSES</h2>
                {userService.hasPermission('canCreateWarehouses') && (
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
                      onClick={() => setSelectedWarehouseId(w.id)}
                    >
                      <span className="flex items-center truncate">
                        <Home className="w-4 h-4 mr-2 shrink-0"/>{w.name}
                      </span>
                      <span className="flex items-center">
                        {userService.hasPermission('canDeleteWarehouses') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); renameEntity('warehouse', w); }} 
                            className="p-1 hover:text-yellow-400"
                          >
                            <Edit size={16}/>
                          </button>
                        )}
                        {userService.hasPermission('canDeleteWarehouses') && (
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
                <h2 className={`text-xl font-bold ${!selectedWarehouseId ? 'opacity-50' : ''}`}>ROOMS</h2>
                {userService.hasPermission('canCreateRooms') && (
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
                      onClick={() => setSelectedRoomId(r.id)}
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
                <h2 className={`text-xl font-bold ${!selectedRoomId ? 'opacity-50' : ''}`}>CONTAINERS</h2>
                {userService.hasPermission('canCreateContainers') && (
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
                      onClick={() => setSelectedShelfId(s.id)}
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
              <button 
                onClick={handleOpenAddItemModal} 
                disabled={!showBucketView && (!selectedWarehouseId || !selectedRoomId || !selectedShelfId)} 
                className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center`}
              >
                <Plus className="w-4 h-4 mr-1"/>ADD ITEM {showBucketView ? "TO BUCKET" : ""}
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
                  onDeleteClick={handleDeleteItem} 
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
    </div>
  );
}

export default InventoryApp;