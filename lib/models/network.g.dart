// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'network.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

NetworkDevice _$NetworkDeviceFromJson(Map<String, dynamic> json) =>
    NetworkDevice(
      id: json['id'] as String,
      name: json['name'] as String,
      ipAddress: json['ipAddress'] as String,
      port: (json['port'] as num).toInt(),
      lastSeen: DateTime.parse(json['lastSeen'] as String),
      publicKey: json['publicKey'] as String?,
      capabilities: (json['capabilities'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$NetworkDeviceToJson(NetworkDevice instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'ipAddress': instance.ipAddress,
      'port': instance.port,
      'lastSeen': instance.lastSeen.toIso8601String(),
      'publicKey': instance.publicKey,
      'capabilities': instance.capabilities,
    };

NetworkMessage _$NetworkMessageFromJson(Map<String, dynamic> json) =>
    NetworkMessage(
      id: json['id'] as String,
      type: $enumDecode(_$MessageTypeEnumMap, json['type']),
      senderId: json['senderId'] as String,
      receiverId: json['receiverId'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
      payload: json['payload'] as Map<String, dynamic>,
      encrypted: json['encrypted'] as bool?,
      signature: json['signature'] as String?,
    );

Map<String, dynamic> _$NetworkMessageToJson(NetworkMessage instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': _$MessageTypeEnumMap[instance.type]!,
      'senderId': instance.senderId,
      'receiverId': instance.receiverId,
      'timestamp': instance.timestamp.toIso8601String(),
      'payload': instance.payload,
      'encrypted': instance.encrypted,
      'signature': instance.signature,
    };

const _$MessageTypeEnumMap = {
  MessageType.discover: 'discover',
  MessageType.announce: 'announce',
  MessageType.syncRequest: 'syncRequest',
  MessageType.syncResponse: 'syncResponse',
  MessageType.warehouseUpdate: 'warehouseUpdate',
  MessageType.invite: 'invite',
  MessageType.joinRequest: 'joinRequest',
  MessageType.permissionGrant: 'permissionGrant',
  MessageType.ping: 'ping',
  MessageType.pong: 'pong',
};

SyncData _$SyncDataFromJson(Map<String, dynamic> json) => SyncData(
      warehouses: (json['warehouses'] as List<dynamic>)
          .map((e) => Warehouse.fromJson(e as Map<String, dynamic>))
          .toList(),
      version: (json['version'] as num).toInt(),
      checksum: json['checksum'] as String,
    );

Map<String, dynamic> _$SyncDataToJson(SyncData instance) => <String, dynamic>{
      'warehouses': instance.warehouses,
      'version': instance.version,
      'checksum': instance.checksum,
    };

NetworkState _$NetworkStateFromJson(Map<String, dynamic> json) => NetworkState(
      isOnline: json['isOnline'] as bool,
      discoveredDevices: (json['discoveredDevices'] as List<dynamic>)
          .map((e) => NetworkDevice.fromJson(e as Map<String, dynamic>))
          .toList(),
      localDevice:
          NetworkDevice.fromJson(json['localDevice'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$NetworkStateToJson(NetworkState instance) =>
    <String, dynamic>{
      'isOnline': instance.isOnline,
      'discoveredDevices': instance.discoveredDevices,
      'localDevice': instance.localDevice,
    };
