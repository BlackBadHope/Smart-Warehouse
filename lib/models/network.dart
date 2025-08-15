import 'package:json_annotation/json_annotation.dart';
import 'warehouse.dart';

part 'network.g.dart';

@JsonSerializable()
class NetworkDevice {
  final String id;
  final String name;
  final String ipAddress;
  final int port;
  final DateTime lastSeen;
  final String? publicKey;
  final List<String> capabilities;

  const NetworkDevice({
    required this.id,
    required this.name,
    required this.ipAddress,
    required this.port,
    required this.lastSeen,
    this.publicKey,
    required this.capabilities,
  });

  factory NetworkDevice.fromJson(Map<String, dynamic> json) => 
      _$NetworkDeviceFromJson(json);
  Map<String, dynamic> toJson() => _$NetworkDeviceToJson(this);
}

enum MessageType {
  discover,
  announce,
  syncRequest,
  syncResponse,
  warehouseUpdate,
  invite,
  joinRequest,
  permissionGrant,
  ping,
  pong
}

@JsonSerializable()
class NetworkMessage {
  final String id;
  final MessageType type;
  final String senderId;
  final String? receiverId;
  final DateTime timestamp;
  final Map<String, dynamic> payload;
  final bool? encrypted;
  final String? signature;

  const NetworkMessage({
    required this.id,
    required this.type,
    required this.senderId,
    this.receiverId,
    required this.timestamp,
    required this.payload,
    this.encrypted,
    this.signature,
  });

  factory NetworkMessage.fromJson(Map<String, dynamic> json) => 
      _$NetworkMessageFromJson(json);
  Map<String, dynamic> toJson() => _$NetworkMessageToJson(this);
}

@JsonSerializable()
class SyncData {
  final List<Warehouse> warehouses;
  final int version;
  final String checksum;

  const SyncData({
    required this.warehouses,
    required this.version,
    required this.checksum,
  });

  factory SyncData.fromJson(Map<String, dynamic> json) => 
      _$SyncDataFromJson(json);
  Map<String, dynamic> toJson() => _$SyncDataToJson(this);
}

@JsonSerializable()
class NetworkState {
  final bool isOnline;
  final List<NetworkDevice> discoveredDevices;
  final NetworkDevice localDevice;

  const NetworkState({
    required this.isOnline,
    required this.discoveredDevices,
    required this.localDevice,
  });

  factory NetworkState.fromJson(Map<String, dynamic> json) => 
      _$NetworkStateFromJson(json);
  Map<String, dynamic> toJson() => _$NetworkStateToJson(this);
}