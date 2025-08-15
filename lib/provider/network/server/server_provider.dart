import 'dart:io';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../device_identity_provider.dart';
import '../../storage/local_storage_provider.dart';
import '../../access/access_request_provider.dart';
import '../../../models/warehouse.dart';

final serverProvider = StateNotifierProvider<ServerNotifier, ServerState>((ref) {
  return ServerNotifier(ref);
});

class ServerState {
  final bool isRunning;
  final int? port;
  final String? error;
  final List<String> logs;

  const ServerState({
    required this.isRunning,
    this.port,
    this.error,
    required this.logs,
  });

  ServerState copyWith({
    bool? isRunning,
    int? port,
    String? error,
    List<String>? logs,
  }) {
    return ServerState(
      isRunning: isRunning ?? this.isRunning,
      port: port ?? this.port,
      error: error,
      logs: logs ?? this.logs,
    );
  }
}

class ServerNotifier extends StateNotifier<ServerState> {
  final Ref _ref;
  HttpServer? _server;
  
  ServerNotifier(this._ref) : super(const ServerState(
    isRunning: false,
    logs: [],
  ));

  Future<bool> startServer() async {
    if (state.isRunning) return true;

    try {
      _addLog('Starting HTTP server...');
      
      // Start server on random available port (like LocalSend)
      _server = await HttpServer.bind(InternetAddress.anyIPv4, 0);
      
      final port = _server!.port;
      _addLog('Server started on port $port');
      
      // Listen for requests
      _server!.listen(_handleRequest);
      
      state = state.copyWith(
        isRunning: true,
        port: port,
        error: null,
      );

      // Announce device to network (multicast)
      await _announceDevice();
      
      return true;
    } catch (e) {
      _addLog('Failed to start server: $e');
      state = state.copyWith(error: 'Failed to start server: $e');
      return false;
    }
  }

  Future<void> stopServer() async {
    if (!state.isRunning || _server == null) return;

    try {
      _addLog('Stopping HTTP server...');
      
      await _server!.close();
      _server = null;
      
      state = state.copyWith(
        isRunning: false,
        port: null,
        error: null,
      );
      
      _addLog('Server stopped');
    } catch (e) {
      _addLog('Error stopping server: $e');
      state = state.copyWith(error: 'Error stopping server: $e');
    }
  }

  void _handleRequest(HttpRequest request) {
    final uri = request.uri;
    final method = request.method;
    
    _addLog('$method ${uri.path} from ${request.connectionInfo?.remoteAddress}');

    try {
      switch (uri.path) {
        case '/api/v1/info':
          _handleDeviceInfo(request);
          break;
        case '/api/v1/warehouses':
          _handleWarehousesRequest(request);
          break;
        case '/api/v1/access-request':
          _handleAccessRequest(request);
          break;
        case '/api/v1/role-invite':
          _handleRoleInvite(request);
          break;
        case '/api/v1/role-response':
          _handleRoleResponse(request);
          break;
        case '/api/v1/ping':
          _handlePing(request);
          break;
        default:
          _handleNotFound(request);
      }
    } catch (e) {
      _addLog('Error handling request: $e');
      _sendErrorResponse(request, 500, 'Internal server error');
    }
  }

  void _handleDeviceInfo(HttpRequest request) {
    final device = _ref.read(deviceIdentityProvider);
    
    if (device == null) {
      _sendErrorResponse(request, 500, 'Device not initialized');
      return;
    }

    final response = {
      'id': device.id,
      'name': device.name,
      'ip': device.ipAddress,
      'port': device.port,
      'capabilities': ['connection'], // Только базовое соединение
      'timestamp': DateTime.now().millisecondsSinceEpoch,
      'version': '2.6.0',
      'platform': 'flutter',
      'connection_only': true, // Флаг что это только соединение
    };

    _sendJsonResponse(request, response);
  }

  void _handleWarehousesRequest(HttpRequest request) {
    if (request.method != 'GET') {
      _sendErrorResponse(request, 405, 'Method not allowed');
      return;
    }

    try {
      final storageState = _ref.read(localStorageProvider);
      
      // Возвращаем только публичные склады, видимые в сети
      final publicWarehouses = storageState.warehouses
          .where((warehouse) => 
            warehouse.accessControl.accessLevel == AccessLevel.public &&
            warehouse.networkVisible
          )
          .map((warehouse) => {
            'id': warehouse.id,
            'name': warehouse.name,
            'createdAt': warehouse.createdAt?.toIso8601String() ?? DateTime.now().toIso8601String(),
            'ownerId': warehouse.ownerId,
            'accessLevel': warehouse.accessControl.accessLevel.toString(),
            'encryptionEnabled': warehouse.accessControl.encryptionEnabled,
            'syncVersion': warehouse.syncVersion,
            'roomCount': warehouse.rooms?.length ?? 0,
            'itemCount': _getWarehouseItemCount(warehouse),
          })
          .toList();

      final response = {
        'warehouses': publicWarehouses,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };

      _sendJsonResponse(request, response);
    } catch (e) {
      _addLog('Error handling warehouses request: $e');
      _sendErrorResponse(request, 500, 'Failed to get warehouses');
    }
  }

  Future<void> _handleAccessRequest(HttpRequest request) async {
    if (request.method != 'POST') {
      _sendErrorResponse(request, 405, 'Method not allowed');
      return;
    }

    try {
      final body = await _readRequestBody(request);
      final data = jsonDecode(body);
      
      final warehouseId = data['warehouseId'] as String?;
      final requesterId = data['requesterId'] as String?;
      final requesterName = data['requesterName'] as String?;
      final requesterIp = data['requesterIp'] as String?;
      final message = data['message'] as String?;

      if (warehouseId == null || requesterId == null || requesterName == null || requesterIp == null) {
        _sendErrorResponse(request, 400, 'Missing required fields');
        return;
      }

      // Найти склад
      final storageState = _ref.read(localStorageProvider);
      final warehouse = storageState.warehouses
          .where((w) => w.id == warehouseId)
          .firstOrNull;

      if (warehouse == null) {
        _sendErrorResponse(request, 404, 'Warehouse not found');
        return;
      }

      // Проверить, что склад приватный
      if (warehouse.accessControl.accessLevel != AccessLevel.private) {
        _sendErrorResponse(request, 400, 'Warehouse is not private');
        return;
      }

      // Создать запрос доступа
      final accessRequestNotifier = _ref.read(accessRequestProvider.notifier);
      await accessRequestNotifier.createAccessRequest(
        warehouseId: warehouseId,
        warehouseName: warehouse.name,
        requesterId: requesterId,
        requesterName: requesterName,
        requesterIp: requesterIp,
        message: message,
      );

      _addLog('Access request created from $requesterName ($requesterIp) for warehouse ${warehouse.name}');

      final response = {
        'status': 'request_created',
        'message': 'Access request sent to warehouse owner',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };

      _sendJsonResponse(request, response);
    } catch (e) {
      _addLog('Error handling access request: $e');
      _sendErrorResponse(request, 400, 'Failed to process access request');
    }
  }

  Future<void> _handleRoleInvite(HttpRequest request) async {
    if (request.method != 'POST') {
      _sendErrorResponse(request, 405, 'Method not allowed');
      return;
    }

    try {
      final body = await _readRequestBody(request);
      final data = jsonDecode(body);
      
      final warehouseId = data['warehouseId'] as String?;
      final inviteId = data['inviteId'] as String?;
      final inviterName = data['inviterName'] as String?;
      final inviterIp = data['inviterIp'] as String?;
      final role = data['role'] as String?;
      final message = data['message'] as String?;

      if (warehouseId == null || inviteId == null || inviterName == null || role == null) {
        _sendErrorResponse(request, 400, 'Missing required fields');
        return;
      }

      // Найти склад
      final storageState = _ref.read(localStorageProvider);
      final warehouse = storageState.warehouses
          .where((w) => w.id == warehouseId)
          .firstOrNull;

      if (warehouse == null) {
        _sendErrorResponse(request, 404, 'Warehouse not found');
        return;
      }

      _addLog('Role invite received from $inviterName ($inviterIp) for warehouse ${warehouse.name} as $role');

      // TODO: Сохранить приглашение для показа пользователю
      
      final response = {
        'status': 'invite_received',
        'warehouseName': warehouse.name,
        'message': 'Role invitation received',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };

      _sendJsonResponse(request, response);
    } catch (e) {
      _addLog('Error handling role invite: $e');
      _sendErrorResponse(request, 400, 'Failed to process role invite');
    }
  }

  Future<void> _handleRoleResponse(HttpRequest request) async {
    if (request.method != 'POST') {
      _sendErrorResponse(request, 405, 'Method not allowed');
      return;
    }

    try {
      final body = await _readRequestBody(request);
      final data = jsonDecode(body);
      
      final inviteId = data['inviteId'] as String?;
      final accepted = data['accepted'] as bool?;
      final responderId = data['responderId'] as String?;
      final responderName = data['responderName'] as String?;

      if (inviteId == null || accepted == null || responderId == null || responderName == null) {
        _sendErrorResponse(request, 400, 'Missing required fields');
        return;
      }

      _addLog('Role response received: ${accepted ? 'ACCEPTED' : 'DECLINED'} from $responderName');

      // TODO: Обработать ответ на приглашение

      final response = {
        'status': 'response_processed',
        'message': 'Role response processed',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };

      _sendJsonResponse(request, response);
    } catch (e) {
      _addLog('Error handling role response: $e');
      _sendErrorResponse(request, 400, 'Failed to process role response');
    }
  }

  int _getWarehouseItemCount(Warehouse warehouse) {
    int total = 0;
    for (final room in warehouse.rooms ?? []) {
      for (final shelf in room.shelves ?? []) {
        total += (shelf.items?.length ?? 0) as int;
      }
    }
    return total;
  }

  void _handlePing(HttpRequest request) {
    final response = {
      'type': 'pong',
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };

    _sendJsonResponse(request, response);
  }

  void _handleNotFound(HttpRequest request) {
    _sendErrorResponse(request, 404, 'Not found');
  }

  Future<String> _readRequestBody(HttpRequest request) async {
    final completer = <int>[];
    await for (final data in request) {
      completer.addAll(data);
    }
    return utf8.decode(completer);
  }

  void _sendJsonResponse(HttpRequest request, Map<String, dynamic> data) {
    request.response
      ..headers.contentType = ContentType.json
      ..headers.add('Access-Control-Allow-Origin', '*')
      ..headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      ..headers.add('Access-Control-Allow-Headers', 'Content-Type')
      ..write(jsonEncode(data))
      ..close();
  }

  void _sendErrorResponse(HttpRequest request, int statusCode, String message) {
    request.response
      ..statusCode = statusCode
      ..headers.contentType = ContentType.json
      ..headers.add('Access-Control-Allow-Origin', '*')
      ..write(jsonEncode({'error': message}))
      ..close();
  }

  Future<void> _announceDevice() async {
    try {
      final device = _ref.read(deviceIdentityProvider);
      if (device == null) return;

      // Create UDP socket for multicast announcement (like LocalSend)
      final socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);
      
      // Получаем количество публичных складов для объявления
      final storageState = _ref.read(localStorageProvider);
      final publicWarehouseCount = storageState.warehouses
          .where((w) => w.accessControl.accessLevel == AccessLevel.public && w.networkVisible)
          .length;

      final announcement = {
        'id': device.id,
        'name': device.name,
        'ip': device.ipAddress,
        'port': state.port,
        'capabilities': ['warehouses', 'access-requests'], // Поддержка складов и запросов доступа
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'publicWarehouses': publicWarehouseCount,
      };

      final data = utf8.encode(jsonEncode(announcement));
      
      // Send to multicast address (same as LocalSend)
      socket.send(data, InternetAddress('224.0.0.167'), 53317);
      
      socket.close();
      
      _addLog('Device announced to network');
    } catch (e) {
      _addLog('Failed to announce device: $e');
    }
  }

  void _addLog(String message) {
    final timestamp = DateTime.now().toString().substring(11, 19);
    final logMessage = '[$timestamp] $message';
    
    final newLogs = [...state.logs, logMessage];
    
    // Keep only last 50 log entries
    final logs = newLogs.length > 50 ? newLogs.sublist(newLogs.length - 50) : newLogs;
    
    state = state.copyWith(logs: logs);
  }

  @override
  void dispose() {
    _server?.close();
    super.dispose();
  }
}