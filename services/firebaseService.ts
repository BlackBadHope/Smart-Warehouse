import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { APP_ID, FIREBASE_CONFIG, FIREBASE_CONFIG_ERROR } from '../constants';
import { Warehouse, Room, Shelf, ItemCore, Item, BucketItem, FirebaseEntity, FirestoreTimestamp, ShoppingListItem, InventorySummary, ItemLocationSummary, EntityType } from '../types';

let app: firebase.app.App | null = null;
let auth: firebase.auth.Auth | null = null;
let db: firebase.firestore.Firestore | null = null;
let S_INITIALIZATION_ERROR: string | null = null;

export const initializeFirebase = (): { 
    app: firebase.app.App | null; 
    auth: firebase.auth.Auth | null; 
    db: firebase.firestore.Firestore | null; 
    error?: string | null 
} => {
    if (app) return { app, auth, db, error: null }; 
    if (S_INITIALIZATION_ERROR) return { app: null, auth: null, db: null, error: S_INITIALIZATION_ERROR };

    if (FIREBASE_CONFIG_ERROR) {
        S_INITIALIZATION_ERROR = `Firebase Config Error: ${FIREBASE_CONFIG_ERROR}`;
        console.error(`[FirebaseService] ${S_INITIALIZATION_ERROR}`);
        return { app: null, auth: null, db: null, error: S_INITIALIZATION_ERROR };
    }

    if (!FIREBASE_CONFIG || Object.keys(FIREBASE_CONFIG).length === 0 || !FIREBASE_CONFIG.apiKey) {
        S_INITIALIZATION_ERROR = "Firebase configuration (FIREBASE_CONFIG) is empty, incomplete, or lacks critical 'apiKey'.";
        console.error(`[FirebaseService] ${S_INITIALIZATION_ERROR}`);
        return { app: null, auth: null, db: null, error: S_INITIALIZATION_ERROR };
    }

    try {
        if (!firebase.apps.length) {
            console.log("[FirebaseService] Initializing Firebase app with config:", FIREBASE_CONFIG);
            app = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
            app = firebase.app();
            console.log("[FirebaseService] Using existing Firebase app.");
        }
        auth = firebase.auth(app);
        db = firebase.firestore(app);
        S_INITIALIZATION_ERROR = null; 
        console.log("[FirebaseService] Firebase initialized successfully.");
        return { app, auth, db, error: null };
    } catch (e) {
        S_INITIALIZATION_ERROR = `Firebase Core Initialization Failed: ${e instanceof Error ? e.message : String(e)}`;
        console.error(`[FirebaseService] ${S_INITIALIZATION_ERROR}`, e);
        app = null; auth = null; db = null;
        return { app: null, auth: null, db: null, error: S_INITIALIZATION_ERROR };
    }
};

initializeFirebase(); 

export { db }; 

export const getFirebaseInitializationError = () => S_INITIALIZATION_ERROR;

export const onAuthStateChanged = (callback: (user: firebase.User | null) => void) => {
  if (!auth) {
    console.warn("[FirebaseService] Auth service not available for onAuthStateChanged. Initialization might have failed or is still in progress.");
    callback(null); 
    return () => {};
  }
  return auth.onAuthStateChanged(callback);
};

export const signInWithGoogle = async (): Promise<void> => {
  if (!auth) {
    throw new Error("[FirebaseService] Google sign-in failed: Firebase Auth not initialized.");
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    // Using signInWithRedirect instead of signInWithPopup
    await auth.signInWithRedirect(provider);
    // The result will be handled by getGoogleRedirectResult when the page reloads.
  } catch (error) {
    console.error("[FirebaseService] Error initiating Google sign-in redirect:", error);
    throw new Error(`Google sign-in initiation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getGoogleRedirectResult = async (): Promise<firebase.User | null> => {
  if (!auth) {
    // console.warn("[FirebaseService] Auth not initialized, cannot get redirect result.");
    return null; // Don't throw, as this is called on app load.
  }
  try {
    const result = await auth.getRedirectResult();
    return result.user; // Can be null if no redirect operation was pending or if it failed.
  } catch (error) {
    console.error("[FirebaseService] Error getting Google sign-in redirect result:", error);
    // Don't re-throw here, let the caller (App.tsx) handle UI based on null user
    return null;
  }
};


export const signOutUser = async (): Promise<void> => {
  if (!auth) {
    throw new Error("[FirebaseService] Sign out failed: Firebase Auth not initialized.");
  }
  await auth.signOut();
};


export const currentUserId = (): string | undefined => {
  if (!auth) {
    return undefined;
  }
  return auth.currentUser?.uid;
}

const listenToCollection = <T extends FirebaseEntity | Item | BucketItem | ShoppingListItem,>(path: string, callback: (data: T[]) => void) => {
  if (!db) {
    console.warn(`[FirebaseService] Firestore not available for listenToCollection on path: ${path}.`);
    return () => {};
  }
  const collectionRef = db.collection(path);
  return collectionRef.onSnapshot((snapshot) => {
    const items = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as T));
    callback(items);
  }, (error) => {
    console.error(`[FirebaseService] Error listening to collection ${path}:`, error);
    S_INITIALIZATION_ERROR = S_INITIALIZATION_ERROR || `Error listening to Firestore path ${path}: ${error.message}`;
  });
};

export const listenToWarehouses = (userId: string, callback: (warehouses: Warehouse[]) => void) => {
  return listenToCollection<Warehouse>(`artifacts/${APP_ID}/users/${userId}/warehouses`, callback);
};

export const listenToRooms = (userId: string, warehouseId: string, callback: (rooms: Room[]) => void) => {
  return listenToCollection<Room>(`artifacts/${APP_ID}/users/${userId}/warehouses/${warehouseId}/rooms`, callback);
};

export const listenToShelves = (userId: string, warehouseId: string, roomId: string, callback: (shelves: Shelf[]) => void) => {
  return listenToCollection<Shelf>(`artifacts/${APP_ID}/users/${userId}/warehouses/${warehouseId}/rooms/${roomId}/shelves`, callback);
};

export const listenToShelfItems = (userId: string, warehouseId: string, roomId: string, shelfId: string, callback: (items: Item[]) => void) => {
  return listenToCollection<Item>(`artifacts/${APP_ID}/users/${userId}/warehouses/${warehouseId}/rooms/${roomId}/shelves/${shelfId}/items`, callback);
};

export const listenToBucketItems = (userId: string, callback: (items: BucketItem[]) => void) => {
  return listenToCollection<BucketItem>(`artifacts/${APP_ID}/users/${userId}/bucket`, callback);
};

export const addEntity = async (path: string, name: string): Promise<firebase.firestore.DocumentReference> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for addEntity.");
  return db.collection(path).add({ name, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
};

export const updateEntityName = async (path: string, newName: string): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for updateEntityName.");
  return db.doc(path).update({ name: newName });
};

export const recursiveDelete = async (docRef: firebase.firestore.DocumentReference) => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for recursiveDelete.");
  const collectionsToDelete: string[] = ['items', 'shelves', 'rooms']; 

  for (const subCollectionName of collectionsToDelete) {
    const subCollectionRef = docRef.collection(subCollectionName);
    const snapshot = await subCollectionRef.get();
    for (const subDoc of snapshot.docs) {
      await recursiveDelete(subDoc.ref); 
    }
  }
  await docRef.delete();
};

export const deleteFsEntity = async (path: string): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for deleteFsEntity.");
  const entityRef = db.doc(path);
  return recursiveDelete(entityRef);
};

export const moveContainer = async (userId: string, oldWarehouseId: string, oldRoomId: string, container: Shelf, newRoomId: string): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for moveContainer.");
  const oldPath = `artifacts/${APP_ID}/users/${userId}/warehouses/${oldWarehouseId}/rooms/${oldRoomId}/shelves/${container.id}`;
  const newPath = `artifacts/${APP_ID}/users/${userId}/warehouses/${oldWarehouseId}/rooms/${newRoomId}/shelves/${container.id}`;
  
  const itemsSnapshot = await db.collection(`${oldPath}/items`).get();

  const batch = db.batch();
  batch.set(db.doc(newPath), { name: container.name, createdAt: container.createdAt || firebase.firestore.FieldValue.serverTimestamp() });
  
  itemsSnapshot.docs.forEach(itemDoc => {
      const newItemDocRef = db.doc(`${newPath}/items/${itemDoc.id}`);
      batch.set(newItemDocRef, itemDoc.data());
      batch.delete(itemDoc.ref);
  });

  batch.delete(db.doc(oldPath));
  await batch.commit();
};

export const addItemToPath = async (itemPath: string, itemData: ItemCore): Promise<firebase.firestore.DocumentReference> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for addItemToPath.");
  return db.collection(itemPath).add({ ...itemData, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
};

export const updateItemAtPath = async (itemPath: string, itemId: string, itemData: Partial<ItemCore>): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for updateItemAtPath.");
  return db.collection(itemPath).doc(itemId).update(itemData);
};

export const deleteItemFromPath = async (itemPath: string, itemId: string): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for deleteItemFromPath.");
  return db.collection(itemPath).doc(itemId).delete();
};

export const updateItemQuantityAtPath = async (itemPath: string, itemId: string, newQuantity: number): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for updateItemQuantityAtPath.");
  if (newQuantity < 0) newQuantity = 0;
  return db.collection(itemPath).doc(itemId).update({ quantity: newQuantity });
};

export const addItemToBucket = async (userId: string, item: Item, originalPath: string): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for addItemToBucket.");
  const bucketPath = `artifacts/${APP_ID}/users/${userId}/bucket`;
  const { id, ...itemData } = item; 
  await db.collection(bucketPath).doc(item.id).set({ ...itemData, originalPath, isReadyToTransfer: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
};

export const removeItemFromBucket = async (userId: string, itemId: string): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for removeItemFromBucket.");
  const bucketItemPath = `artifacts/${APP_ID}/users/${userId}/bucket/${itemId}`;
  await db.doc(bucketItemPath).delete();
};

export const updateBucketItem = async (userId: string, itemId: string, data: Partial<BucketItem>): Promise<void> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for updateBucketItem.");
  const bucketItemPath = `artifacts/${APP_ID}/users/${userId}/bucket/${itemId}`;
  await db.doc(bucketItemPath).update(data);
};

export const transferItemFromBucket = async (userId: string, bucketItem: BucketItem): Promise<void> => {
    if (!db) throw new Error("[FirebaseService] Firestore not available for transferItemFromBucket.");
    if (!bucketItem.destination) throw new Error("Destination not set for bucket item transfer.");

    const { warehouseId, roomId, shelfId } = bucketItem.destination;
    const targetPath = `artifacts/${APP_ID}/users/${userId}/warehouses/${warehouseId}/rooms/${roomId}/shelves/${shelfId}/items`;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, originalPath, destination, isReadyToTransfer, ...itemDataToTransfer } = bucketItem;

    const batch = db.batch();
    
    const newItemRef = db.collection(targetPath).doc(); 
    batch.set(newItemRef, {...itemDataToTransfer, createdAt: firebase.firestore.FieldValue.serverTimestamp()});

    batch.delete(db.doc(`artifacts/${APP_ID}/users/${userId}/bucket/${bucketItem.id}`));
    
    await batch.commit();
};

export const addItemsToShoppingList = async (userId: string, items: string[]): Promise<{ success: boolean; addedCount: number }> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for addItemsToShoppingList.");
  const shoppingListPath = `artifacts/${APP_ID}/users/${userId}/shoppingList`;
  const batch = db.batch();
  items.forEach(itemName => {
    const docRef = db.collection(shoppingListPath).doc(); 
    batch.set(docRef, { name: itemName, addedAt: firebase.firestore.FieldValue.serverTimestamp() });
  });
  await batch.commit();
  return { success: true, addedCount: items.length };
};

export const findEntityByNameAndType = async (
  userId: string,
  entityName: string,
  entityType: EntityType,
  parentWarehouseName?: string,
  parentRoomName?: string
): Promise<FirebaseEntity | null> => {
  if (!db) return null;
  let collectionPath = `artifacts/${APP_ID}/users/${userId}/`;
  let queryCollection: firebase.firestore.CollectionReference;

  if (entityType === 'warehouse') {
    collectionPath += 'warehouses';
    queryCollection = db.collection(collectionPath);
  } else if (entityType === 'room' && parentWarehouseName) {
    const parentWarehouse = await findEntityByNameAndType(userId, parentWarehouseName, 'warehouse');
    if (!parentWarehouse) return null;
    collectionPath += `warehouses/${parentWarehouse.id}/rooms`;
    queryCollection = db.collection(collectionPath);
  } else if (entityType === 'shelf' && parentWarehouseName && parentRoomName) {
    const parentWarehouse = await findEntityByNameAndType(userId, parentWarehouseName, 'warehouse');
    if (!parentWarehouse) return null;
    const parentRoom = await findEntityByNameAndType(userId, parentRoomName, 'room', parentWarehouseName);
    if (!parentRoom) return null;
    collectionPath += `warehouses/${parentWarehouse.id}/rooms/${parentRoom.id}/shelves`;
    queryCollection = db.collection(collectionPath);
  } else {
    return null; 
  }

  const snapshot = await queryCollection.where('name', '==', entityName).limit(1).get();
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FirebaseEntity;
};


export const findItemDetailsByName = async (
  userId: string,
  itemName: string
): Promise<{ locations: Array<{ path: string; quantity: number; name: string; id: string, unit?: string, expiryDate?: string }>; message: string; }> => {
  if (!db) {
    return { locations: [], message: "[FirebaseService] Firestore not available. Cannot perform search." };
  }

  const foundItems: Array<{ path: string; quantity: number; name: string; id: string, unit?: string, expiryDate?: string }> = [];
  let searchedLocations = 0;

  try {
    const warehousesSnapshot = await db.collection(`artifacts/${APP_ID}/users/${userId}/warehouses`).get();
    for (const whDoc of warehousesSnapshot.docs) {
      const warehouse = { id: whDoc.id, name: whDoc.data().name } as Warehouse;
      const roomsSnapshot = await whDoc.ref.collection('rooms').get();
      for (const roomDoc of roomsSnapshot.docs) {
        const room = { id: roomDoc.id, name: roomDoc.data().name } as Room;
        const shelvesSnapshot = await roomDoc.ref.collection('shelves').get();
        for (const shelfDoc of shelvesSnapshot.docs) {
          const shelf = { id: shelfDoc.id, name: shelfDoc.data().name } as Shelf;
          searchedLocations++;
          const itemsSnapshot = await shelfDoc.ref.collection('items')
            .where('name', '==', itemName) 
            .get();
          itemsSnapshot.forEach(itemDoc => {
            const itemData = itemDoc.data() as Item;
            foundItems.push({
              id: itemDoc.id,
              path: `${warehouse.name} > ${room.name} > ${shelf.name}`,
              quantity: itemData.quantity,
              name: itemData.name,
              unit: itemData.unit,
              expiryDate: itemData.expiryDate,
            });
          });
        }
      }
    }
  } catch (error) {
    console.error("Error during item search:", error);
    return { locations: [], message: `Error searching for items: ${error instanceof Error ? error.message : String(error)}` };
  }

  if (foundItems.length > 0) {
    return { locations: foundItems, message: `Found ${itemName} in ${foundItems.length} location(s) after searching ${searchedLocations} containers.` };
  }
  return { locations: [], message: `Could not find "${itemName}" after searching ${searchedLocations} containers.` };
};

export const checkItemQuantityByPath = async (itemPath: string, itemId: string): Promise<{ quantity: number; name: string; unit?: string } | null> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for checkItemQuantity.");
  const itemDoc = await db.collection(itemPath).doc(itemId).get();
  if (!itemDoc.exists) return null;
  const data = itemDoc.data() as Item;
  return { quantity: data.quantity, name: data.name, unit: data.unit };
};

export const getExpiringItems = async (userId: string, daysUntilExpiry: number = 7): Promise<ItemLocationSummary[]> => {
  if (!db) throw new Error("[FirebaseService] Firestore not available for getExpiringItems.");

  const expiringItems: ItemLocationSummary[] = [];
  const today = new Date();
  today.setHours(0,0,0,0); // Start of today
  
  const expiryLimitDate = new Date(today);
  expiryLimitDate.setDate(today.getDate() + daysUntilExpiry); // End of target day

  const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD for today
  const expiryLimitISO = expiryLimitDate.toISOString().split('T')[0]; // YYYY-MM-DD for limit day

  try {
    const warehousesSnapshot = await db.collection(`artifacts/${APP_ID}/users/${userId}/warehouses`).get();
    for (const whDoc of warehousesSnapshot.docs) {
      const warehouseName = whDoc.data().name;
      const roomsSnapshot = await whDoc.ref.collection('rooms').get();
      for (const roomDoc of roomsSnapshot.docs) {
        const roomName = roomDoc.data().name;
        const shelvesSnapshot = await roomDoc.ref.collection('shelves').get();
        for (const shelfDoc of shelvesSnapshot.docs) {
          const shelfName = shelfDoc.data().name;
          
          const itemsSnapshot = await shelfDoc.ref.collection('items')
            .where('expiryDate', '>=', todayISO) // expiryDate is today or in the future
            .where('expiryDate', '<=', expiryLimitISO) // and expiryDate is on or before the limit date
            .get();
          
          itemsSnapshot.forEach(itemDoc => {
            const itemData = itemDoc.data() as Item;
            if (itemData.expiryDate) { 
                 expiringItems.push({
                    path: `${warehouseName} > ${roomName} > ${shelfName}`,
                    itemName: itemData.name,
                    quantity: itemData.quantity,
                    unit: itemData.unit,
                    expiryDate: itemData.expiryDate,
                });
            }
          });
        }
      }
    }
  } catch (error) {
     console.error("Error fetching expiring items:", error);
     throw new Error(`Failed to fetch expiring items: ${error instanceof Error ? error.message : String(error)}`);
  }
  return expiringItems;
};

export const getInventorySummary = async (userId: string): Promise<InventorySummary> => {
    if (!db) throw new Error("[FirebaseService] Firestore not available for getInventorySummary.");

    let totalWarehouses = 0;
    let totalRooms = 0;
    let totalShelves = 0;
    let totalItems = 0;
    const itemsSample: ItemLocationSummary[] = []; 

    try {
        const warehousesSnapshot = await db.collection(`artifacts/${APP_ID}/users/${userId}/warehouses`).get();
        totalWarehouses = warehousesSnapshot.size;

        for (const whDoc of warehousesSnapshot.docs) {
            const warehouseName = whDoc.data().name;
            const roomsSnapshot = await whDoc.ref.collection('rooms').get();
            totalRooms += roomsSnapshot.size;

            for (const roomDoc of roomsSnapshot.docs) {
                const roomName = roomDoc.data().name;
                const shelvesSnapshot = await whDoc.ref.collection('shelves').get();
                totalShelves += shelvesSnapshot.size;

                for (const shelfDoc of shelvesSnapshot.docs) {
                    const shelfName = shelfDoc.data().name;
                    const itemsSnapshot = await shelfDoc.ref.collection('items').get();
                    totalItems += itemsSnapshot.size;
                    
                    itemsSnapshot.docs.slice(0, 2).forEach(itemDoc => {
                        if (itemsSample.length < 20) { 
                            const itemData = itemDoc.data() as Item;
                            itemsSample.push({
                                path: `${warehouseName} > ${roomName} > ${shelfName}`,
                                itemName: itemData.name,
                                quantity: itemData.quantity,
                                unit: itemData.unit,
                                expiryDate: itemData.expiryDate,
                            });
                        }
                    });
                }
            }
        }
        
        const expiringSoon = await getExpiringItems(userId, 7); 

        return {
            totalWarehouses,
            totalRooms,
            totalShelves,
            totalItems,
            items: itemsSample,
            expiringSoon,
        };

    } catch (error) {
        console.error("Error generating inventory summary:", error);
        throw new Error(`Failed to generate inventory summary: ${error instanceof Error ? error.message : String(error)}`);
    }
};