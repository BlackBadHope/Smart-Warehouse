
import React, { useState, useEffect, useCallback, useRef } from 'react';
import firebase from 'firebase/compat/app'; 
import 'firebase/compat/auth'; 
import 'firebase/compat/firestore'; 
import { Plus, Edit, Trash2, Home, Box, List, Info, BrainCircuit, ShoppingCart, MoveUpRight, Send, XCircle, History, PackageSearch, Archive, LogOut, UserCircle } from 'lucide-react';
import { Content, Part, Tool, Type } from '@google/genai'; // Added Type import

import { Warehouse, Room, Shelf, Item, ItemCore, BucketItem, UserProfile, ChatMessage, EntityCreationArgs, EntityMutationArgs, ItemInteractionArgs, GetExpiringItemsArgs, EntityType, Unit, Priority, InventorySummary, ItemLocationSummary, FirebaseEntity } from './types';
import { ASCII_COLORS, APP_ID } from './constants';
import * as firebaseService from './services/firebaseService';
import { db } from './services/firebaseService'; 
import * as geminiService from './services/geminiService';

import InputModal from './components/InputModal';
import InfoModal from './components/InfoModal';
import ConfirmModal from './components/ConfirmModal';
import AddItemModal from './components/AddItemModal';
import ChatModal from './components/ChatModal';
import ItemCard from './components/ItemCard';

interface InventoryAppProps {
  user: firebase.User; 
  userProfile: UserProfile;
}

const InventoryApp: React.FC<InventoryAppProps> = ({ user, userProfile }) => {
  const userId = user.uid;

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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  const getCurrentLocationContextForAI = (): string => {
    let context = "Top level (no specific location selected)";
    if (selectedWarehouseName) context = `Warehouse: ${selectedWarehouseName}`;
    if (selectedRoomName) context += ` > Room: ${selectedRoomName}`;
    if (selectedShelfName) context += ` > Container: ${selectedShelfName}`;
    return context;
  };
  
  const functionDeclarations: Tool[] = [
    {
      functionDeclarations: [
        {
          name: "find_item_details",
          description: "Searches the user's entire inventory for a specific item by name and returns its locations, quantities, and other details if found.",
          parameters: { type: Type.OBJECT, properties: { itemName: { type: Type.STRING, description: "The name of the item to search for." }}, required: ["itemName"] }
        },
        {
          name: "add_to_shopping_list",
          description: "Adds one or more items to the user's shopping list.",
          parameters: { type: Type.OBJECT, properties: { items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of item names." }}, required: ["items"] }
        },
        {
          name: "create_entity",
          description: "Creates a new warehouse, room, or container (shelf).",
          parameters: { type: Type.OBJECT, properties: { 
            entityType: { type: Type.STRING, enum: ["warehouse", "room", "shelf"], description: "The type of entity to create." },
            name: { type: Type.STRING, description: "The name for the new entity." },
            parentWarehouseName: { type: Type.STRING, description: "Name of the parent warehouse (required for room/shelf)." },
            parentRoomName: { type: Type.STRING, description: "Name of the parent room (required for shelf)." }
          }, required: ["entityType", "name"] }
        },
        {
          name: "rename_entity",
          description: "Renames an existing warehouse, room, or container (shelf).",
          parameters: { type: Type.OBJECT, properties: {
            entityType: { type: Type.STRING, enum: ["warehouse", "room", "shelf"], description: "The type of entity to rename." },
            currentName: { type: Type.STRING, description: "The current name of the entity to rename." },
            newName: { type: Type.STRING, description: "The new name for the entity." },
            parentWarehouseName: { type: Type.STRING, description: "Context: Name of the parent warehouse (if renaming room/shelf)." },
            parentRoomName: { type: Type.STRING, description: "Context: Name of the parent room (if renaming shelf)." }
          }, required: ["entityType", "currentName", "newName"] }
        },
        {
          name: "delete_entity",
          description: "Deletes a warehouse, room, or container (shelf) and all its contents. Use with extreme caution and confirm with user.",
          parameters: { type: Type.OBJECT, properties: {
            entityType: { type: Type.STRING, enum: ["warehouse", "room", "shelf"], description: "The type of entity to delete." },
            name: { type: Type.STRING, description: "The name of the entity to delete." },
            parentWarehouseName: { type: Type.STRING, description: "Context: Name of the parent warehouse (if deleting room/shelf)." },
            parentRoomName: { type: Type.STRING, description: "Context: Name of the parent room (if deleting shelf)." }
          }, required: ["entityType", "name"] }
        },
        {
          name: "add_item_to_container",
          description: "Adds a new item to a specified container. If container is not specified, uses current context or asks.",
          parameters: { type: Type.OBJECT, properties: {
            itemName: { type: Type.STRING, description: "Name of the item." },
            quantity: { type: Type.NUMBER, description: "Quantity of the item." },
            unit: { type: Type.STRING, enum: ["pcs", "kg", "g", "l", "ml", "box", "pack"], description: "Unit of measurement." },
            category: { type: Type.STRING, description: "Category of the item (optional)." },
            price: { type: Type.NUMBER, description: "Price of the item (optional)." },
            expiryDate: { type: Type.STRING, description: "Expiry date YYYY-MM-DD (optional)." },
            priority: { type: Type.STRING, enum: ["High", "Normal", "Low", "Dispose"], description: "Priority (optional, defaults to Normal)." },
            labels: {type: Type.ARRAY, items: {type: Type.STRING}, description: "Array of text labels (optional)."},
            description: { type: Type.STRING, description: "Description for the item (optional)." },
            containerWarehouseName: { type: Type.STRING, description: "Target warehouse name." },
            containerRoomName: { type: Type.STRING, description: "Target room name." },
            containerShelfName: { type: Type.STRING, description: "Target container/shelf name." }
          }, required: ["itemName", "quantity", "unit", "containerWarehouseName", "containerRoomName", "containerShelfName"] }
        },
        {
          name: "edit_item_in_container",
          description: "Edits an existing item in a specified container.",
          parameters: { type: Type.OBJECT, properties: {
            currentItemName: { type: Type.STRING, description: "Current name of the item to edit." },
            newItemName: { type: Type.STRING, description: "New name for the item (optional, if changing name)." },
            quantity: { type: Type.NUMBER, description: "New quantity (optional)." },
            unit: { type: Type.STRING, enum: ["pcs", "kg", "g", "l", "ml", "box", "pack"], description: "New unit (optional)." },
            category: { type: Type.STRING, description: "New category (optional)." },
            price: { type: Type.NUMBER, description: "New price (optional)." },
            expiryDate: { type: Type.STRING, description: "New expiry date YYYY-MM-DD (optional)." },
            priority: { type: Type.STRING, enum: ["High", "Normal", "Low", "Dispose"], description: "New priority (optional)." },
            labels: {type: Type.ARRAY, items: {type: Type.STRING}, description: "New array of text labels (optional, replaces existing)."},
            description: { type: Type.STRING, description: "New description for the item (optional)." },
            containerWarehouseName: { type: Type.STRING, description: "Warehouse where the item is located." },
            containerRoomName: { type: Type.STRING, description: "Room where the item is located." },
            containerShelfName: { type: Type.STRING, description: "Container/shelf where the item is located." }
          }, required: ["currentItemName", "containerWarehouseName", "containerRoomName", "containerShelfName"] }
        },
        {
            name: "get_expiring_items",
            description: "Finds items that are expiring soon.",
            parameters: {type: Type.OBJECT, properties: { daysUntilExpiry: {type: Type.NUMBER, description: "Number of days to check for expiry (e.g., 7 for next week). Defaults to 7."}}, required: []}
        },
        {
            name: "get_inventory_summary",
            description: "Provides a summary of the entire inventory, including counts of locations and items, and a sample of items.",
            parameters: {type: Type.OBJECT, properties: {}, required: []}
        }
      ]
    }
  ];

  // Helper: Find entity ID by names (for AI which uses names)
  const resolveEntityPath = async (
    entityType: EntityType,
    name: string,
    parentWarehouseName?: string,
    parentRoomName?: string
  ): Promise<{ path: string; id: string; name: string } | null> => {
    let baseEntity: FirebaseEntity | null = null;
    let path = `artifacts/${APP_ID}/users/${userId}/`;
    let entityIdToReturn: string | null = null;

    if (entityType === 'warehouse') {
      baseEntity = await firebaseService.findEntityByNameAndType(userId, name, 'warehouse');
      if (baseEntity) {
        path += `warehouses/${baseEntity.id}`;
        entityIdToReturn = baseEntity.id;
      }
    } else if (entityType === 'room' && parentWarehouseName) {
      const pwh = await firebaseService.findEntityByNameAndType(userId, parentWarehouseName, 'warehouse');
      if (pwh) {
        baseEntity = await firebaseService.findEntityByNameAndType(userId, name, 'room', parentWarehouseName);
        if (baseEntity) {
          path += `warehouses/${pwh.id}/rooms/${baseEntity.id}`;
          entityIdToReturn = baseEntity.id;
        }
      } else return null; 
    } else if (entityType === 'shelf' && parentWarehouseName && parentRoomName) {
      const pwh = await firebaseService.findEntityByNameAndType(userId, parentWarehouseName, 'warehouse');
      if (!pwh) return null;
      const pr = await firebaseService.findEntityByNameAndType(userId, parentRoomName, 'room', parentWarehouseName);
      if (!pr) return null;
      baseEntity = await firebaseService.findEntityByNameAndType(userId, name, 'shelf', parentWarehouseName, parentRoomName);
      if (baseEntity) {
        path += `warehouses/${pwh.id}/rooms/${pr.id}/shelves/${baseEntity.id}`;
        entityIdToReturn = baseEntity.id;
      }
    }
    
    if (entityIdToReturn && baseEntity) return { path, id: entityIdToReturn, name: baseEntity.name };
    return null;
  };
  
  const availableTools: Record<string, (args: any) => Promise<any>> = {
    find_item_details: async ({ itemName }: { itemName: string }) => {
      showNotification(`AI searching for: ${itemName}...`, 'success');
      return firebaseService.findItemDetailsByName(userId, itemName);
    },
    add_to_shopping_list: async ({ items }: { items: string[] }) => {
      if (!items || items.length === 0) return { success: false, message: "No items provided." };
      showNotification(`AI adding to shopping list: ${items.join(', ')}...`, 'success');
      return firebaseService.addItemsToShoppingList(userId, items);
    },
    create_entity: async (args: EntityCreationArgs) => {
      const { entityType, name, parentWarehouseName, parentRoomName } = args;
      let path = `artifacts/${APP_ID}/users/${userId}/`;

      if (entityType === 'warehouse') {
        path += 'warehouses';
      } else if (entityType === 'room') {
        if (!parentWarehouseName) return { success: false, message: "Parent warehouse name required to create a room."};
        const parent = await resolveEntityPath('warehouse', parentWarehouseName);
        if (!parent) return { success: false, message: `Warehouse "${parentWarehouseName}" not found.`};
        path = parent.path + '/rooms';
      } else if (entityType === 'shelf') {
        if (!parentWarehouseName || !parentRoomName) return { success: false, message: "Parent warehouse and room names required to create a shelf."};
        const parent = await resolveEntityPath('room', parentRoomName, parentWarehouseName);
        if (!parent) return { success: false, message: `Room "${parentRoomName}" in Warehouse "${parentWarehouseName}" not found.`};
        path = parent.path + '/shelves';
      } else {
        return { success: false, message: `Invalid entity type: ${entityType}`};
      }
      try {
        await firebaseService.addEntity(path, name);
        showNotification(`${entityType} "${name}" created via AI!`, 'success');
        return { success: true, message: `${entityType} "${name}" created successfully.` };
      } catch (e) { return { success: false, message: `Error creating ${entityType}: ${ (e as Error).message }`}; }
    },
    rename_entity: async (args: EntityMutationArgs) => {
        const { entityType, currentName, newName, parentWarehouseName, parentRoomName } = args;
        const entityInfo = await resolveEntityPath(entityType, currentName, parentWarehouseName, parentRoomName);
        if (!entityInfo) return { success: false, message: `${entityType} "${currentName}" not found at specified path.`};
        try {
            await firebaseService.updateEntityName(entityInfo.path, newName);
            showNotification(`${entityType} "${currentName}" renamed to "${newName}" via AI!`, 'success');
            return { success: true, message: `${entityType} "${currentName}" renamed to "${newName}".`};
        } catch (e) { return { success: false, message: `Error renaming: ${(e as Error).message}`}; }
    },
    delete_entity: async (args: EntityMutationArgs) => {
        const { entityType, name, parentWarehouseName, parentRoomName } = args; 
        const entityInfo = await resolveEntityPath(entityType, name, parentWarehouseName, parentRoomName);
        if (!entityInfo) return { success: false, message: `${entityType} "${name}" not found at specified path.`};
        try {
            await firebaseService.deleteFsEntity(entityInfo.path);
            if (entityType === 'warehouse' && selectedWarehouseId === entityInfo.id) setSelectedWarehouseId(null);
            if (entityType === 'room' && selectedRoomId === entityInfo.id) setSelectedRoomId(null);
            if (entityType === 'shelf' && selectedShelfId === entityInfo.id) setSelectedShelfId(null);
            showNotification(`${entityType} "${name}" deleted via AI.`, 'success');
            return { success: true, message: `${entityType} "${name}" and all its contents deleted.`};
        } catch (e) { return { success: false, message: `Error deleting: ${(e as Error).message}`}; }
    },
    add_item_to_container: async (args: ItemInteractionArgs) => {
        const { itemName, quantity, unit, category, price, expiryDate, priority, labels, description, containerWarehouseName, containerRoomName, containerShelfName } = args;
        const containerInfo = await resolveEntityPath('shelf', containerShelfName, containerWarehouseName, containerRoomName);
        if (!containerInfo) return { success: false, message: `Container "${containerShelfName}" not found in "${containerRoomName}" > "${containerWarehouseName}".`};
        
        const itemData: ItemCore = {
            name: itemName,
            quantity: quantity || 1,
            unit: unit || 'pcs',
            priority: priority || 'Normal',
        };
        if (category) itemData.category = category;
        if (price !== undefined) itemData.price = price;
        if (expiryDate) itemData.expiryDate = expiryDate;
        if (labels) itemData.labels = labels;
        if (description) itemData.description = description;

        try {
            await firebaseService.addItemToPath(`${containerInfo.path}/items`, itemData);
            showNotification(`Item "${itemName}" added to ${containerShelfName} via AI.`, 'success');
            return { success: true, message: `Item "${itemName}" added to ${containerShelfName}.`};
        } catch (e) { return { success: false, message: `Error adding item: ${(e as Error).message}`};}
    },
    edit_item_in_container: async (args: ItemInteractionArgs & {currentItemName: string, newItemName?: string}) => {
        const { currentItemName, newItemName, quantity, unit, category, price, expiryDate, priority, labels, description, containerWarehouseName, containerRoomName, containerShelfName } = args;
        const containerInfo = await resolveEntityPath('shelf', containerShelfName, containerWarehouseName, containerRoomName);
        if (!containerInfo) return { success: false, message: `Container "${containerShelfName}" not found for editing item.`};

        // Find the item ID first
        const itemsInContainerSnapshot = await db?.collection(`${containerInfo.path}/items`).where('name', '==', currentItemName).limit(1).get();
        if (!itemsInContainerSnapshot || itemsInContainerSnapshot.empty) {
            return { success: false, message: `Item "${currentItemName}" not found in container "${containerShelfName}".` };
        }
        const itemToEditDoc = itemsInContainerSnapshot.docs[0];
        const itemIdToEdit = itemToEditDoc.id;

        const itemDataUpdate: Partial<ItemCore> = {};
        if (newItemName) itemDataUpdate.name = newItemName;
        if (quantity !== undefined) itemDataUpdate.quantity = quantity;
        if (unit) itemDataUpdate.unit = unit;
        if (category) itemDataUpdate.category = category;
        if (price !== undefined) itemDataUpdate.price = price;
        if (expiryDate) itemDataUpdate.expiryDate = expiryDate;
        if (priority) itemDataUpdate.priority = priority;
        if (labels) itemDataUpdate.labels = labels;
        if (description) itemDataUpdate.description = description;

        if (Object.keys(itemDataUpdate).length === 0) {
            return { success: false, message: "No changes specified for the item." };
        }

        try {
            await firebaseService.updateItemAtPath(`${containerInfo.path}/items`, itemIdToEdit, itemDataUpdate);
            showNotification(`Item "${currentItemName}" updated in ${containerShelfName} via AI.`, 'success');
            return { success: true, message: `Item "${currentItemName}" updated in ${containerShelfName}.`};
        } catch (e) { return { success: false, message: `Error updating item: ${(e as Error).message}`};}
    },
    get_expiring_items: async (args: GetExpiringItemsArgs) => {
        const days = args.daysUntilExpiry === undefined ? 7 : args.daysUntilExpiry; 
        try {
            const items = await firebaseService.getExpiringItems(userId, days);
            if (items.length === 0) return { message: `No items found expiring in the next ${days} days.`};
            return { expiringItems: items, message: `Found ${items.length} item(s) expiring in the next ${days} days.`};
        } catch (e) { return { message: `Error fetching expiring items: ${(e as Error).message}`}; }
    },
    get_inventory_summary: async () => {
        try {
            const summary = await firebaseService.getInventorySummary(userId);
            return { summary, message: "Inventory summary generated."};
        } catch (e) { return { message: `Error generating summary: ${(e as Error).message}`}; }
    }
  };

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') setSuccessMessage(message);
    else setErrorMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
      setErrorMessage('');
    }, 4000);
  }, []);

  useEffect(() => firebaseService.listenToWarehouses(userId, setWarehouses), [userId]);
  useEffect(() => {
    if (selectedWarehouseId) {
      firebaseService.listenToRooms(userId, selectedWarehouseId, setRooms);
      const wh = warehouses.find(w => w.id === selectedWarehouseId);
      setSelectedWarehouseName(wh ? wh.name : null);
    } else {
      setRooms([]);
      setSelectedWarehouseName(null);
    }
  }, [userId, selectedWarehouseId, warehouses]);

  useEffect(() => {
    if (selectedWarehouseId && selectedRoomId) {
      firebaseService.listenToShelves(userId, selectedWarehouseId, selectedRoomId, setShelves);
      const r = rooms.find(rm => rm.id === selectedRoomId);
      setSelectedRoomName(r ? r.name : null);
    } else {
      setShelves([]);
      setSelectedRoomName(null);
    }
  }, [userId, selectedWarehouseId, selectedRoomId, rooms]);

  useEffect(() => {
    if (selectedWarehouseId && selectedRoomId && selectedShelfId) {
      firebaseService.listenToShelfItems(userId, selectedWarehouseId, selectedRoomId, selectedShelfId, setShelfItems);
      const sh = shelves.find(s => s.id === selectedShelfId);
      setSelectedShelfName(sh ? sh.name : null);
    } else {
      setShelfItems([]);
      setSelectedShelfName(null);
    }
  }, [userId, selectedWarehouseId, selectedRoomId, selectedShelfId, shelves]);

  useEffect(() => firebaseService.listenToBucketItems(userId, setBucketItems), [userId]);

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
        } catch (e) {
            showNotification(`Action failed: ${(e as Error).message}`, 'error');
        }
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const createEntity = (type: EntityType) => {
    let path = '', title = '', label = '';
    
    if (type === 'warehouse') {
      path = `artifacts/${APP_ID}/users/${userId}/warehouses`;
      title = 'CREATE NEW WAREHOUSE'; label = 'Warehouse Name:';
    } else if (type === 'room' && selectedWarehouseId) {
      path = `artifacts/${APP_ID}/users/${userId}/warehouses/${selectedWarehouseId}/rooms`;
      title = `CREATE NEW ROOM (in ${selectedWarehouseName || 'Selected Warehouse'})`; label = 'Room Name:';
    } else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) {
      path = `artifacts/${APP_ID}/users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves`;
      title = `CREATE NEW CONTAINER (in ${selectedRoomName || 'Selected Room'})`; label = 'Container Name:';
    } else {
        showNotification("Please select the parent location first.", "error");
        return;
    }

    setInputModalConfig({
      title, label, initialValue: '',
      onSubmit: async (name) => {
        try {
            await firebaseService.addEntity(path, name);
            showNotification(`${type} "${name}" created!`);
            setShowInputModal(false);
        } catch (e) {
            showNotification(`Error creating ${type}: ${(e as Error).message}`, 'error');
        }
      }
    });
    setShowInputModal(true);
  };

  const renameEntity = (type: EntityType, entity: Warehouse | Room | Shelf) => {
    let path = '', title = '', label = '';
    if (type === 'warehouse') path = `artifacts/${APP_ID}/users/${userId}/warehouses/${entity.id}`;
    else if (type === 'room' && selectedWarehouseId) path = `artifacts/${APP_ID}/users/${userId}/warehouses/${selectedWarehouseId}/rooms/${entity.id}`;
    else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) path = `artifacts/${APP_ID}/users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves/${entity.id}`;
    else return;
    
    setInputModalConfig({
      title: `RENAME ${type.toUpperCase()}`, label: 'New Name:', initialValue: entity.name,
      onSubmit: async (name) => {
        try {
            await firebaseService.updateEntityName(path, name);
            showNotification(`${type} renamed to "${name}"!`);
            setShowInputModal(false);
        } catch (e) {
            showNotification(`Error renaming ${type}: ${(e as Error).message}`, 'error');
        }
      }
    });
    setShowInputModal(true);
  };

  const deleteEntity = (type: EntityType, entity: Warehouse | Room | Shelf) => {
    let path = '';
    if (type === 'warehouse') path = `artifacts/${APP_ID}/users/${userId}/warehouses/${entity.id}`;
    else if (type === 'room' && selectedWarehouseId) path = `artifacts/${APP_ID}/users/${userId}/warehouses/${selectedWarehouseId}/rooms/${entity.id}`;
    else if (type === 'shelf' && selectedWarehouseId && selectedRoomId) path = `artifacts/${APP_ID}/users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves/${entity.id}`;
    else return;

    handleConfirm(async () => {
      await firebaseService.deleteFsEntity(path);
      showNotification(`${type} "${entity.name}" and all its contents deleted.`);
      if (type === 'warehouse' && selectedWarehouseId === entity.id) setSelectedWarehouseId(null);
      if (type === 'room' && selectedRoomId === entity.id) setSelectedRoomId(null);
      if (type === 'shelf' && selectedShelfId === entity.id) setSelectedShelfId(null);
    }, `Delete ${type} "${entity.name}" and ALL its contents? This cannot be undone.`);
  };

  const handleMoveContainer = async (container: Shelf, newRoomId: string) => {
    if (!selectedWarehouseId || !selectedRoomId) return; 
    try {
      await firebaseService.moveContainer(userId, selectedWarehouseId, selectedRoomId, container, newRoomId);
      showNotification(`Container "${container.name}" moved successfully.`);
      setContainerToMove(null);
      if (selectedShelfId === container.id) setSelectedShelfId(null); 
    } catch (error) {
      console.error("Error moving container:", error);
      showNotification("Failed to move container.", 'error');
    }
  };

  const currentItemPath = selectedWarehouseId && selectedRoomId && selectedShelfId
    ? `artifacts/${APP_ID}/users/${userId}/warehouses/${selectedWarehouseId}/rooms/${selectedRoomId}/shelves/${selectedShelfId}/items`
    : '';

  const handleOpenAddItemModal = () => {
    if (!showBucketView && !currentItemPath) { 
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
        // Explicitly build updateData to avoid sending undefined fields from the modal if they were cleared
        if (itemDataFromModal.name !== undefined) updateData.name = itemDataFromModal.name;
        if (itemDataFromModal.quantity !== undefined) updateData.quantity = itemDataFromModal.quantity;
        if (itemDataFromModal.unit !== undefined) updateData.unit = itemDataFromModal.unit;
        if (itemDataFromModal.priority !== undefined) updateData.priority = itemDataFromModal.priority;
        updateData.category = itemDataFromModal.category || ""; // Send empty string to clear, or omit if truly optional
        updateData.price = itemDataFromModal.price === undefined ? firebase.firestore.FieldValue.delete() as any : itemDataFromModal.price; // Allow deleting price
        updateData.purchaseDate = itemDataFromModal.purchaseDate || "";
        updateData.expiryDate = itemDataFromModal.expiryDate || "";
        updateData.description = itemDataFromModal.description || "";
        updateData.labels = itemDataFromModal.labels || [];


        if ('originalPath' in editingItem!) { 
          await firebaseService.updateBucketItem(userId, editId!, updateData);
        } else { 
          if (!currentItemPath) throw new Error("Current item path is not set for editing a storage item.");
          await firebaseService.updateItemAtPath(currentItemPath, editId!, updateData);
        }
        showNotification(`Item "${itemNameForNotification}" updated!`);
      } else { 
        // For new items, ensure all required ItemCore fields are present.
        // Optional fields from itemDataFromModal are included if they exist.
        const itemDataForAdd: ItemCore = {
            name: itemDataFromModal.name || 'Unnamed Item',
            quantity: itemDataFromModal.quantity === undefined ? 1 : itemDataFromModal.quantity,
            priority: itemDataFromModal.priority || 'Normal',
            unit: itemDataFromModal.unit || 'pcs',
            // Add other optional fields only if they have a value
            ...(itemDataFromModal.category && { category: itemDataFromModal.category }),
            ...(itemDataFromModal.price !== undefined && { price: itemDataFromModal.price }),
            ...(itemDataFromModal.purchaseDate && { purchaseDate: itemDataFromModal.purchaseDate }),
            ...(itemDataFromModal.expiryDate && { expiryDate: itemDataFromModal.expiryDate }),
            ...(itemDataFromModal.description && { description: itemDataFromModal.description }),
            ...(itemDataFromModal.labels && itemDataFromModal.labels.length > 0 && { labels: itemDataFromModal.labels }),
        };

        const pathForNewItem = showBucketView 
          ? `artifacts/${APP_ID}/users/${userId}/bucket` 
          : currentItemPath;
        if (!pathForNewItem) throw new Error("Item path context is missing for adding a new item.");
        
        await firebaseService.addItemToPath(pathForNewItem, itemDataForAdd);
        showNotification(`Item "${itemDataForAdd.name}" added!`);
      }
      setShowAddItemModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving item:", error);
      showNotification(`Failed to save item: ${(error as Error).message}`, 'error');
    }
  };
  
  const handleDeleteItem = (item: Item | BucketItem) => {
    handleConfirm(async () => {
        if (showBucketView) { 
            await firebaseService.removeItemFromBucket(userId, item.id);
        } else if (currentItemPath) { 
            await firebaseService.deleteItemFromPath(currentItemPath, item.id);
        } else {
            throw new Error("No path to delete item from or invalid context.");
        }
        showNotification(`Item "${item.name}" deleted.`);
    }, `Delete item "${item.name}"? This cannot be undone.`);
  };

  const handleUpdateQuantity = async (item: Item | BucketItem, amount: number) => {
    const newQuantity = Math.max(0, (item.quantity || 0) + amount);
    try {
        if (showBucketView && 'originalPath' in item) { 
            await firebaseService.updateBucketItem(userId, item.id, { quantity: newQuantity });
        } else if (!showBucketView && currentItemPath) { 
            await firebaseService.updateItemQuantityAtPath(currentItemPath, item.id, newQuantity);
        } else {
            throw new Error("No path to update item quantity or invalid item context.");
        }
    } catch (error) {
      showNotification(`Failed to update quantity: ${(error as Error).message}`, 'error');
    }
  };

  const handleMoveToBucket = async (item: Item) => { 
    if (!currentItemPath) {
        showNotification("Cannot move item: current path unknown.", "error");
        return;
    }
    try {
        await firebaseService.addItemToBucket(userId, item, currentItemPath); 
        // Only delete if add was successful
        try {
            await firebaseService.deleteItemFromPath(currentItemPath, item.id);
            showNotification(`Item "${item.name}" moved to bucket.`);
        } catch (deleteError) {
            showNotification(`Item added to bucket, but failed to delete original: ${(deleteError as Error).message}`, 'error');
        }
    } catch (addError) {
        showNotification(`Failed to move item to bucket: ${(addError as Error).message}`, 'error');
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
      firebaseService.updateBucketItem(userId, itemToMoveFromBucket.id, { destination })
          .then(() => {
              showNotification(`Destination for "${itemToMoveFromBucket.name}" updated.`);
              setItemToMoveFromBucket(null);
              setShowDestinationSelector(false);
          })
          .catch(err => showNotification(`Error updating destination: ${err.message}`, 'error'));
  };

  const handleToggleTransfer = async (bucketItem: BucketItem) => {
      try {
          await firebaseService.updateBucketItem(userId, bucketItem.id, { isReadyToTransfer: !bucketItem.isReadyToTransfer });
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
                await firebaseService.transferItemFromBucket(userId, item);
                successCount++;
            } catch (err) {
                console.error(`Failed to transfer ${item.name}: `, err);
                errorCount++;
            }
        }
        showNotification(`${successCount} item(s) transferred. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
    }, `Transfer ${itemsToTransfer.length} item(s) to their destinations?`);
  };

  const handleAskGemini = async (userQuery: string, historyOverride?: ChatMessage[]) => {
    if (!userQuery.trim() && !historyOverride) return; 

    setIsGeminiLoading(true);
    let currentInputChatHistory: ChatMessage[] = historyOverride || [...chatHistory];
    if (!historyOverride) { 
        const userMessage: ChatMessage = { role: "user", parts: [{ text: userQuery }] };
        currentInputChatHistory = [...currentInputChatHistory, userMessage];
    }
    setChatHistory(currentInputChatHistory); 

    try {
      const response = await geminiService.askGemini(currentInputChatHistory as Content[], functionDeclarations, getCurrentLocationContextForAI());
      let modelResponsePart: Part | undefined = response.candidates?.[0]?.content?.parts[0];
      let finalChatHistoryUpdate: ChatMessage[] = [...currentInputChatHistory];

      if (modelResponsePart?.functionCall) {
        const fnCall = modelResponsePart.functionCall;
        finalChatHistoryUpdate = [...finalChatHistoryUpdate, { role: "model", parts: [modelResponsePart] }];
        setChatHistory(finalChatHistoryUpdate); 

        const toolToCall = availableTools[fnCall.name];
        if (toolToCall) {
          showNotification(`AI is using tool: ${fnCall.name}...`, 'success');
          const toolResult = await toolToCall(fnCall.args || {}); 
          
          const functionResponsePart: Part = { functionResponse: { name: fnCall.name, response: toolResult } };
          finalChatHistoryUpdate = [...finalChatHistoryUpdate, { role: "function", parts: [functionResponsePart] }];
          setChatHistory(finalChatHistoryUpdate);

          const finalResponse = await geminiService.askGemini(finalChatHistoryUpdate as Content[], functionDeclarations, getCurrentLocationContextForAI());
          modelResponsePart = finalResponse.candidates?.[0]?.content?.parts[0];
        } else {
           modelResponsePart = {text: `[[ Error: AI tried to call unknown function "${fnCall.name}" ]]`};
        }
      }

      if (modelResponsePart?.text) {
         setChatHistory(prev => [...prev, { role: "model", parts: [modelResponsePart!] }]);
      } else if (!modelResponsePart?.functionCall) { // If it's not a function call and not text, it's an issue.
         setChatHistory(prev => [...prev, { role: "model", parts: [{text: "[[ AI returned no text and no function call. ]]"}] }]);
      }
      // If modelResponsePart is still a functionCall here, it means the second call to Gemini also resulted in a function call.
      // This is unusual for this app's flow but technically possible. The chat will show the function call.

    } catch (error) {
      console.error("Gemini API Error in component:", error);
      const errorMessageText = error instanceof Error ? error.message : "Unknown error processing AI request.";
      setChatHistory(prev => [...prev, { role: "model", parts: [{ text: `[[ SYSTEM MALFUNCTION: ${errorMessageText} ]]` }] }]);
      showNotification(`AI Error: ${errorMessageText}`, 'error');
    } finally {
      setIsGeminiLoading(false);
    }
  };

  const runAIBenchmark = async () => {
    setShowChat(true); 
    showNotification("AI Benchmark test started... See Chat Window.", "success");
    
    const initialBenchmarkMessage: ChatMessage = {role: "user", parts: [{text: "Hello S.M.A.R.T.I.E., let's run a system diagnostic by trying out your capabilities."}]};
    setChatHistory([initialBenchmarkMessage]); 

    const benchmarkSequence = [
        "First, create a new warehouse named 'AI Test Warehouse'.",
        `Then, in 'AI Test Warehouse', create a room named 'AI Test Room'.`,
        `Next, in 'AI Test Room' within 'AI Test Warehouse', create a container named 'AI Test Container'.`,
        `Add an item named 'Flux Capacitor' (quantity 1, unit pcs, category 'Time Travel Parts', price 1000, expiry 2042-10-26, priority High, description 'Powers time travel', labels ['essential', 'rare']) to the 'AI Test Container' in 'AI Test Room' at 'AI Test Warehouse'.`,
        "What is the quantity of 'Flux Capacitor' in 'AI Test Container'?",
        "Edit the 'Flux Capacitor' item in 'AI Test Container': set its quantity to 2 and add a label 'upgraded'.",
        "What items are expiring in the next 7300 days?", // ~20 years to catch the Flux Capacitor
        "Provide a summary of my current inventory.",
        "What can I cook with the items I currently have? (Be creative, list 1-2 simple ideas)",
        "Give me a simple recipe for the first dish you suggested.",
        "Add 'Quantum Entangler' and 'Dark Matter Pellets' to my shopping list.",
        "Finally, delete the 'AI Test Warehouse' and all its contents. Make sure to ask me for confirmation before you do it.",
    ];

    let currentTempChatHistory = [initialBenchmarkMessage];

    for (const prompt of benchmarkSequence) {
        if (isGeminiLoading) { // Wait for previous step to complete
             await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (!isGeminiLoading) {
                        clearInterval(interval);
                        resolve(null);
                    }
                }, 100);
            });
        }
        // It's important that handleAskGemini updates currentTempChatHistory based on its internal state changes
        // For benchmark, we simulate user sending message then AI responding.
        // handleAskGemini will manage adding user & model responses to global chatHistory.
        // We pass currentTempChatHistory to handleAskGemini, which it uses as its starting point.
        // Then we update currentTempChatHistory from the global chatHistory after handleAskGemini completes.
        
        await handleAskGemini(prompt, currentTempChatHistory); 
        
        // After handleAskGemini is done (including its internal setChatHistory calls),
        // update our local benchmark history from the global state.
        // This is tricky because setChatHistory is async. A short delay might be needed or a more robust state sync.
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for state to hopefully propagate
        currentTempChatHistory = [...chatHistory]; // Re-sync

        // Optional: add a small delay between steps for readability in the chat UI
        if (benchmarkSequence.indexOf(prompt) < benchmarkSequence.length -1) {
             await new Promise(resolve => setTimeout(resolve, 1500)); 
        }
    }
    // Final check for loading state
    if (isGeminiLoading) setIsGeminiLoading(false);
    showNotification("AI Benchmark test sequence submitted. Check chat for results.", "success");
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
        getRooms: (whId: string) => Promise<Room[]>; 
        getShelves: (whId: string, rId: string) => Promise<Shelf[]>; 
    }> = ({ show, onClose, onSelect, warehouses: allWarehouses, getRooms, getShelves }) => {
        const [selWh, setSelWh] = useState<Warehouse | null>(null);
        const [selR, setSelR] = useState<Room | null>(null);
        const [selSh, setSelSh] = useState<Shelf | null>(null);
        const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
        const [availableShelves, setAvailableShelves] = useState<Shelf[]>([]);

        useEffect(() => {
            if (selWh) {
                getRooms(selWh.id).then(r => { setAvailableRooms(r); setSelR(null); setAvailableShelves([]); setSelSh(null); });
            } else { setAvailableRooms([]); setAvailableShelves([]); setSelR(null); setSelSh(null); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [selWh]); 
        useEffect(() => {
            if (selWh && selR) {
                getShelves(selWh.id, selR.id).then(s => { setAvailableShelves(s); setSelSh(null); });
            } else { setAvailableShelves([]); setSelSh(null); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [selR]); 

        if (!show) return null;
        return (
            <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
                <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-md border-2 ${ASCII_COLORS.border}`}>
                    <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3`}>Select Destination</h3>
                    <div className="space-y-2">
                        <select value={selWh?.id || ""} onChange={(e) => setSelWh(allWarehouses.find(w => w.id === e.target.value) || null)} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}>
                            <option value="">Select Warehouse</option>
                            {allWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                        {selWh && <select value={selR?.id || ""} onChange={(e) => setSelR(availableRooms.find(r => r.id === e.target.value) || null)} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}>
                            <option value="">Select Room</option>
                            {availableRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>}
                        {selR && <select value={selSh?.id || ""} onChange={(e) => setSelSh(availableShelves.find(s => s.id === e.target.value) || null)} className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}>
                            <option value="">Select Container</option>
                            {availableShelves.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>}
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                        <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} p-2 px-3 rounded`}>Cancel</button>
                        <button onClick={() => selWh && selR && selSh && onSelect(selWh, selR, selSh)} disabled={!selSh} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} p-2 px-3 rounded disabled:opacity-50`}>Confirm</button>
                    </div>
                </div>
            </div>
        );
    };
    const getRoomsForDestSelector = useCallback(async (whId: string): Promise<Room[]> => {
        if (!db) throw new Error("Firestore not initialized for getRoomsForDestSelector");
        const roomColRef = db.collection(`artifacts/${APP_ID}/users/${userId}/warehouses/${whId}/rooms`);
        const snapshot = await roomColRef.get();
        return snapshot.docs.map(d => ({id: d.id, ...d.data()}) as Room);
    }, [userId]);
    const getShelvesForDestSelector = useCallback(async (whId: string, rId: string): Promise<Shelf[]> => {
        if (!db) throw new Error("Firestore not initialized for getShelvesForDestSelector");
        const shelfColRef = db.collection(`artifacts/${APP_ID}/users/${userId}/warehouses/${whId}/rooms/${rId}/shelves`);
        const snapshot = await shelfColRef.get();
        return snapshot.docs.map(d => ({id: d.id, ...d.data()}) as Shelf);
    }, [userId]);

  const handleSignOut = async () => {
    try {
      await firebaseService.signOutUser();
      // App.tsx's onAuthStateChanged will handle UI update to unauthenticated state
      showNotification("Signed out successfully.", "success");
    } catch (error) {
      showNotification(`Sign out failed: ${(error as Error).message}`, "error");
    }
  };


  return (
    <div className={`${ASCII_COLORS.bg} ${ASCII_COLORS.text} min-h-screen font-mono p-4 sm:p-6 lg:p-8`}>
      <InfoModal show={showInfoModal} onCancel={() => setShowInfoModal(false)} />
      <InputModal show={showInputModal} title={inputModalConfig.title} label={inputModalConfig.label} initialValue={inputModalConfig.initialValue} onSubmit={inputModalConfig.onSubmit} onCancel={() => setShowInputModal(false)} />
      <ConfirmModal show={showConfirmModal} message={confirmMessage} onConfirm={executeConfirmedAction} onCancel={() => setShowConfirmModal(false)} />
      <AddItemModal show={showAddItemModal} onClose={() => { setShowAddItemModal(false); setEditingItem(null); }} onSubmit={handleItemFormSubmit} initialData={editingItem} editingItemId={editingItem?.id} currency={userProfile.currency} />
      <ChatModal show={showChat} onClose={() => setShowChat(false)} chatHistory={chatHistory} onSendMessage={handleAskGemini} isGeminiLoading={isGeminiLoading} />
      <DestinationSelectorModal 
          show={showDestinationSelector} 
          onClose={() => { setShowDestinationSelector(false); setItemToMoveFromBucket(null);}} 
          onSelect={handleSelectDestinationForItem}
          warehouses={warehouses}
          getRooms={getRoomsForDestSelector}
          getShelves={getShelvesForDestSelector}
      />

      {(successMessage || errorMessage) && (
        <div className={`fixed top-5 right-5 p-3 rounded-md shadow-lg z-[200] text-sm ${successMessage ? ASCII_COLORS.success : ASCII_COLORS.error} border ${successMessage ? 'border-green-600' : 'border-red-600'}`}>
          {successMessage || errorMessage}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between mb-6 border-b-2 pb-4 border-dashed border-yellow-700">
        <h1 className={`${ASCII_COLORS.accent} text-2xl sm:text-3xl font-bold`}>[ INVENTORY OS v2.6 ]</h1>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <div className="flex items-center text-sm mr-2 border border-yellow-700 px-2 py-1 rounded-md">
            <UserCircle size={18} className="mr-2 text-green-400"/> {userProfile.username}
          </div>
          <button onClick={() => setShowBucketView(!showBucketView)} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} relative`} title={showBucketView ? "View Storage" : "View Bucket"}>
            {showBucketView ? <Archive/> : <ShoppingCart/> }
            {bucketItems.length > 0 && !showBucketView && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{bucketItems.length}</span>}
          </button>
          <button onClick={runAIBenchmark} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} title="Run AI Benchmark Test"><History className="text-cyan-400"/></button>
          <button onClick={() => setShowInfoModal(true)} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} title="Info"><Info/></button>
          <button onClick={() => setShowChat(true)} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} title="AI Assistant"><BrainCircuit/></button>
          <button onClick={handleSignOut} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`} title="Sign Out"><LogOut className="text-red-400"/></button>
        </div>
      </header>
      
      <main>
        {containerToMove ? (
            <div className={`${ASCII_COLORS.inputBg} p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
                <h2 className={`text-xl font-bold mb-4 ${ASCII_COLORS.accent}`}>Move Container: {containerToMove.name}</h2>
                <p>Select the new destination room (must be in the same warehouse: {selectedWarehouseName}):</p>
                <ul className="h-48 overflow-y-auto border border-yellow-700 p-2 rounded-md my-4 bg-black">
                  {rooms.filter(r => r.id !== selectedRoomId).map(r => (
                    <li key={r.id} onClick={() => handleMoveContainer(containerToMove, r.id)} className="p-2 rounded cursor-pointer hover:bg-gray-700">
                      {r.name}
                    </li>
                  ))}
                  {rooms.filter(r => r.id !== selectedRoomId).length === 0 && <li className="p-2 text-gray-500">No other rooms available in this warehouse.</li>}
                </ul>
                <button onClick={() => setContainerToMove(null)} className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} py-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}>[CANCEL MOVE]</button>
            </div>
        ) : (
        <>
        {!showBucketView && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2"><h2 className="text-xl font-bold">WAREHOUSES</h2><button onClick={() => createEntity('warehouse')} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}><Plus/></button></div>
                <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px] max-h-[300px] overflow-y-auto`}><ul className="space-y-1">{warehouses.map(w => (<li key={w.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedWarehouseId === w.id ? 'bg-yellow-600 text-black font-bold' : 'hover:bg-gray-700'}`} onClick={() => setSelectedWarehouseId(w.id)}><span className="flex items-center truncate"><Home className="w-4 h-4 mr-2 shrink-0"/>{w.name}</span><span className="flex items-center"><button onClick={(e) => { e.stopPropagation(); renameEntity('warehouse', w); }} className="p-1 hover:text-yellow-400"><Edit size={16}/></button><button onClick={(e) => { e.stopPropagation(); deleteEntity('warehouse', w); }} className="p-1 hover:text-red-500"><Trash2 size={16}/></button></span></li>))}</ul></div>
            </div>
            <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2"><h2 className={`text-xl font-bold ${!selectedWarehouseId ? 'opacity-50' : ''}`}>ROOMS</h2><button onClick={() => createEntity('room')} disabled={!selectedWarehouseId} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}><Plus/></button></div>
                <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px] max-h-[300px] overflow-y-auto`}><ul className="space-y-1">{rooms.map(r => (<li key={r.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedRoomId === r.id ? 'bg-yellow-600 text-black font-bold' : 'hover:bg-gray-700'}`} onClick={() => setSelectedRoomId(r.id)}><span className="flex items-center truncate"><Box className="w-4 h-4 mr-2 shrink-0"/>{r.name}</span><span className="flex items-center"><button onClick={(e) => { e.stopPropagation(); renameEntity('room', r); }} className="p-1 hover:text-yellow-400"><Edit size={16}/></button><button onClick={(e) => { e.stopPropagation(); deleteEntity('room', r); }} className="p-1 hover:text-red-500"><Trash2 size={16}/></button></span></li>))}</ul></div>
            </div>
            <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2"><h2 className={`text-xl font-bold ${!selectedRoomId ? 'opacity-50' : ''}`}>CONTAINERS</h2><button onClick={() => createEntity('shelf')} disabled={!selectedRoomId} className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}><Plus/></button></div>
                <div className={`${ASCII_COLORS.inputBg} border-2 ${ASCII_COLORS.border} rounded-lg p-2 flex-grow min-h-[150px] max-h-[300px] overflow-y-auto`}><ul className="space-y-1">{shelves.map(s => (<li key={s.id} className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedShelfId === s.id ? 'bg-yellow-600 text-black font-bold' : 'hover:bg-gray-700'}`} onClick={() => setSelectedShelfId(s.id)}><span className="flex items-center truncate"><List className="w-4 h-4 mr-2 shrink-0"/>{s.name}</span><span className="flex items-center"><button onClick={(e) => { e.stopPropagation(); setContainerToMove(s); }} className="p-1 hover:text-blue-400" title="Move Container"><MoveUpRight size={16}/></button><button onClick={(e) => { e.stopPropagation(); renameEntity('shelf', s); }} className="p-1 hover:text-yellow-400"><Edit size={16}/></button><button onClick={(e) => { e.stopPropagation(); deleteEntity('shelf', s); }} className="p-1 hover:text-red-500"><Trash2 size={16}/></button></span></li>))}</ul></div>
            </div>
          </div>
        )}
        
        <div className={`${ASCII_COLORS.inputBg} p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
              <h2 className={`text-xl font-bold ${ASCII_COLORS.accent}`}>{displayTitle}</h2>
              <div className="flex items-center gap-2">
                {showBucketView && bucketItems.filter(i=>i.isReadyToTransfer && i.destination).length > 0 && (
                    <button onClick={handleTransferMarkedItems} className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border border-green-500 text-green-400 flex items-center`}>
                        <PackageSearch className="w-4 h-4 mr-2"/>TRANSFER ({bucketItems.filter(i=>i.isReadyToTransfer && i.destination).length})
                    </button>
                )}
                <button onClick={handleOpenAddItemModal} disabled={!showBucketView && !currentItemPath} className={`${ASCII_COLORS.buttonBg} p-2 px-4 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center`}>
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
                    currency={userProfile.currency} 
                    onMoveClick={showBucketView ? (itm) => handleEditBucketItemPath(itm as BucketItem) : (itm) => handleMoveToBucket(itm as Item)}
                    onEditClick={handleOpenEditItemModal} 
                    onDeleteClick={handleDeleteItem} 
                    onUpdateQuantity={handleUpdateQuantity}
                    onToggleTransfer={showBucketView ? handleToggleTransfer : undefined}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center py-8 opacity-70">{ (showBucketView || currentItemPath || (selectedWarehouseId && !selectedRoomId) || (selectedRoomId && !selectedShelfId) ) ? 'No items here. Add one or select a sub-location!' : 'Select a Warehouse to begin.'}</p>
            )}
         </div>
        </>
        )}
      </main>
    </div>
  );
}

export default InventoryApp;