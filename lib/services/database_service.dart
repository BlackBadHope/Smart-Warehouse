// SQLite database service для offline-first архитектуры
// Следуем принципам из оригинального localStorageService

import 'dart:convert';
import 'dart:io';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import '../models/warehouse.dart';

class DatabaseService {
  static DatabaseService? _instance;
  static Database? _database;

  DatabaseService._internal();
  
  factory DatabaseService() {
    _instance ??= DatabaseService._internal();
    return _instance!;
  }

  Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    Directory documentsDirectory = await getApplicationDocumentsDirectory();
    String path = join(documentsDirectory.path, 'inventory_os.db');
    
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    // Warehouses table
    await db.execute('''
      CREATE TABLE warehouses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        is_private INTEGER DEFAULT 1,
        owner_id TEXT NOT NULL,
        metadata TEXT DEFAULT '{}'
      )
    ''');

    // Rooms table
    await db.execute('''
      CREATE TABLE rooms (
        id TEXT PRIMARY KEY,
        warehouse_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE
      )
    ''');

    // Shelves table
    await db.execute('''
      CREATE TABLE shelves (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
      )
    ''');

    // Items table
    await db.execute('''
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        shelf_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        quantity INTEGER DEFAULT 1,
        price REAL,
        currency TEXT DEFAULT 'USD',
        tags TEXT DEFAULT '',
        barcode TEXT,
        image_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        custom_fields TEXT DEFAULT '{}',
        FOREIGN KEY (shelf_id) REFERENCES shelves (id) ON DELETE CASCADE
      )
    ''');

    // Create indexes для performance
    await db.execute('CREATE INDEX idx_rooms_warehouse ON rooms(warehouse_id)');
    await db.execute('CREATE INDEX idx_shelves_room ON shelves(room_id)');
    await db.execute('CREATE INDEX idx_items_shelf ON items(shelf_id)');
    await db.execute('CREATE INDEX idx_items_barcode ON items(barcode)');
  }

  // Warehouse operations
  Future<String> createWarehouse(Warehouse warehouse) async {
    final db = await database;
    final map = warehouse.toMap();
    map['metadata'] = jsonEncode(map['metadata']);
    
    await db.insert('warehouses', map);
    return warehouse.id;
  }

  Future<List<Warehouse>> getWarehouses() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query('warehouses', orderBy: 'name ASC');
    
    return List.generate(maps.length, (i) {
      final map = Map<String, dynamic>.from(maps[i]);
      map['metadata'] = jsonDecode(map['metadata'] ?? '{}');
      return Warehouse.fromMap(map);
    });
  }

  Future<Warehouse?> getWarehouse(String id) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'warehouses',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (maps.isEmpty) return null;
    
    final map = Map<String, dynamic>.from(maps.first);
    map['metadata'] = jsonDecode(map['metadata'] ?? '{}');
    return Warehouse.fromMap(map);
  }

  Future<void> updateWarehouse(Warehouse warehouse) async {
    final db = await database;
    final map = warehouse.toMap();
    map['metadata'] = jsonEncode(map['metadata']);
    
    await db.update(
      'warehouses',
      map,
      where: 'id = ?',
      whereArgs: [warehouse.id],
    );
  }

  Future<void> deleteWarehouse(String id) async {
    final db = await database;
    await db.delete(
      'warehouses',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Room operations
  Future<String> createRoom(Room room) async {
    final db = await database;
    await db.insert('rooms', room.toMap());
    return room.id;
  }

  Future<List<Room>> getRooms(String warehouseId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'rooms',
      where: 'warehouse_id = ?',
      whereArgs: [warehouseId],
      orderBy: 'name ASC',
    );
    
    return List.generate(maps.length, (i) {
      return Room.fromMap(maps[i]);
    });
  }

  Future<Room?> getRoom(String id) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'rooms',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (maps.isEmpty) return null;
    return Room.fromMap(maps.first);
  }

  Future<void> updateRoom(Room room) async {
    final db = await database;
    await db.update(
      'rooms',
      room.toMap(),
      where: 'id = ?',
      whereArgs: [room.id],
    );
  }

  Future<void> deleteRoom(String id) async {
    final db = await database;
    await db.delete(
      'rooms',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Shelf operations
  Future<String> createShelf(Shelf shelf) async {
    final db = await database;
    await db.insert('shelves', shelf.toMap());
    return shelf.id;
  }

  Future<List<Shelf>> getShelves(String roomId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'shelves',
      where: 'room_id = ?',
      whereArgs: [roomId],
      orderBy: 'name ASC',
    );
    
    return List.generate(maps.length, (i) {
      return Shelf.fromMap(maps[i]);
    });
  }

  Future<Shelf?> getShelf(String id) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'shelves',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (maps.isEmpty) return null;
    return Shelf.fromMap(maps.first);
  }

  Future<void> updateShelf(Shelf shelf) async {
    final db = await database;
    await db.update(
      'shelves',
      shelf.toMap(),
      where: 'id = ?',
      whereArgs: [shelf.id],
    );
  }

  Future<void> deleteShelf(String id) async {
    final db = await database;
    await db.delete(
      'shelves',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Item operations
  Future<String> createItem(InventoryItem item) async {
    final db = await database;
    final map = item.toMap();
    map['custom_fields'] = jsonEncode(map['custom_fields']);
    
    await db.insert('items', map);
    return item.id;
  }

  Future<List<InventoryItem>> getItems(String shelfId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'items',
      where: 'shelf_id = ?',
      whereArgs: [shelfId],
      orderBy: 'name ASC',
    );
    
    return List.generate(maps.length, (i) {
      final map = Map<String, dynamic>.from(maps[i]);
      map['custom_fields'] = jsonDecode(map['custom_fields'] ?? '{}');
      return InventoryItem.fromMap(map);
    });
  }

  Future<InventoryItem?> getItem(String id) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'items',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (maps.isEmpty) return null;
    
    final map = Map<String, dynamic>.from(maps.first);
    map['custom_fields'] = jsonDecode(map['custom_fields'] ?? '{}');
    return InventoryItem.fromMap(map);
  }

  Future<void> updateItem(InventoryItem item) async {
    final db = await database;
    final map = item.toMap();
    map['custom_fields'] = jsonEncode(map['custom_fields']);
    
    await db.update(
      'items',
      map,
      where: 'id = ?',
      whereArgs: [item.id],
    );
  }

  Future<void> deleteItem(String id) async {
    final db = await database;
    await db.delete(
      'items',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Search functionality
  Future<List<InventoryItem>> searchItems(String query) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'items',
      where: 'name LIKE ? OR description LIKE ? OR tags LIKE ?',
      whereArgs: ['%$query%', '%$query%', '%$query%'],
      orderBy: 'name ASC',
    );
    
    return List.generate(maps.length, (i) {
      final map = Map<String, dynamic>.from(maps[i]);
      map['custom_fields'] = jsonDecode(map['custom_fields'] ?? '{}');
      return InventoryItem.fromMap(map);
    });
  }

  // Statistics
  Future<int> getWarehouseItemCount(String warehouseId) async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT COUNT(*) as count FROM items i
      JOIN shelves s ON i.shelf_id = s.id
      JOIN rooms r ON s.room_id = r.id
      WHERE r.warehouse_id = ?
    ''', [warehouseId]);
    
    return result.first['count'] as int;
  }

  // Additional methods for P2P sync
  Future<List<Room>> getAllRooms() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'rooms',
      orderBy: 'created_at DESC',
    );
    
    return List.generate(maps.length, (i) {
      return Room.fromMap(Map<String, dynamic>.from(maps[i]));
    });
  }

  Future<List<Room>> getRoomsByWarehouse(String warehouseId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'rooms',
      where: 'warehouse_id = ?',
      whereArgs: [warehouseId],
      orderBy: 'created_at DESC',
    );
    
    return List.generate(maps.length, (i) {
      return Room.fromMap(Map<String, dynamic>.from(maps[i]));
    });
  }

  Future<List<InventoryItem>> getItemsByShelf(String shelfId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'items',
      where: 'shelf_id = ?',
      whereArgs: [shelfId],
      orderBy: 'created_at DESC',
    );
    
    return List.generate(maps.length, (i) {
      final map = Map<String, dynamic>.from(maps[i]);
      map['custom_fields'] = jsonDecode(map['custom_fields'] ?? '{}');
      return InventoryItem.fromMap(map);
    });
  }

  Future<Map<String, int>> getStatistics() async {
    final db = await database;
    
    final warehouseCount = await db.query('warehouses');
    final roomCount = await db.query('rooms');
    final shelfCount = await db.query('shelves');
    final itemCount = await db.query('items');
    
    return {
      'warehouses': warehouseCount.length,
      'rooms': roomCount.length,
      'shelves': shelfCount.length,
      'items': itemCount.length,
    };
  }

  // Sync helper methods
  Future<List<Warehouse>> getChangedWarehouses(int afterTimestamp) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'warehouses',
      where: 'updated_at > ?',
      whereArgs: [afterTimestamp],
      orderBy: 'updated_at DESC',
    );
    
    return List.generate(maps.length, (i) {
      final map = Map<String, dynamic>.from(maps[i]);
      map['metadata'] = jsonDecode(map['metadata'] ?? '{}');
      return Warehouse.fromMap(map);
    });
  }

  Future<List<Room>> getChangedRooms(int afterTimestamp) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'rooms',
      where: 'updated_at > ?',
      whereArgs: [afterTimestamp],
      orderBy: 'updated_at DESC',
    );
    
    return List.generate(maps.length, (i) {
      return Room.fromMap(Map<String, dynamic>.from(maps[i]));
    });
  }

  Future<List<InventoryItem>> getChangedItems(int afterTimestamp) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'items',
      where: 'updated_at > ?',
      whereArgs: [afterTimestamp],
      orderBy: 'updated_at DESC',
    );
    
    return List.generate(maps.length, (i) {
      final map = Map<String, dynamic>.from(maps[i]);
      map['custom_fields'] = jsonDecode(map['custom_fields'] ?? '{}');
      return InventoryItem.fromMap(map);
    });
  }

  // Close database
  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
    }
  }
}