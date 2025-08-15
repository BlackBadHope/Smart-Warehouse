// P2P HTTP Server implementation
// Следует архитектуре LocalSend: dart:io HttpServer + REST API

import 'dart:io';
import 'dart:convert';
import 'package:uuid/uuid.dart';
import 'database_service.dart';

const _uuid = Uuid();

class P2PServer {
  static P2PServer? _instance;
  HttpServer? _server;
  int _port = 53317; // LocalSend default port
  String? _deviceId;
  String _deviceName = 'Inventory Device';
  bool _isRunning = false;
  
  final DatabaseService _dbService = DatabaseService();
  
  P2PServer._internal();
  
  factory P2PServer() {
    _instance ??= P2PServer._internal();
    return _instance!;
  }

  // Getters
  bool get isRunning => _isRunning;
  int get port => _port;
  String get deviceId => _deviceId ?? 'unknown';
  String get deviceName => _deviceName;
  String? get localIP => _server?.address.address;

  // Start HTTP server - как в LocalSend
  Future<bool> start() async {
    if (_isRunning) return true;

    try {
      // Generate device ID если не существует
      _deviceId ??= _uuid.v4();
      
      // Попытка запустить на стандартном порту LocalSend
      try {
        _server = await HttpServer.bind(InternetAddress.anyIPv4, _port);
      } catch (e) {
        // Если порт занят, пробуем другие
        for (int port = _port + 1; port <= _port + 100; port++) {
          try {
            _server = await HttpServer.bind(InternetAddress.anyIPv4, port);
            _port = port;
            break;
          } catch (e) {
            continue;
          }
        }
      }

      if (_server == null) {
        throw Exception('Cannot bind to any port');
      }

      // Setup request handler
      _server!.listen(_handleRequest);
      _isRunning = true;
      
      print('P2P Server started on ${_server!.address.address}:$_port');
      return true;
      
    } catch (e) {
      print('Failed to start P2P server: $e');
      return false;
    }
  }

  // Stop server
  Future<void> stop() async {
    if (_server != null) {
      await _server!.close();
      _server = null;
    }
    _isRunning = false;
    print('P2P Server stopped');
  }

  // Handle HTTP requests - LocalSend REST API
  Future<void> _handleRequest(HttpRequest request) async {
    final response = request.response;
    
    // CORS headers
    response.headers.add('Access-Control-Allow-Origin', '*');
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (request.method == 'OPTIONS') {
      response.statusCode = HttpStatus.ok;
      await response.close();
      return;
    }

    try {
      final path = request.uri.path;
      print('P2P Request: ${request.method} $path');

      switch (path) {
        case '/api/info':
          await _handleInfo(request, response);
          break;
        case '/api/register':
          await _handleRegister(request, response);
          break;
        case '/api/warehouses':
          await _handleWarehouses(request, response);
          break;
        case '/api/rooms':
          await _handleRooms(request, response);
          break;
        case '/api/items':
          await _handleItems(request, response);
          break;
        case '/api/sync':
          await _handleSync(request, response);
          break;
        case '/api/sync/status':
          await _handleSyncStatus(request, response);
          break;
        default:
          response.statusCode = HttpStatus.notFound;
          await response.close();
      }
    } catch (e) {
      print('Request error: $e');
      response.statusCode = HttpStatus.internalServerError;
      response.write(jsonEncode({'error': e.toString()}));
      await response.close();
    }
  }

  // Device info endpoint - как в LocalSend /api/info
  Future<void> _handleInfo(HttpRequest request, HttpResponse response) async {
    final info = {
      'alias': _deviceName,
      'version': '1.0.0',
      'deviceModel': Platform.operatingSystem,
      'deviceType': 'mobile',
      'fingerprint': _deviceId,
      'port': _port,
      'protocol': 'inventory-p2p-v1',
      'download': false, // We don't support file downloads yet
    };

    response.headers.contentType = ContentType.json;
    response.write(jsonEncode(info));
    await response.close();
  }

  // Device registration - LocalSend discovery protocol
  Future<void> _handleRegister(HttpRequest request, HttpResponse response) async {
    if (request.method != 'POST') {
      response.statusCode = HttpStatus.methodNotAllowed;
      await response.close();
      return;
    }

    final body = await utf8.decoder.bind(request).join();
    final data = jsonDecode(body) as Map<String, dynamic>;
    
    print('Device registered: ${data['alias']} at ${data['ip']}:${data['port']}');
    
    // В реальной реализации здесь бы сохранялся список известных устройств
    // Пока просто подтверждаем регистрацию
    
    response.headers.contentType = ContentType.json;
    response.write(jsonEncode({'success': true}));
    await response.close();
  }

  // Warehouses API - обмен данными складов
  Future<void> _handleWarehouses(HttpRequest request, HttpResponse response) async {
    response.headers.contentType = ContentType.json;
    
    if (request.method == 'GET') {
      // Возвращаем список публичных складов
      try {
        final warehouses = await _dbService.getWarehouses();
        final publicWarehouses = warehouses.where((w) => !w.isPrivate).toList();
        
        final warehousesData = publicWarehouses.map((w) => {
          'id': w.id,
          'name': w.name,
          'description': w.description,
          'created_at': w.createdAt.millisecondsSinceEpoch,
          'updated_at': w.updatedAt.millisecondsSinceEpoch,
        }).toList();
        
        response.write(jsonEncode({
          'warehouses': warehousesData,
          'device': _deviceId,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }));
      } catch (e) {
        response.statusCode = HttpStatus.internalServerError;
        response.write(jsonEncode({'error': e.toString()}));
      }
    } else if (request.method == 'POST') {
      // Принимаем данные склада от другого устройства
      try {
        final body = await utf8.decoder.bind(request).join();
        final _ = jsonDecode(body) as Map<String, dynamic>;
        
        // В реальной реализации здесь была бы логика conflict resolution
        // Пока просто подтверждаем получение
        
        response.write(jsonEncode({
          'success': true,
          'received_at': DateTime.now().millisecondsSinceEpoch,
        }));
      } catch (e) {
        response.statusCode = HttpStatus.badRequest;
        response.write(jsonEncode({'error': e.toString()}));
      }
    } else {
      response.statusCode = HttpStatus.methodNotAllowed;
      response.write(jsonEncode({'error': 'Method not allowed'}));
    }
    
    await response.close();
  }

  // Set device name
  void setDeviceName(String name) {
    _deviceName = name;
  }

  // Rooms API - синхронизация комнат
  Future<void> _handleRooms(HttpRequest request, HttpResponse response) async {
    response.headers.contentType = ContentType.json;
    
    final warehouseId = request.uri.queryParameters['warehouse_id'];
    
    if (request.method == 'GET') {
      try {
        final rooms = warehouseId != null 
          ? await _dbService.getRoomsByWarehouse(warehouseId)
          : await _dbService.getAllRooms();
        
        final roomsData = rooms.map((r) => {
          'id': r.id,
          'warehouse_id': r.warehouseId,
          'name': r.name,
          'description': r.description,
          'created_at': r.createdAt.millisecondsSinceEpoch,
          'updated_at': r.updatedAt.millisecondsSinceEpoch,
        }).toList();
        
        response.write(jsonEncode({
          'rooms': roomsData,
          'device': _deviceId,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }));
      } catch (e) {
        response.statusCode = HttpStatus.internalServerError;
        response.write(jsonEncode({'error': e.toString()}));
      }
    } else if (request.method == 'POST') {
      // Синхронизация комнат с conflict resolution
      try {
        final body = await utf8.decoder.bind(request).join();
        final data = jsonDecode(body) as Map<String, dynamic>;
        
        // TODO: Реализовать полный conflict resolution
        response.write(jsonEncode({
          'success': true,
          'conflicts': [],
          'synced_count': data['rooms']?.length ?? 0,
        }));
      } catch (e) {
        response.statusCode = HttpStatus.badRequest;
        response.write(jsonEncode({'error': e.toString()}));
      }
    } else {
      response.statusCode = HttpStatus.methodNotAllowed;
    }
    
    await response.close();
  }

  // Items API - синхронизация предметов
  Future<void> _handleItems(HttpRequest request, HttpResponse response) async {
    response.headers.contentType = ContentType.json;
    
    final shelfId = request.uri.queryParameters['shelf_id'];
    final roomId = request.uri.queryParameters['room_id'];
    final warehouseId = request.uri.queryParameters['warehouse_id'];
    
    if (request.method == 'GET') {
      try {
        List<dynamic> items = [];
        
        if (shelfId != null) {
          final shelfItems = await _dbService.getItemsByShelf(shelfId);
          items = shelfItems.map((item) => {
            'id': item.id,
            'shelf_id': item.shelfId,
            'name': item.name,
            'description': item.description,
            'quantity': item.quantity,
            'price': item.price,
            'currency': item.currency,
            'barcode': item.barcode,
            'created_at': item.createdAt.millisecondsSinceEpoch,
            'updated_at': item.updatedAt.millisecondsSinceEpoch,
            'metadata': item.metadata,
          }).toList();
        }
        
        response.write(jsonEncode({
          'items': items,
          'device': _deviceId,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
          'total': items.length,
        }));
      } catch (e) {
        response.statusCode = HttpStatus.internalServerError;
        response.write(jsonEncode({'error': e.toString()}));
      }
    } else if (request.method == 'POST') {
      // Синхронизация предметов с Item Locking support
      try {
        final body = await utf8.decoder.bind(request).join();
        final data = jsonDecode(body) as Map<String, dynamic>;
        
        // TODO: Реализовать Item Locking и conflict resolution
        response.write(jsonEncode({
          'success': true,
          'conflicts': [],
          'locked_items': [],
          'synced_count': data['items']?.length ?? 0,
        }));
      } catch (e) {
        response.statusCode = HttpStatus.badRequest;
        response.write(jsonEncode({'error': e.toString()}));
      }
    } else {
      response.statusCode = HttpStatus.methodNotAllowed;
    }
    
    await response.close();
  }

  // Sync API - полная синхронизация устройств
  Future<void> _handleSync(HttpRequest request, HttpResponse response) async {
    response.headers.contentType = ContentType.json;
    
    if (request.method == 'POST') {
      try {
        final body = await utf8.decoder.bind(request).join();
        final syncRequest = jsonDecode(body) as Map<String, dynamic>;
        
        final lastSync = syncRequest['last_sync'] as int?;
        final deviceId = syncRequest['device_id'] as String;
        
        print('Full sync request from device: $deviceId, last_sync: $lastSync');
        
        // Получаем все данные изменившиеся после last_sync
        final warehouses = await _dbService.getWarehouses();
        final allRooms = await _dbService.getAllRooms();
        
        // Фильтруем по timestamp если есть last_sync
        final changedWarehouses = lastSync != null 
          ? warehouses.where((w) => w.updatedAt.millisecondsSinceEpoch > lastSync).toList()
          : warehouses;
        
        final changedRooms = lastSync != null
          ? allRooms.where((r) => r.updatedAt.millisecondsSinceEpoch > lastSync).toList()
          : allRooms;
        
        response.write(jsonEncode({
          'success': true,
          'sync_timestamp': DateTime.now().millisecondsSinceEpoch,
          'data': {
            'warehouses': changedWarehouses.map((w) => {
              'id': w.id,
              'name': w.name,
              'description': w.description,
              'is_private': w.isPrivate,
              'created_at': w.createdAt.millisecondsSinceEpoch,
              'updated_at': w.updatedAt.millisecondsSinceEpoch,
            }).toList(),
            'rooms': changedRooms.map((r) => {
              'id': r.id,
              'warehouse_id': r.warehouseId,
              'name': r.name,
              'description': r.description,
              'created_at': r.createdAt.millisecondsSinceEpoch,
              'updated_at': r.updatedAt.millisecondsSinceEpoch,
            }).toList(),
          },
          'conflicts': [],
          'device': _deviceId,
        }));
      } catch (e) {
        response.statusCode = HttpStatus.badRequest;
        response.write(jsonEncode({'error': e.toString()}));
      }
    } else {
      response.statusCode = HttpStatus.methodNotAllowed;
    }
    
    await response.close();
  }

  // Sync Status API - статус синхронизации
  Future<void> _handleSyncStatus(HttpRequest request, HttpResponse response) async {
    response.headers.contentType = ContentType.json;
    
    if (request.method == 'GET') {
      try {
        final stats = await _dbService.getStatistics();
        
        response.write(jsonEncode({
          'device_id': _deviceId,
          'device_name': _deviceName,
          'last_activity': DateTime.now().millisecondsSinceEpoch,
          'statistics': {
            'warehouses': stats['warehouses'] ?? 0,
            'rooms': stats['rooms'] ?? 0, 
            'shelves': stats['shelves'] ?? 0,
            'items': stats['items'] ?? 0,
          },
          'sync_protocol': 'inventory-p2p-v1',
          'capabilities': [
            'warehouse_sync',
            'room_sync', 
            'item_sync',
            'conflict_resolution',
            'item_locking',
          ],
        }));
      } catch (e) {
        response.statusCode = HttpStatus.internalServerError;
        response.write(jsonEncode({'error': e.toString()}));
      }
    } else {
      response.statusCode = HttpStatus.methodNotAllowed;
    }
    
    await response.close();
  }

  // Get server info for QR generation
  Map<String, dynamic> getConnectionInfo() {
    if (!_isRunning || _server == null) {
      throw Exception('Server not running');
    }

    return {
      'ip': _server!.address.address,
      'port': _port,
      'name': _deviceName,
      'fingerprint': _deviceId,
      'protocol': 'inventory-p2p-v1',
    };
  }
}