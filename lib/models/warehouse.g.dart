// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'warehouse.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FirebaseEntity _$FirebaseEntityFromJson(Map<String, dynamic> json) =>
    FirebaseEntity(
      id: json['id'] as String,
      name: json['name'] as String,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$FirebaseEntityToJson(FirebaseEntity instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'createdAt': instance.createdAt?.toIso8601String(),
    };

UserPermission _$UserPermissionFromJson(Map<String, dynamic> json) =>
    UserPermission(
      userId: json['userId'] as String,
      role: $enumDecode(_$UserRoleEnumMap, json['role']),
      grantedAt: DateTime.parse(json['grantedAt'] as String),
      grantedBy: json['grantedBy'] as String,
    );

Map<String, dynamic> _$UserPermissionToJson(UserPermission instance) =>
    <String, dynamic>{
      'userId': instance.userId,
      'role': _$UserRoleEnumMap[instance.role]!,
      'grantedAt': instance.grantedAt.toIso8601String(),
      'grantedBy': instance.grantedBy,
    };

const _$UserRoleEnumMap = {
  UserRole.master: 'master',
  UserRole.editor: 'editor',
  UserRole.viewer: 'viewer',
  UserRole.guest: 'guest',
};

WarehouseAccessControl _$WarehouseAccessControlFromJson(
        Map<String, dynamic> json) =>
    WarehouseAccessControl(
      accessLevel: $enumDecode(_$AccessLevelEnumMap, json['accessLevel']),
      permissions: (json['permissions'] as List<dynamic>)
          .map((e) => UserPermission.fromJson(e as Map<String, dynamic>))
          .toList(),
      inviteCode: json['inviteCode'] as String?,
      encryptionEnabled: json['encryptionEnabled'] as bool,
    );

Map<String, dynamic> _$WarehouseAccessControlToJson(
        WarehouseAccessControl instance) =>
    <String, dynamic>{
      'accessLevel': _$AccessLevelEnumMap[instance.accessLevel]!,
      'permissions': instance.permissions,
      'inviteCode': instance.inviteCode,
      'encryptionEnabled': instance.encryptionEnabled,
    };

const _$AccessLevelEnumMap = {
  AccessLevel.public: 'public',
  AccessLevel.private: 'private',
};

Warehouse _$WarehouseFromJson(Map<String, dynamic> json) => Warehouse(
      id: json['id'] as String,
      name: json['name'] as String,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      rooms: (json['rooms'] as List<dynamic>?)
          ?.map((e) => Room.fromJson(e as Map<String, dynamic>))
          .toList(),
      ownerId: json['ownerId'] as String,
      accessControl: WarehouseAccessControl.fromJson(
          json['accessControl'] as Map<String, dynamic>),
      networkVisible: json['networkVisible'] as bool,
      lastSync: json['lastSync'] == null
          ? null
          : DateTime.parse(json['lastSync'] as String),
      syncVersion: (json['syncVersion'] as num).toInt(),
    );

Map<String, dynamic> _$WarehouseToJson(Warehouse instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'createdAt': instance.createdAt?.toIso8601String(),
      'rooms': instance.rooms,
      'ownerId': instance.ownerId,
      'accessControl': instance.accessControl,
      'networkVisible': instance.networkVisible,
      'lastSync': instance.lastSync?.toIso8601String(),
      'syncVersion': instance.syncVersion,
    };

Room _$RoomFromJson(Map<String, dynamic> json) => Room(
      id: json['id'] as String,
      name: json['name'] as String,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      shelves: (json['shelves'] as List<dynamic>?)
          ?.map((e) => Shelf.fromJson(e as Map<String, dynamic>))
          .toList(),
      ownerId: json['ownerId'] as String,
      isPublic: json['isPublic'] as bool,
      createdBy: json['createdBy'] as String,
      lastModifiedAt: json['lastModifiedAt'] == null
          ? null
          : DateTime.parse(json['lastModifiedAt'] as String),
      lastModifiedBy: json['lastModifiedBy'] as String?,
    );

Map<String, dynamic> _$RoomToJson(Room instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'createdAt': instance.createdAt?.toIso8601String(),
      'shelves': instance.shelves,
      'ownerId': instance.ownerId,
      'isPublic': instance.isPublic,
      'createdBy': instance.createdBy,
      'lastModifiedAt': instance.lastModifiedAt?.toIso8601String(),
      'lastModifiedBy': instance.lastModifiedBy,
    };

Shelf _$ShelfFromJson(Map<String, dynamic> json) => Shelf(
      id: json['id'] as String,
      name: json['name'] as String,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      items: (json['items'] as List<dynamic>?)
          ?.map((e) => Item.fromJson(e as Map<String, dynamic>))
          .toList(),
      ownerId: json['ownerId'] as String,
      isPublic: json['isPublic'] as bool,
      createdBy: json['createdBy'] as String,
      lastModifiedAt: json['lastModifiedAt'] == null
          ? null
          : DateTime.parse(json['lastModifiedAt'] as String),
      lastModifiedBy: json['lastModifiedBy'] as String?,
    );

Map<String, dynamic> _$ShelfToJson(Shelf instance) => <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'createdAt': instance.createdAt?.toIso8601String(),
      'items': instance.items,
      'ownerId': instance.ownerId,
      'isPublic': instance.isPublic,
      'createdBy': instance.createdBy,
      'lastModifiedAt': instance.lastModifiedAt?.toIso8601String(),
      'lastModifiedBy': instance.lastModifiedBy,
    };

UserProfile _$UserProfileFromJson(Map<String, dynamic> json) => UserProfile(
      username: json['username'] as String,
      currency: json['currency'] as String,
    );

Map<String, dynamic> _$UserProfileToJson(UserProfile instance) =>
    <String, dynamic>{
      'username': instance.username,
      'currency': instance.currency,
    };
