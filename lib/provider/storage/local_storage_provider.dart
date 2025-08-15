import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../../models/warehouse.dart';
import '../../models/item.dart';

final localStorageProvider = StateNotifierProvider<LocalStorageNotifier, LocalStorageState>((ref) {
  return LocalStorageNotifier();
});

class LocalStorageState {
  final bool isInitialized;
  final List<Warehouse> warehouses;
  final String? error;

  const LocalStorageState({
    required this.isInitialized,
    required this.warehouses,
    this.error,
  });

  LocalStorageState copyWith({
    bool? isInitialized,
    List<Warehouse>? warehouses,
    String? error,
  }) {
    return LocalStorageState(
      isInitialized: isInitialized ?? this.isInitialized,
      warehouses: warehouses ?? this.warehouses,
      error: error,
    );
  }
}

class LocalStorageNotifier extends StateNotifier<LocalStorageState> {
  Database? _database;

  LocalStorageNotifier() : super(const LocalStorageState(
    isInitialized: false,
    warehouses: [],
  )) {
    _initDatabase();
  }

  Future<void> _initDatabase() async {
    try {
      final databasePath = await getDatabasesPath();
      final path = join(databasePath, 'inventory_os.db');

      _database = await openDatabase(
        path,
        version: 1,
        onCreate: _createTables,
      );

      await _loadWarehouses();
      
      state = state.copyWith(isInitialized: true);
    } catch (e) {
      state = state.copyWith(error: 'Failed to initialize database: $e');
    }
  }

  Future<void> _createTables(Database db, int version) async {
    // Warehouses table
    await db.execute('''
      CREATE TABLE warehouses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER,
        owner_id TEXT NOT NULL,
        access_level TEXT NOT NULL,
        encryption_enabled INTEGER NOT NULL,
        network_visible INTEGER NOT NULL,
        last_sync INTEGER,
        sync_version INTEGER NOT NULL
      )
    ''');

    // Rooms table
    await db.execute('''
      CREATE TABLE rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        created_at INTEGER,
        owner_id TEXT NOT NULL,
        is_public INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        last_modified_at INTEGER,
        last_modified_by TEXT,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE
      )
    ''');

    // Shelves table
    await db.execute('''
      CREATE TABLE shelves (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        room_id TEXT NOT NULL,
        created_at INTEGER,
        owner_id TEXT NOT NULL,
        is_public INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        last_modified_at INTEGER,
        last_modified_by TEXT,
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
      )
    ''');

    // Items table
    await db.execute('''
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        quantity INTEGER NOT NULL,
        unit TEXT,
        price REAL,
        currency TEXT,
        purchase_date TEXT,
        expiry_date TEXT,
        priority TEXT NOT NULL,
        description TEXT,
        labels TEXT,
        barcode TEXT,
        shelf_id TEXT NOT NULL,
        created_at INTEGER,
        owner_id TEXT NOT NULL,
        is_public INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        last_modified_at INTEGER,
        last_modified_by TEXT,
        FOREIGN KEY (shelf_id) REFERENCES shelves (id) ON DELETE CASCADE
      )
    ''');

    // User permissions table
    await db.execute('''
      CREATE TABLE user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        warehouse_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        granted_at INTEGER NOT NULL,
        granted_by TEXT NOT NULL,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE,
        UNIQUE(warehouse_id, user_id)
      )
    ''');
  }

  Future<void> _loadWarehouses() async {
    if (_database == null) return;

    try {
      final warehousesData = await _database!.query('warehouses');
      final warehouses = <Warehouse>[];

      for (final warehouseData in warehousesData) {
        // Load rooms for this warehouse
        final roomsData = await _database!.query(
          'rooms',
          where: 'warehouse_id = ?',
          whereArgs: [warehouseData['id']],
        );

        final rooms = <Room>[];
        for (final roomData in roomsData) {
          // Load shelves for this room
          final shelvesData = await _database!.query(
            'shelves',
            where: 'room_id = ?',
            whereArgs: [roomData['id']],
          );

          final shelves = <Shelf>[];
          for (final shelfData in shelvesData) {
            // Load items for this shelf
            final itemsData = await _database!.query(
              'items',
              where: 'shelf_id = ?',
              whereArgs: [shelfData['id']],
            );

            final items = itemsData.map((itemData) => Item(
              id: itemData['id'] as String,
              name: itemData['name'] as String,
              category: itemData['category'] as String?,
              quantity: itemData['quantity'] as int,
              unit: itemData['unit'] != null ? Unit.values.firstWhere(
                (e) => e.toString() == 'Unit.${itemData['unit']}',
                orElse: () => Unit.pcs,
              ) : null,
              price: itemData['price'] as double?,
              currency: itemData['currency'] as String?,
              purchaseDate: itemData['purchase_date'] as String?,
              expiryDate: itemData['expiry_date'] as String?,
              priority: Priority.values.firstWhere(
                (e) => e.toString() == 'Priority.${itemData['priority']}',
              ),
              description: itemData['description'] as String?,
              labels: itemData['labels'] != null ? 
                (itemData['labels'] as String).split(',') : null,
              barcode: itemData['barcode'] as String?,
              createdAt: itemData['created_at'] != null ? 
                DateTime.fromMillisecondsSinceEpoch(itemData['created_at'] as int) : null,
              ownerId: itemData['owner_id'] as String,
              isPublic: (itemData['is_public'] as int) == 1,
              createdBy: itemData['created_by'] as String,
              lastModifiedAt: itemData['last_modified_at'] != null ?
                DateTime.fromMillisecondsSinceEpoch(itemData['last_modified_at'] as int) : null,
              lastModifiedBy: itemData['last_modified_by'] as String?,
            )).toList();

            shelves.add(Shelf(
              id: shelfData['id'] as String,
              name: shelfData['name'] as String,
              createdAt: shelfData['created_at'] != null ?
                DateTime.fromMillisecondsSinceEpoch(shelfData['created_at'] as int) : null,
              items: items,
              ownerId: shelfData['owner_id'] as String,
              isPublic: (shelfData['is_public'] as int) == 1,
              createdBy: shelfData['created_by'] as String,
              lastModifiedAt: shelfData['last_modified_at'] != null ?
                DateTime.fromMillisecondsSinceEpoch(shelfData['last_modified_at'] as int) : null,
              lastModifiedBy: shelfData['last_modified_by'] as String?,
            ));
          }

          rooms.add(Room(
            id: roomData['id'] as String,
            name: roomData['name'] as String,
            createdAt: roomData['created_at'] != null ?
              DateTime.fromMillisecondsSinceEpoch(roomData['created_at'] as int) : null,
            shelves: shelves,
            ownerId: roomData['owner_id'] as String,
            isPublic: (roomData['is_public'] as int) == 1,
            createdBy: roomData['created_by'] as String,
            lastModifiedAt: roomData['last_modified_at'] != null ?
              DateTime.fromMillisecondsSinceEpoch(roomData['last_modified_at'] as int) : null,
            lastModifiedBy: roomData['last_modified_by'] as String?,
          ));
        }

        // Load permissions for this warehouse
        final permissionsData = await _database!.query(
          'user_permissions',
          where: 'warehouse_id = ?',
          whereArgs: [warehouseData['id']],
        );

        final permissions = permissionsData.map((permData) => UserPermission(
          userId: permData['user_id'] as String,
          role: UserRole.values.firstWhere(
            (e) => e.toString() == 'UserRole.${permData['role']}',
          ),
          grantedAt: DateTime.fromMillisecondsSinceEpoch(permData['granted_at'] as int),
          grantedBy: permData['granted_by'] as String,
        )).toList();

        warehouses.add(Warehouse(
          id: warehouseData['id'] as String,
          name: warehouseData['name'] as String,
          createdAt: warehouseData['created_at'] != null ?
            DateTime.fromMillisecondsSinceEpoch(warehouseData['created_at'] as int) : null,
          rooms: rooms,
          ownerId: warehouseData['owner_id'] as String,
          accessControl: WarehouseAccessControl(
            accessLevel: AccessLevel.values.firstWhere(
              (e) => e.toString() == 'AccessLevel.${warehouseData['access_level']}',
            ),
            permissions: permissions,
            encryptionEnabled: (warehouseData['encryption_enabled'] as int) == 1,
          ),
          networkVisible: (warehouseData['network_visible'] as int) == 1,
          lastSync: warehouseData['last_sync'] != null ?
            DateTime.fromMillisecondsSinceEpoch(warehouseData['last_sync'] as int) : null,
          syncVersion: warehouseData['sync_version'] as int,
        ));
      }

      state = state.copyWith(warehouses: warehouses);
    } catch (e) {
      state = state.copyWith(error: 'Failed to load warehouses: $e');
    }
  }

  Future<void> saveWarehouse(Warehouse warehouse) async {
    if (_database == null) return;

    try {
      await _database!.transaction((txn) async {
        // Insert warehouse
        await txn.insert(
          'warehouses',
          {
            'id': warehouse.id,
            'name': warehouse.name,
            'created_at': warehouse.createdAt?.millisecondsSinceEpoch,
            'owner_id': warehouse.ownerId,
            'access_level': warehouse.accessControl.accessLevel.toString().split('.').last,
            'encryption_enabled': warehouse.accessControl.encryptionEnabled ? 1 : 0,
            'network_visible': warehouse.networkVisible ? 1 : 0,
            'last_sync': warehouse.lastSync?.millisecondsSinceEpoch,
            'sync_version': warehouse.syncVersion,
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );

        // Insert permissions
        for (final permission in warehouse.accessControl.permissions) {
          await txn.insert(
            'user_permissions',
            {
              'warehouse_id': warehouse.id,
              'user_id': permission.userId,
              'role': permission.role.toString().split('.').last,
              'granted_at': permission.grantedAt.millisecondsSinceEpoch,
              'granted_by': permission.grantedBy,
            },
            conflictAlgorithm: ConflictAlgorithm.replace,
          );
        }

        // Insert rooms, shelves, and items
        if (warehouse.rooms != null) {
          for (final room in warehouse.rooms!) {
            await txn.insert(
              'rooms',
              {
                'id': room.id,
                'name': room.name,
                'warehouse_id': warehouse.id,
                'created_at': room.createdAt?.millisecondsSinceEpoch,
                'owner_id': room.ownerId,
                'is_public': room.isPublic ? 1 : 0,
                'created_by': room.createdBy,
                'last_modified_at': room.lastModifiedAt?.millisecondsSinceEpoch,
                'last_modified_by': room.lastModifiedBy,
              },
              conflictAlgorithm: ConflictAlgorithm.replace,
            );

            if (room.shelves != null) {
              for (final shelf in room.shelves!) {
                await txn.insert(
                  'shelves',
                  {
                    'id': shelf.id,
                    'name': shelf.name,
                    'room_id': room.id,
                    'created_at': shelf.createdAt?.millisecondsSinceEpoch,
                    'owner_id': shelf.ownerId,
                    'is_public': shelf.isPublic ? 1 : 0,
                    'created_by': shelf.createdBy,
                    'last_modified_at': shelf.lastModifiedAt?.millisecondsSinceEpoch,
                    'last_modified_by': shelf.lastModifiedBy,
                  },
                  conflictAlgorithm: ConflictAlgorithm.replace,
                );

                if (shelf.items != null) {
                  for (final item in shelf.items!) {
                    await txn.insert(
                      'items',
                      {
                        'id': item.id,
                        'name': item.name,
                        'category': item.category,
                        'quantity': item.quantity,
                        'unit': item.unit?.toString().split('.').last,
                        'price': item.price,
                        'currency': item.currency,
                        'purchase_date': item.purchaseDate,
                        'expiry_date': item.expiryDate,
                        'priority': item.priority.toString().split('.').last,
                        'description': item.description,
                        'labels': item.labels?.join(','),
                        'barcode': item.barcode,
                        'shelf_id': shelf.id,
                        'created_at': item.createdAt?.millisecondsSinceEpoch,
                        'owner_id': item.ownerId,
                        'is_public': item.isPublic ? 1 : 0,
                        'created_by': item.createdBy,
                        'last_modified_at': item.lastModifiedAt?.millisecondsSinceEpoch,
                        'last_modified_by': item.lastModifiedBy,
                      },
                      conflictAlgorithm: ConflictAlgorithm.replace,
                    );
                  }
                }
              }
            }
          }
        }
      });

      await _loadWarehouses();
    } catch (e) {
      state = state.copyWith(error: 'Failed to save warehouse: $e');
    }
  }

  Future<void> clearAllData() async {
    if (_database == null) return;

    try {
      await _database!.transaction((txn) async {
        // Удаляем все данные в правильном порядке (учитывая foreign keys)
        await txn.delete('items');
        await txn.delete('shelves');
        await txn.delete('rooms');
        await txn.delete('user_permissions');
        await txn.delete('warehouses');
      });

      // Обновляем состояние
      state = state.copyWith(warehouses: []);
    } catch (e) {
      state = state.copyWith(error: 'Failed to clear data: $e');
      rethrow;
    }
  }

  @override
  void dispose() {
    _database?.close();
    super.dispose();
  }
}