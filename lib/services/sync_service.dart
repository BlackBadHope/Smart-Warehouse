// P2P Sync Service - клиентская часть синхронизации
// Отправляет запросы на другие устройства для обмена данными

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'database_service.dart';
import 'device_discovery.dart';

class SyncService {
  static SyncService? _instance;
  final DatabaseService _dbService = DatabaseService();
  final DeviceDiscovery _deviceDiscovery = DeviceDiscovery();
  
  SyncService._internal();
  
  factory SyncService() {
    _instance ??= SyncService._internal();
    return _instance!;
  }

  // Синхронизация с конкретным устройством
  Future<SyncResult> syncWithDevice(DeviceInfo device) async {
    try {
      print('Starting sync with ${device.name} at ${device.ip}:${device.port}');
      
      // 1. Получить статус синхронизации удаленного устройства
      final remoteStatus = await _getRemoteStatus(device);
      if (remoteStatus == null) {
        return SyncResult.error('Failed to get remote device status');
      }
      
      // 2. Получить последнюю дату синхронизации с этим устройством
      final lastSync = await _getLastSyncTimestamp(device.id);
      
      // 3. Отправить запрос на полную синхронизацию
      final syncResponse = await _requestFullSync(device, lastSync);
      if (syncResponse == null) {
        return SyncResult.error('Failed to sync data');
      }
      
      // 4. Применить полученные данные локально
      final applyResult = await _applyRemoteData(syncResponse);
      
      // 5. Отправить наши изменения на удаленное устройство
      final pushResult = await _pushLocalChanges(device, lastSync);
      
      // 6. Сохранить новый timestamp синхронизации
      await _updateLastSyncTimestamp(
        device.id, 
        syncResponse['sync_timestamp'],
      );
      
      return SyncResult.success(
        warehouses: applyResult.warehouses,
        rooms: applyResult.rooms,
        items: applyResult.items,
        conflicts: applyResult.conflicts,
      );
      
    } catch (e) {
      print('Sync error with ${device.name}: $e');
      return SyncResult.error(e.toString());
    }
  }

  // Получить статус удаленного устройства
  Future<Map<String, dynamic>?> _getRemoteStatus(DeviceInfo device) async {
    try {
      final response = await http.get(
        Uri.parse('http://${device.ip}:${device.port}/api/sync/status'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print('Failed to get remote status: $e');
      return null;
    }
  }

  // Запросить полную синхронизацию
  Future<Map<String, dynamic>?> _requestFullSync(
    DeviceInfo device, 
    int? lastSync,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('http://${device.ip}:${device.port}/api/sync'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'device_id': device.id,
          'last_sync': lastSync,
          'request_timestamp': DateTime.now().millisecondsSinceEpoch,
        }),
      ).timeout(const Duration(seconds: 30));
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print('Failed to request sync: $e');
      return null;
    }
  }

  // Применить данные с удаленного устройства
  Future<ApplyResult> _applyRemoteData(Map<String, dynamic> syncData) async {
    int warehousesApplied = 0;
    int roomsApplied = 0;
    int itemsApplied = 0;
    List<ConflictInfo> conflicts = [];
    
    try {
      final data = syncData['data'] as Map<String, dynamic>;
      
      // Применить warehouses
      if (data.containsKey('warehouses')) {
        final warehouses = data['warehouses'] as List;
        for (final warehouseData in warehouses) {
          final result = await _applyWarehouse(warehouseData);
          if (result.applied) warehousesApplied++;
          if (result.conflict != null) conflicts.add(result.conflict!);
        }
      }
      
      // Применить rooms
      if (data.containsKey('rooms')) {
        final rooms = data['rooms'] as List;
        for (final roomData in rooms) {
          final result = await _applyRoom(roomData);
          if (result.applied) roomsApplied++;
          if (result.conflict != null) conflicts.add(result.conflict!);
        }
      }
      
      // TODO: Применить items и shelves
      
      return ApplyResult(
        warehouses: warehousesApplied,
        rooms: roomsApplied,
        items: itemsApplied,
        conflicts: conflicts,
      );
      
    } catch (e) {
      print('Error applying remote data: $e');
      return ApplyResult(
        warehouses: warehousesApplied,
        rooms: roomsApplied,
        items: itemsApplied,
        conflicts: conflicts,
      );
    }
  }

  // Применить отдельный warehouse с conflict resolution
  Future<ItemApplyResult> _applyWarehouse(Map<String, dynamic> warehouseData) async {
    try {
      final remoteId = warehouseData['id'] as String;
      final existingWarehouse = await _dbService.getWarehouse(remoteId);
      
      if (existingWarehouse == null) {
        // Новый warehouse - просто добавляем
        // TODO: Создать warehouse из данных
        return ItemApplyResult(applied: true);
      } else {
        // Существующий warehouse - проверяем на конфликты
        final remoteUpdated = warehouseData['updated_at'] as int;
        final localUpdated = existingWarehouse.updatedAt.millisecondsSinceEpoch;
        
        if (remoteUpdated > localUpdated) {
          // Удаленная версия новее - применяем
          // TODO: Обновить warehouse
          return ItemApplyResult(applied: true);
        } else if (remoteUpdated < localUpdated) {
          // Локальная версия новее - оставляем как есть
          return ItemApplyResult(applied: false);
        } else {
          // Одинаковые timestamps - потенциальный конфликт
          final conflict = ConflictInfo(
            type: 'warehouse',
            id: remoteId,
            localData: existingWarehouse.toMap(),
            remoteData: warehouseData,
            localTimestamp: localUpdated,
            remoteTimestamp: remoteUpdated,
          );
          return ItemApplyResult(applied: false, conflict: conflict);
        }
      }
    } catch (e) {
      print('Error applying warehouse: $e');
      return ItemApplyResult(applied: false);
    }
  }

  // Применить отдельную room
  Future<ItemApplyResult> _applyRoom(Map<String, dynamic> roomData) async {
    try {
      final remoteId = roomData['id'] as String;
      final existingRoom = await _dbService.getRoom(remoteId);
      
      if (existingRoom == null) {
        // Новая room - добавляем
        // TODO: Создать room из данных
        return ItemApplyResult(applied: true);
      } else {
        // Существующая room - conflict resolution
        final remoteUpdated = roomData['updated_at'] as int;
        final localUpdated = existingRoom.updatedAt.millisecondsSinceEpoch;
        
        if (remoteUpdated > localUpdated) {
          // TODO: Обновить room
          return ItemApplyResult(applied: true);
        } else {
          return ItemApplyResult(applied: false);
        }
      }
    } catch (e) {
      print('Error applying room: $e');
      return ItemApplyResult(applied: false);
    }
  }

  // Отправить локальные изменения на удаленное устройство
  Future<bool> _pushLocalChanges(DeviceInfo device, int? lastSync) async {
    try {
      // Получить локальные изменения после lastSync
      final changedWarehouses = lastSync != null 
        ? await _dbService.getChangedWarehouses(lastSync)
        : await _dbService.getWarehouses();
      
      final changedRooms = lastSync != null
        ? await _dbService.getChangedRooms(lastSync)  
        : await _dbService.getAllRooms();
      
      if (changedWarehouses.isEmpty && changedRooms.isEmpty) {
        return true; // Нет изменений для отправки
      }
      
      // Отправить warehouses
      if (changedWarehouses.isNotEmpty) {
        final warehousesResponse = await http.post(
          Uri.parse('http://${device.ip}:${device.port}/api/warehouses'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'warehouses': changedWarehouses.map((w) => {
              'id': w.id,
              'name': w.name,
              'description': w.description,
              'is_private': w.isPrivate,
              'created_at': w.createdAt.millisecondsSinceEpoch,
              'updated_at': w.updatedAt.millisecondsSinceEpoch,
            }).toList(),
          }),
        ).timeout(const Duration(seconds: 15));
        
        if (warehousesResponse.statusCode != 200) {
          print('Failed to push warehouses');
          return false;
        }
      }
      
      // Отправить rooms
      if (changedRooms.isNotEmpty) {
        final roomsResponse = await http.post(
          Uri.parse('http://${device.ip}:${device.port}/api/rooms'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'rooms': changedRooms.map((r) => {
              'id': r.id,
              'warehouse_id': r.warehouseId,
              'name': r.name,
              'description': r.description,
              'created_at': r.createdAt.millisecondsSinceEpoch,
              'updated_at': r.updatedAt.millisecondsSinceEpoch,
            }).toList(),
          }),
        ).timeout(const Duration(seconds: 15));
        
        if (roomsResponse.statusCode != 200) {
          print('Failed to push rooms');
          return false;
        }
      }
      
      return true;
    } catch (e) {
      print('Error pushing local changes: $e');
      return false;
    }
  }

  // Получить последний timestamp синхронизации с устройством
  Future<int?> _getLastSyncTimestamp(String deviceFingerprint) async {
    // TODO: Реализовать сохранение sync timestamps в локальной базе
    return null; // Пока возвращаем null для полной синхронизации
  }

  // Обновить timestamp синхронизации
  Future<void> _updateLastSyncTimestamp(String deviceFingerprint, int timestamp) async {
    // TODO: Сохранить timestamp в локальной базе для следующей синхронизации
    print('Sync completed with device $deviceFingerprint at timestamp $timestamp');
  }

  // Синхронизация со всеми обнаруженными устройствами
  Future<List<SyncResult>> syncWithAllDevices() async {
    final devices = _deviceDiscovery.getConnectedDevices();
    final results = <SyncResult>[];
    
    for (final device in devices) {
      final result = await syncWithDevice(device);
      results.add(result);
    }
    
    return results;
  }
}

// Результаты синхронизации
class SyncResult {
  final bool success;
  final String? error;
  final int warehouses;
  final int rooms; 
  final int items;
  final List<ConflictInfo> conflicts;
  
  SyncResult.success({
    required this.warehouses,
    required this.rooms,
    required this.items,
    required this.conflicts,
  }) : success = true, error = null;
  
  SyncResult.error(this.error)
    : success = false, warehouses = 0, rooms = 0, items = 0, conflicts = [];
}

class ApplyResult {
  final int warehouses;
  final int rooms;
  final int items;
  final List<ConflictInfo> conflicts;
  
  ApplyResult({
    required this.warehouses,
    required this.rooms, 
    required this.items,
    required this.conflicts,
  });
}

class ItemApplyResult {
  final bool applied;
  final ConflictInfo? conflict;
  
  ItemApplyResult({required this.applied, this.conflict});
}

class ConflictInfo {
  final String type;
  final String id;
  final Map<String, dynamic> localData;
  final Map<String, dynamic> remoteData;
  final int localTimestamp;
  final int remoteTimestamp;
  
  ConflictInfo({
    required this.type,
    required this.id,
    required this.localData,
    required this.remoteData,
    required this.localTimestamp,
    required this.remoteTimestamp,
  });
}