import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/warehouse.dart';
import '../network/device_identity_provider.dart';
import '../storage/local_storage_provider.dart';
import 'role_invitation_provider.dart';

final accessControlProvider = StateNotifierProvider<AccessControlNotifier, AccessControlState>((ref) {
  return AccessControlNotifier(ref);
});

class AccessControlState {
  final Map<String, UserRole> userRoles; // warehouseId -> role
  final String? currentUserId;
  final bool isInitialized;

  const AccessControlState({
    required this.userRoles,
    this.currentUserId,
    required this.isInitialized,
  });

  AccessControlState copyWith({
    Map<String, UserRole>? userRoles,
    String? currentUserId,
    bool? isInitialized,
  }) {
    return AccessControlState(
      userRoles: userRoles ?? this.userRoles,
      currentUserId: currentUserId ?? this.currentUserId,
      isInitialized: isInitialized ?? this.isInitialized,
    );
  }
}

class AccessControlNotifier extends StateNotifier<AccessControlState> {
  final Ref _ref;

  AccessControlNotifier(this._ref) : super(const AccessControlState(
    userRoles: {},
    isInitialized: false,
  )) {
    _initialize();
  }

  void _initialize() {
    final deviceIdentity = _ref.read(deviceIdentityProvider);
    final roleInvitationState = _ref.read(roleInvitationProvider);
    
    // Построить карту ролей пользователя
    final Map<String, UserRole> userRoles = {};
    for (final permission in roleInvitationState.activePermissions) {
      if (permission.userId == deviceIdentity?.id) {
        // Определить warehouseId из permission (нужно будет добавить в модель)
        // Пока используем заглушку
      }
    }

    state = state.copyWith(
      currentUserId: deviceIdentity?.id,
      userRoles: userRoles,
      isInitialized: true,
    );
  }

  // Проверка доступа к складу
  bool canAccessWarehouse(Warehouse warehouse) {
    final currentUserId = state.currentUserId;
    if (currentUserId == null) return false;

    // Владелец всегда имеет доступ
    if (warehouse.ownerId == currentUserId) return true;

    // Публичный склад доступен всем
    if (warehouse.accessControl.accessLevel == AccessLevel.public) return true;

    // Приватный склад - проверяем роль
    final role = state.userRoles[warehouse.id];
    return role != null;
  }

  // Проверка доступа к комнате
  bool canAccessRoom(Warehouse warehouse, Room room) {
    if (!canAccessWarehouse(warehouse)) return false;

    final role = getUserRole(warehouse.id);
    if (role == null) return false;

    // Публичная комната доступна всем с доступом к складу
    if (room.isPublic) return true;

    // Приватная комната - проверяем права
    switch (role) {
      case UserRole.master:
        return true; // Мастер может все
      case UserRole.editor:
        return true; // Редактор может все
      case UserRole.viewer:
        return true; // Зритель может читать
      case UserRole.guest:
        return room.isPublic; // Гость только публичные
    }
  }

  // Проверка доступа к полке
  bool canAccessShelf(Warehouse warehouse, Room room, Shelf shelf) {
    if (!canAccessRoom(warehouse, room)) return false;

    final role = getUserRole(warehouse.id);
    if (role == null) return false;

    // Публичная полка доступна всем с доступом к комнате
    if (shelf.isPublic) return true;

    // Приватная полка - проверяем права
    switch (role) {
      case UserRole.master:
        return true;
      case UserRole.editor:
        return true;
      case UserRole.viewer:
        return true;
      case UserRole.guest:
        return shelf.isPublic;
    }
  }

  // Проверка доступа к предмету
  bool canAccessItem(Warehouse warehouse, Room room, Shelf shelf, Item item) {
    if (!canAccessShelf(warehouse, room, shelf)) return false;

    final role = getUserRole(warehouse.id);
    if (role == null) return false;

    // Публичный предмет доступен всем с доступом к полке
    if (item.isPublic) return true;

    // Приватный предмет - проверяем права
    switch (role) {
      case UserRole.master:
        return true;
      case UserRole.editor:
        return true;
      case UserRole.viewer:
        return true;
      case UserRole.guest:
        return item.isPublic;
    }
  }

  // Проверка прав на модификацию
  bool canModifyWarehouse(Warehouse warehouse) {
    final currentUserId = state.currentUserId;
    if (currentUserId == null) return false;

    // Владелец всегда может модифицировать
    if (warehouse.ownerId == currentUserId) return true;

    final role = getUserRole(warehouse.id);
    if (role == null) return false;

    return role == UserRole.master;
  }

  bool canModifyRoom(Warehouse warehouse, Room room) {
    if (!canModifyWarehouse(warehouse)) {
      final role = getUserRole(warehouse.id);
      if (role == null) return false;

      return role == UserRole.master || role == UserRole.editor;
    }
    return true;
  }

  bool canModifyShelf(Warehouse warehouse, Room room, Shelf shelf) {
    if (!canAccessRoom(warehouse, room)) return false;

    final role = getUserRole(warehouse.id);
    if (role == null) return false;

    return role == UserRole.master || role == UserRole.editor;
  }

  bool canModifyItem(Warehouse warehouse, Room room, Shelf shelf, Item item) {
    if (!canAccessShelf(warehouse, room, shelf)) return false;

    final role = getUserRole(warehouse.id);
    if (role == null) return false;

    return role == UserRole.master || role == UserRole.editor;
  }

  // Проверка прав на создание
  bool canCreateRoom(Warehouse warehouse) {
    return canModifyWarehouse(warehouse);
  }

  bool canCreateShelf(Warehouse warehouse, Room room) {
    return canModifyRoom(warehouse, room);
  }

  bool canCreateItem(Warehouse warehouse, Room room, Shelf shelf) {
    return canModifyShelf(warehouse, room, shelf);
  }

  // Проверка прав на удаление
  bool canDeleteRoom(Warehouse warehouse, Room room) {
    final currentUserId = state.currentUserId;
    if (currentUserId == null) return false;

    // Владелец всегда может удалить
    if (warehouse.ownerId == currentUserId) return true;

    final role = getUserRole(warehouse.id);
    return role == UserRole.master;
  }

  bool canDeleteShelf(Warehouse warehouse, Room room, Shelf shelf) {
    final currentUserId = state.currentUserId;
    if (currentUserId == null) return false;

    // Владелец всегда может удалить
    if (warehouse.ownerId == currentUserId) return true;

    final role = getUserRole(warehouse.id);
    return role == UserRole.master;
  }

  bool canDeleteItem(Warehouse warehouse, Room room, Shelf shelf, Item item) {
    final currentUserId = state.currentUserId;
    if (currentUserId == null) return false;

    // Владелец всегда может удалить
    if (warehouse.ownerId == currentUserId) return true;

    final role = getUserRole(warehouse.id);
    return role == UserRole.master || role == UserRole.editor;
  }

  // Проверка прав на управление пользователями
  bool canManageUsers(Warehouse warehouse) {
    final currentUserId = state.currentUserId;
    if (currentUserId == null) return false;

    // Владелец всегда может управлять пользователями
    if (warehouse.ownerId == currentUserId) return true;

    final role = getUserRole(warehouse.id);
    return role == UserRole.master;
  }

  // Проверка прав на блокировку предметов (система "Взято в работу" из development-context)
  bool canLockItem(Warehouse warehouse, Room room, Shelf shelf, Item item) {
    final role = getUserRole(warehouse.id);
    if (role == null) return false;

    // Блокировать могут editor и выше
    return role == UserRole.master || role == UserRole.editor;
  }

  // Получить роль пользователя для склада
  UserRole? getUserRole(String warehouseId) {
    return state.userRoles[warehouseId];
  }

  // Получить текстовое описание роли
  String getRoleDisplayName(String warehouseId) {
    final role = getUserRole(warehouseId);
    if (role == null) return 'No access';
    
    switch (role) {
      case UserRole.master:
        return 'Master';
      case UserRole.editor:
        return 'Editor';
      case UserRole.viewer:
        return 'Viewer';
      case UserRole.guest:
        return 'Guest';
    }
  }

  // Получить список доступных действий для роли
  List<String> getAvailableActions(String warehouseId) {
    final role = getUserRole(warehouseId);
    if (role == null) return [];

    switch (role) {
      case UserRole.master:
        return ['Read', 'Write', 'Delete', 'Manage Users', 'Lock Items'];
      case UserRole.editor:
        return ['Read', 'Write', 'Lock Items'];
      case UserRole.viewer:
        return ['Read'];
      case UserRole.guest:
        return ['Read (Limited)'];
    }
  }

  // Проверка является ли пользователь владельцем
  bool isOwner(Warehouse warehouse) {
    final currentUserId = state.currentUserId;
    return currentUserId != null && warehouse.ownerId == currentUserId;
  }

  // Обновить роли при получении новых разрешений
  void updateUserRoles(Map<String, UserRole> newRoles) {
    state = state.copyWith(userRoles: {...state.userRoles, ...newRoles});
  }
}