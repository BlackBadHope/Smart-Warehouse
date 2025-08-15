// Conflict Resolution Service
// Реализует Hybrid подход: CRDT + Role-based + Manual resolution из development-context.md

import 'dart:convert';
import '../models/warehouse.dart';

enum ConflictResolutionStrategy {
  crdt,           // CRDT для добавлений (UUID + timestamp)
  roleBased,      // Role + Timestamp priority для изменений
  manual,         // Manual resolution для критичных операций
}

enum UserRole {
  owner,          // Владелец склада - наивысший приоритет
  admin,          // Администратор - высокий приоритет
  editor,         // Редактор - средний приоритет
  viewer,         // Наблюдатель - только чтение
}

class ConflictResolutionService {
  static ConflictResolutionService? _instance;
  
  ConflictResolutionService._internal();
  
  factory ConflictResolutionService() {
    _instance ??= ConflictResolutionService._internal();
    return _instance!;
  }

  // Главный метод разрешения конфликтов
  Future<ConflictResolution> resolveConflict(ConflictData conflict) async {
    switch (conflict.type) {
      case ConflictType.warehouseAdd:
        return _resolveCRDT(conflict);
      case ConflictType.warehouseEdit:
        return _resolveRoleBased(conflict);
      case ConflictType.itemAdd:
        return _resolveCRDT(conflict);
      case ConflictType.itemEdit:
        return _resolveRoleBased(conflict);
      case ConflictType.itemDelete:
        return _resolveManual(conflict);
      case ConflictType.roomAdd:
        return _resolveCRDT(conflict);
      case ConflictType.roomEdit:
        return _resolveRoleBased(conflict);
      default:
        return _resolveManual(conflict);
    }
  }

  // CRDT Resolution - для добавлений (оба сохраняются)
  ConflictResolution _resolveCRDT(ConflictData conflict) {
    print('Resolving conflict with CRDT strategy for ${conflict.type}');
    
    // В CRDT добавления никогда не конфликтуют - сохраняем оба объекта
    // UUID гарантирует уникальность, timestamp определяет порядок
    
    return ConflictResolution(
      strategy: ConflictResolutionStrategy.crdt,
      action: ConflictAction.keepBoth,
      resultData: {
        'local': conflict.localData,
        'remote': conflict.remoteData,
        'resolution': 'CRDT: Both items preserved with unique UUIDs',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      },
      automatic: true,
    );
  }

  // Role-based Resolution - для изменений существующих объектов
  ConflictResolution _resolveRoleBased(ConflictData conflict) {
    print('Resolving conflict with Role-based strategy for ${conflict.type}');
    
    final localRole = _getUserRole(conflict.localUserId);
    final remoteRole = _getUserRole(conflict.remoteUserId);
    
    // Сравниваем роли
    final roleComparison = _compareRoles(localRole, remoteRole);
    
    if (roleComparison > 0) {
      // Локальная роль выше - оставляем локальные данные
      return ConflictResolution(
        strategy: ConflictResolutionStrategy.roleBased,
        action: ConflictAction.keepLocal,
        resultData: conflict.localData,
        automatic: true,
        reason: 'Local user role ($localRole) > Remote user role ($remoteRole)',
      );
    } else if (roleComparison < 0) {
      // Удаленная роль выше - принимаем удаленные данные
      return ConflictResolution(
        strategy: ConflictResolutionStrategy.roleBased,
        action: ConflictAction.keepRemote,
        resultData: conflict.remoteData,
        automatic: true,
        reason: 'Remote user role ($remoteRole) > Local user role ($localRole)',
      );
    } else {
      // Роли равны - смотрим на timestamp
      if (conflict.localTimestamp > conflict.remoteTimestamp) {
        return ConflictResolution(
          strategy: ConflictResolutionStrategy.roleBased,
          action: ConflictAction.keepLocal,
          resultData: conflict.localData,
          automatic: true,
          reason: 'Equal roles, local timestamp newer',
        );
      } else if (conflict.remoteTimestamp > conflict.localTimestamp) {
        return ConflictResolution(
          strategy: ConflictResolutionStrategy.roleBased,
          action: ConflictAction.keepRemote,
          resultData: conflict.remoteData,
          automatic: true,
          reason: 'Equal roles, remote timestamp newer',
        );
      } else {
        // Полностью одинаковые - требует ручного разрешения
        return _resolveManual(conflict);
      }
    }
  }

  // Manual Resolution - для критичных операций
  ConflictResolution _resolveManual(ConflictData conflict) {
    print('Manual resolution required for ${conflict.type}');
    
    return ConflictResolution(
      strategy: ConflictResolutionStrategy.manual,
      action: ConflictAction.requiresManualReview,
      resultData: {
        'local': conflict.localData,
        'remote': conflict.remoteData,
        'conflict_id': conflict.id,
        'requires_user_input': true,
      },
      automatic: false,
      reason: 'Critical operation requires manual review',
    );
  }

  // Получить роль пользователя (пока захардкожено, потом из базы)
  UserRole _getUserRole(String userId) {
    // TODO: Получать из базы данных пользователей
    // Пока возвращаем editor для всех
    return UserRole.editor;
  }

  // Сравнить роли (-1: первая меньше, 0: равны, 1: первая больше)
  int _compareRoles(UserRole role1, UserRole role2) {
    final priorities = {
      UserRole.owner: 4,
      UserRole.admin: 3,
      UserRole.editor: 2,
      UserRole.viewer: 1,
    };
    
    final priority1 = priorities[role1] ?? 0;
    final priority2 = priorities[role2] ?? 0;
    
    return priority1.compareTo(priority2);
  }

  // Применить разрешение конфликта к локальным данным
  Future<bool> applyResolution(ConflictResolution resolution, String objectId) async {
    try {
      switch (resolution.action) {
        case ConflictAction.keepLocal:
          // Ничего не делаем - оставляем локальные данные
          print('Keeping local data for $objectId');
          return true;
          
        case ConflictAction.keepRemote:
          // Заменяем локальные данные на удаленные
          print('Applying remote data for $objectId');
          // TODO: Обновить объект в базе данных
          return true;
          
        case ConflictAction.keepBoth:
          // Сохраняем оба объекта (CRDT случай)
          print('Keeping both versions for $objectId');
          // TODO: Создать новый объект с данными с удаленного устройства
          return true;
          
        case ConflictAction.requiresManualReview:
          // Сохраняем конфликт для ручного разрешения
          print('Saving conflict for manual review: $objectId');
          // TODO: Сохранить в таблицу конфликтов для показа пользователю
          return true;
      }
    } catch (e) {
      print('Error applying conflict resolution: $e');
      return false;
    }
  }

  // Получить все конфликты требующие ручного разрешения
  Future<List<ConflictData>> getPendingConflicts() async {
    // TODO: Получить из базы данных таблицы conflicts
    return [];
  }

  // Разрешить конфликт вручную
  Future<bool> resolveManually(String conflictId, ConflictAction action) async {
    try {
      // TODO: Получить конфликт из базы, применить выбранное действие
      print('Manually resolving conflict $conflictId with action $action');
      return true;
    } catch (e) {
      print('Error in manual resolution: $e');
      return false;
    }
  }
}

// Типы конфликтов
enum ConflictType {
  warehouseAdd,
  warehouseEdit,
  warehouseDelete,
  roomAdd,
  roomEdit,
  roomDelete,
  shelfAdd,
  shelfEdit,
  shelfDelete,
  itemAdd,
  itemEdit,
  itemDelete,
  itemLock,     // Конфликт блокировки предмета
}

// Действия по разрешению конфликта
enum ConflictAction {
  keepLocal,               // Оставить локальную версию
  keepRemote,              // Принять удаленную версию
  keepBoth,                // Сохранить обе версии (CRDT)
  requiresManualReview,    // Требует ручного разрешения
}

// Данные конфликта
class ConflictData {
  final String id;
  final ConflictType type;
  final String objectId;
  final Map<String, dynamic> localData;
  final Map<String, dynamic> remoteData;
  final int localTimestamp;
  final int remoteTimestamp;
  final String localUserId;
  final String remoteUserId;
  final String localDeviceId;
  final String remoteDeviceId;

  ConflictData({
    required this.id,
    required this.type,
    required this.objectId,
    required this.localData,
    required this.remoteData,
    required this.localTimestamp,
    required this.remoteTimestamp,
    required this.localUserId,
    required this.remoteUserId,
    required this.localDeviceId,
    required this.remoteDeviceId,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'type': type.toString(),
      'object_id': objectId,
      'local_data': jsonEncode(localData),
      'remote_data': jsonEncode(remoteData),
      'local_timestamp': localTimestamp,
      'remote_timestamp': remoteTimestamp,
      'local_user_id': localUserId,
      'remote_user_id': remoteUserId,
      'local_device_id': localDeviceId,
      'remote_device_id': remoteDeviceId,
      'created_at': DateTime.now().millisecondsSinceEpoch,
    };
  }
}

// Результат разрешения конфликта
class ConflictResolution {
  final ConflictResolutionStrategy strategy;
  final ConflictAction action;
  final Map<String, dynamic> resultData;
  final bool automatic;
  final String? reason;

  ConflictResolution({
    required this.strategy,
    required this.action,
    required this.resultData,
    required this.automatic,
    this.reason,
  });

  Map<String, dynamic> toMap() {
    return {
      'strategy': strategy.toString(),
      'action': action.toString(),
      'result_data': jsonEncode(resultData),
      'automatic': automatic,
      'reason': reason,
      'resolved_at': DateTime.now().millisecondsSinceEpoch,
    };
  }
}