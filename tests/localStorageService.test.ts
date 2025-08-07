import { describe, it, expect, beforeEach } from 'vitest';
import * as store from '../services/localStorageService';

describe('localStorageService', () => {
  beforeEach(() => {
    store.__resetLocalDataForTests();
  });

  it('creates warehouse/room/shelf and adds item', () => {
    const wh = store.addWarehouse('Main');
    const room = store.addRoom(wh.id, 'Kitchen');
    const sh = store.addShelf(wh.id, room.id, 'Pantry');
    const item = store.addItem(wh.id, room.id, sh.id, { name: 'Apple', quantity: 5, priority: 'Normal', unit: 'pcs' });

    const items = store.getItems(wh.id, room.id, sh.id);
    expect(items.find(i => i.id === item.id)).toBeTruthy();
  });

  it('moves shelf between rooms', () => {
    const wh = store.addWarehouse('Main');
    const r1 = store.addRoom(wh.id, 'Kitchen');
    const r2 = store.addRoom(wh.id, 'Storage');
    const sh = store.addShelf(wh.id, r1.id, 'Box A');

    store.moveShelf(wh.id, r1.id, sh.id, r2.id);
    const shelvesInR2 = store.getShelves(wh.id, r2.id);
    expect(shelvesInR2.find(s => s.id === sh.id)).toBeTruthy();
  });

  it('bucket transfer', () => {
    const wh = store.addWarehouse('Main');
    const room = store.addRoom(wh.id, 'Kitchen');
    const sh = store.addShelf(wh.id, room.id, 'Pantry');
    const item = store.addItem(wh.id, room.id, sh.id, { name: 'Milk', quantity: 1, priority: 'Normal', unit: 'l' });

    const bucketItem = store.addItemToBucket(item as any, 'test');
    store.updateBucketItem(bucketItem.id, { destination: { warehouseId: wh.id, roomId: room.id, shelfId: sh.id, warehouseName: 'Main', roomName: 'Kitchen', shelfName: 'Pantry' } });
    store.transferBucketItem({ ...bucketItem, destination: { warehouseId: wh.id, roomId: room.id, shelfId: sh.id } } as any);

    const items = store.getItems(wh.id, room.id, sh.id);
    expect(items.find(i => i.name === 'Milk')).toBeTruthy();
  });
});


