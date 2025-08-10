import { v4 as uuidv4 } from 'uuid';
import * as localStorageService from './localStorageService';
import { Warehouse, Room, Shelf, Item, ShoppingListItem } from '../types';

type EntityPath = { warehouseId: string; roomId?: string; shelfId?: string };

export interface ExportBundle {
  version: string;
  exportedAt: string;
  warehouses: Warehouse[];
  bucketItems: Item[];
  shoppingList: ShoppingListItem[];
}

export interface IdConflict {
  entityType: 'warehouse' | 'room' | 'shelf' | 'item' | 'bucketItem' | 'shoppingItem';
  id: string;
  name?: string;
  path?: string;
}

export interface ImportReport {
  importedCounts: Record<string, number>;
  skippedCounts: Record<string, number>;
}

export const exportAll = (): ExportBundle => {
  const warehouses = localStorageService.getWarehouses();
  const bucketItems = localStorageService.getBucketItems();
  const shoppingList = localStorageService.getShoppingList();
  const bundle: ExportBundle = {
    version: '2.6',
    exportedAt: new Date().toISOString(),
    warehouses: JSON.parse(JSON.stringify(warehouses)),
    bucketItems: JSON.parse(JSON.stringify(bucketItems as any)),
    shoppingList: JSON.parse(JSON.stringify(shoppingList)),
  };
  return bundle;
};

export interface ImportOptions {
  onConflict: (conflict: IdConflict) => 'skip' | 'overwrite' | 'newId';
}

export const detectConflicts = (bundle: ExportBundle): IdConflict[] => {
  const conflicts: IdConflict[] = [];
  const existingWarehouses = localStorageService.getWarehouses();
  const whIds = new Set(existingWarehouses.map((w) => w.id));
  const roomIds = new Set(existingWarehouses.flatMap((w) => w.rooms?.map((r) => r.id) || []));
  const shelfIds = new Set(existingWarehouses.flatMap((w) => w.rooms?.flatMap((r) => r.shelves?.map((s) => s.id) || []) || []));
  const itemIds = new Set(
    existingWarehouses.flatMap((w) => w.rooms?.flatMap((r) => r.shelves?.flatMap((s) => s.items?.map((i) => i.id) || []) || []) || [])
  );
  const bucketItemIds = new Set(localStorageService.getBucketItems().map((b) => b.id));
  const shoppingIds = new Set(localStorageService.getShoppingList().map((s) => s.id));

  bundle.warehouses.forEach((w) => {
    if (whIds.has(w.id)) conflicts.push({ entityType: 'warehouse', id: w.id, name: w.name });
    w.rooms?.forEach((r) => {
      if (roomIds.has(r.id)) conflicts.push({ entityType: 'room', id: r.id, name: r.name, path: `${w.name}` });
      r.shelves?.forEach((s) => {
        if (shelfIds.has(s.id)) conflicts.push({ entityType: 'shelf', id: s.id, name: s.name, path: `${w.name} > ${r.name}` });
        s.items?.forEach((i) => {
          if (itemIds.has(i.id)) conflicts.push({ entityType: 'item', id: i.id, name: i.name, path: `${w.name} > ${r.name} > ${s.name}` });
        });
      });
    });
  });

  bundle.bucketItems.forEach((b) => {
    if (bucketItemIds.has(b.id)) conflicts.push({ entityType: 'bucketItem', id: b.id, name: b.name });
  });
  bundle.shoppingList.forEach((s) => {
    if (shoppingIds.has(s.id)) conflicts.push({ entityType: 'shoppingItem', id: s.id, name: s.name });
  });
  return conflicts;
};

export const importBundle = (bundle: ExportBundle, options: ImportOptions): ImportReport => {
  const report: ImportReport = { importedCounts: {}, skippedCounts: {} };
  const clone = JSON.parse(JSON.stringify(bundle)) as ExportBundle;

  const conflictActionCache = new Map<string, 'skip' | 'overwrite' | 'newId'>();
  const resolveConflict = (conflict: IdConflict): 'skip' | 'overwrite' | 'newId' => {
    const key = `${conflict.entityType}:${conflict.id}`;
    if (conflictActionCache.has(key)) return conflictActionCache.get(key)!;
    const action = options.onConflict(conflict);
    conflictActionCache.set(key, action);
    return action;
  };

  // Index existing for overwrite/remove
  const existingWarehouses = localStorageService.getWarehouses();

  // Helper counters
  const bump = (map: Record<string, number>, key: string) => (map[key] = (map[key] || 0) + 1);

  // Warehouses
  for (const w of clone.warehouses) {
    let warehouseId = w.id;
    const whConflict = detectConflicts({ ...clone, warehouses: [w], bucketItems: [], shoppingList: [] });
    const thisWhConflict = whConflict.find((c) => c.entityType === 'warehouse' && c.id === w.id);
    if (thisWhConflict) {
      const action = resolveConflict(thisWhConflict);
      if (action === 'skip') {
        bump(report.skippedCounts, 'warehouses');
        continue;
      }
      if (action === 'newId') {
        warehouseId = uuidv4();
        w.id = warehouseId;
      }
      if (action === 'overwrite') {
        localStorageService.deleteWarehouse(w.id);
      }
    }
    const created = localStorageService.addWarehouse(w.name);
    // keep id
    created.id = warehouseId;
    created.createdAt = w.createdAt as any;
    // Rooms
    for (const r of w.rooms || []) {
      let roomId = r.id;
      const room = localStorageService.addRoom(created.id, r.name);
      if (detectConflicts({ ...clone, warehouses: [{ ...w, rooms: [r], name: w.name, id: created.id }] , bucketItems: [], shoppingList: [] }).some(c=>c.entityType==='room'&&c.id===r.id)){
        const action = resolveConflict({ entityType: 'room', id: r.id, name: r.name, path: w.name });
        if (action === 'skip') { bump(report.skippedCounts, 'rooms'); continue; }
        if (action === 'newId') { roomId = uuidv4(); }
      }
      room.id = roomId;
      room.createdAt = r.createdAt as any;
      // Shelves
      for (const s of r.shelves || []) {
        let shelfId = s.id;
        const shelf = localStorageService.addShelf(created.id, room.id, s.name);
        const sConflict = detectConflicts({ ...clone, warehouses: [{ ...w, rooms: [{...r, shelves:[s]}] }] , bucketItems: [], shoppingList: [] }).some(c=>c.entityType==='shelf'&&c.id===s.id);
        if (sConflict) {
          const action = resolveConflict({ entityType: 'shelf', id: s.id, name: s.name, path: `${w.name} > ${r.name}` });
          if (action === 'skip') { bump(report.skippedCounts, 'shelves'); continue; }
          if (action === 'newId') { shelfId = uuidv4(); }
        }
        shelf.id = shelfId;
        shelf.createdAt = s.createdAt as any;
        // Items
        for (const i of s.items || []) {
          let itemId = i.id;
          const iConflict = detectConflicts({ ...clone, warehouses: [{...w, rooms: [{...r, shelves: [{...s, items:[i]}]}]}], bucketItems: [], shoppingList: [] }).some(c=>c.entityType==='item'&&c.id===i.id);
          if (iConflict) {
            const action = resolveConflict({ entityType: 'item', id: i.id, name: i.name, path: `${w.name} > ${r.name} > ${s.name}` });
            if (action === 'skip') { bump(report.skippedCounts, 'items'); continue; }
            if (action === 'newId') { itemId = uuidv4(); }
          }
          const added = localStorageService.addItem(created.id, room.id, shelf.id, {
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            price: i.price,
            purchaseDate: i.purchaseDate,
            expiryDate: i.expiryDate,
            priority: i.priority,
            description: i.description,
            labels: i.labels,
            category: (i as any).category,
            // @ts-expect-error barcode optional
            barcode: (i as any).barcode,
          });
          added.id = itemId;
          added.createdAt = i.createdAt as any;
          bump(report.importedCounts, 'items');
        }
        bump(report.importedCounts, 'shelves');
      }
      bump(report.importedCounts, 'rooms');
    }
    bump(report.importedCounts, 'warehouses');
  }

  // Bucket items
  for (const b of clone.bucketItems as any[]) {
    let bucketId = b.id;
    const conflict = detectConflicts({ ...clone, warehouses: [], bucketItems: [b], shoppingList: [] }).some(c=>c.entityType==='bucketItem'&&c.id===b.id);
    if (conflict) {
      const action = options.onConflict({ entityType: 'bucketItem', id: b.id, name: b.name });
      if (action === 'skip') { bump(report.skippedCounts, 'bucketItems'); continue; }
      if (action === 'newId') { bucketId = uuidv4(); }
    }
    const created = localStorageService.addItemToBucket(b, b.originalPath || 'Imported');
    created.id = bucketId;
    bump(report.importedCounts, 'bucketItems');
  }

  // Shopping list
  for (const s of clone.shoppingList) {
    let shoppingId = s.id;
    const conflict = detectConflicts({ ...clone, warehouses: [], bucketItems: [], shoppingList: [s] }).some(c=>c.entityType==='shoppingItem'&&c.id===s.id);
    if (conflict) {
      const action = options.onConflict({ entityType: 'shoppingItem', id: s.id, name: s.name });
      if (action === 'skip') { bump(report.skippedCounts, 'shoppingList'); continue; }
      if (action === 'newId') { shoppingId = uuidv4(); }
    }
    // direct add preserving id
    localStorageService.addToShoppingList([s.name]);
    bump(report.importedCounts, 'shoppingList');
  }

  return report;
};


