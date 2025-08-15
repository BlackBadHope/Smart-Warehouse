import 'package:json_annotation/json_annotation.dart';

part 'user_role.g.dart';

@JsonSerializable()
class UserRole {
  final String id;
  final String userId;
  final String warehouseId;
  final String warehouseName;
  final RoleType role;
  final List<Permission> permissions;
  final DateTime grantedAt;
  final String grantedBy;
  final DateTime? expiresAt;
  final bool isActive;

  const UserRole({
    required this.id,
    required this.userId,
    required this.warehouseId,
    required this.warehouseName,
    required this.role,
    required this.permissions,
    required this.grantedAt,
    required this.grantedBy,
    this.expiresAt,
    this.isActive = true,
  });

  factory UserRole.fromJson(Map<String, dynamic> json) => _$UserRoleFromJson(json);
  Map<String, dynamic> toJson() => _$UserRoleToJson(this);

  UserRole copyWith({
    RoleType? role,
    List<Permission>? permissions,
    DateTime? expiresAt,
    bool? isActive,
  }) {
    return UserRole(
      id: id,
      userId: userId,
      warehouseId: warehouseId,
      warehouseName: warehouseName,
      role: role ?? this.role,
      permissions: permissions ?? this.permissions,
      grantedAt: grantedAt,
      grantedBy: grantedBy,
      expiresAt: expiresAt ?? this.expiresAt,
      isActive: isActive ?? this.isActive,
    );
  }

  bool hasPermission(Permission permission) {
    return permissions.contains(permission);
  }

  bool canAccess(AccessLevel level, Permission operation) {
    // Owner всегда может все
    if (role == RoleType.owner) return true;

    // Проверяем уровень доступа
    switch (level) {
      case AccessLevel.public:
        return true; // Публичные всегда доступны
      case AccessLevel.private:
        return permissions.contains(operation);
    }
  }
}

@JsonEnum()
enum RoleType {
  owner,        // Владелец - полный доступ
  admin,        // Администратор - почти полный доступ  
  manager,      // Менеджер - управление контентом
  editor,       // Редактор - редактирование items
  viewer,       // Просмотр - только чтение
  guest,        // Гость - ограниченный доступ
}

@JsonEnum()
enum Permission {
  // Warehouse level
  warehouseRead,
  warehouseWrite,
  warehouseDelete,
  warehouseAdmin,

  // Room level  
  roomRead,
  roomWrite,
  roomDelete,
  roomCreate,

  // Shelf level
  shelfRead,
  shelfWrite,
  shelfDelete,
  shelfCreate,

  // Item level
  itemRead,
  itemWrite,
  itemDelete,
  itemCreate,
  itemLock,     // Брать в работу

  // User management
  userInvite,
  userRemove,
  roleAssign,

  // Network
  networkVisible,
  networkShare,
}

extension RoleTypeExtension on RoleType {
  List<Permission> get defaultPermissions {
    switch (this) {
      case RoleType.owner:
        return Permission.values; // Все права

      case RoleType.admin:
        return [
          // Warehouse
          Permission.warehouseRead,
          Permission.warehouseWrite,
          Permission.warehouseAdmin,
          // All content permissions
          ...Permission.values.where((p) => 
            p.name.contains('room') || 
            p.name.contains('shelf') || 
            p.name.contains('item')
          ),
          // User management
          Permission.userInvite,
          Permission.roleAssign,
          // Network
          Permission.networkVisible,
          Permission.networkShare,
        ];

      case RoleType.manager:
        return [
          Permission.warehouseRead,
          Permission.warehouseWrite,
          Permission.roomRead,
          Permission.roomWrite,
          Permission.roomCreate,
          Permission.roomDelete,
          Permission.shelfRead,
          Permission.shelfWrite,
          Permission.shelfCreate,
          Permission.shelfDelete,
          Permission.itemRead,
          Permission.itemWrite,
          Permission.itemCreate,
          Permission.itemDelete,
          Permission.itemLock,
          Permission.userInvite,
        ];

      case RoleType.editor:
        return [
          Permission.warehouseRead,
          Permission.roomRead,
          Permission.shelfRead,
          Permission.itemRead,
          Permission.itemWrite,
          Permission.itemCreate,
          Permission.itemLock,
        ];

      case RoleType.viewer:
        return [
          Permission.warehouseRead,
          Permission.roomRead,
          Permission.shelfRead,
          Permission.itemRead,
        ];

      case RoleType.guest:
        return [
          Permission.warehouseRead,
          Permission.roomRead,
        ];
    }
  }

  String get displayName {
    switch (this) {
      case RoleType.owner:
        return 'Owner';
      case RoleType.admin:
        return 'Administrator';
      case RoleType.manager:
        return 'Manager';
      case RoleType.editor:
        return 'Editor';
      case RoleType.viewer:
        return 'Viewer';
      case RoleType.guest:
        return 'Guest';
    }
  }

  String get description {
    switch (this) {
      case RoleType.owner:
        return 'Full access to everything';
      case RoleType.admin:
        return 'Manage warehouse and users';
      case RoleType.manager:
        return 'Manage content and invite users';
      case RoleType.editor:
        return 'Edit items and lock them';
      case RoleType.viewer:
        return 'View all content';
      case RoleType.guest:
        return 'Limited view access';
    }
  }
}