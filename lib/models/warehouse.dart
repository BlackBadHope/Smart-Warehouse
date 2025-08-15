// Data models для inventory system
// Следуем архитектуре из оригинального проекта

import 'package:uuid/uuid.dart';
import '../services/device_discovery.dart';

const _uuid = Uuid();

class Warehouse {
  final String id;
  final String name;
  final String description;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isPrivate;
  final String ownerId;
  final Map<String, dynamic> metadata;

  Warehouse({
    String? id,
    required this.name,
    this.description = '',
    DateTime? createdAt,
    DateTime? updatedAt,
    this.isPrivate = true,
    required this.ownerId,
    Map<String, dynamic>? metadata,
  }) : 
    id = id ?? _uuid.v4(),
    createdAt = createdAt ?? DateTime.now(),
    updatedAt = updatedAt ?? DateTime.now(),
    metadata = metadata ?? {};

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'created_at': createdAt.millisecondsSinceEpoch,
      'updated_at': updatedAt.millisecondsSinceEpoch,
      'is_private': isPrivate ? 1 : 0,
      'owner_id': ownerId,
      'metadata': metadata,
    };
  }

  static Warehouse fromMap(Map<String, dynamic> map) {
    return Warehouse(
      id: map['id'],
      name: map['name'],
      description: map['description'] ?? '',
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at']),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(map['updated_at']),
      isPrivate: map['is_private'] == 1,
      ownerId: map['owner_id'],
      metadata: Map<String, dynamic>.from(map['metadata'] ?? {}),
    );
  }

  Warehouse copyWith({
    String? name,
    String? description,
    bool? isPrivate,
    Map<String, dynamic>? metadata,
  }) {
    return Warehouse(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      isPrivate: isPrivate ?? this.isPrivate,
      ownerId: ownerId,
      metadata: metadata ?? this.metadata,
    );
  }
}

class Room {
  final String id;
  final String warehouseId;
  final String name;
  final String description;
  final DateTime createdAt;
  final DateTime updatedAt;

  Room({
    String? id,
    required this.warehouseId,
    required this.name,
    this.description = '',
    DateTime? createdAt,
    DateTime? updatedAt,
  }) : 
    id = id ?? _uuid.v4(),
    createdAt = createdAt ?? DateTime.now(),
    updatedAt = updatedAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'warehouse_id': warehouseId,
      'name': name,
      'description': description,
      'created_at': createdAt.millisecondsSinceEpoch,
      'updated_at': updatedAt.millisecondsSinceEpoch,
    };
  }

  static Room fromMap(Map<String, dynamic> map) {
    return Room(
      id: map['id'],
      warehouseId: map['warehouse_id'],
      name: map['name'],
      description: map['description'] ?? '',
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at']),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(map['updated_at']),
    );
  }
}

class Shelf {
  final String id;
  final String roomId;
  final String name;
  final String description;
  final DateTime createdAt;
  final DateTime updatedAt;

  Shelf({
    String? id,
    required this.roomId,
    required this.name,
    this.description = '',
    DateTime? createdAt,
    DateTime? updatedAt,
  }) : 
    id = id ?? _uuid.v4(),
    createdAt = createdAt ?? DateTime.now(),
    updatedAt = updatedAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'room_id': roomId,
      'name': name,
      'description': description,
      'created_at': createdAt.millisecondsSinceEpoch,
      'updated_at': updatedAt.millisecondsSinceEpoch,
    };
  }

  static Shelf fromMap(Map<String, dynamic> map) {
    return Shelf(
      id: map['id'],
      roomId: map['room_id'],
      name: map['name'],
      description: map['description'] ?? '',
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at']),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(map['updated_at']),
    );
  }
}

class InventoryItem {
  final String id;
  final String shelfId;
  final String name;
  final String description;
  final int quantity;
  final double? price;
  final String currency;
  final List<String> tags;
  final String? barcode;
  final String? imageUrl;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, dynamic> customFields;

  // Alias for backwards compatibility with P2P server
  Map<String, dynamic> get metadata => customFields;

  InventoryItem({
    String? id,
    required this.shelfId,
    required this.name,
    this.description = '',
    this.quantity = 1,
    this.price,
    this.currency = 'USD',
    List<String>? tags,
    this.barcode,
    this.imageUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? customFields,
  }) : 
    id = id ?? _uuid.v4(),
    tags = tags ?? [],
    createdAt = createdAt ?? DateTime.now(),
    updatedAt = updatedAt ?? DateTime.now(),
    customFields = customFields ?? {};

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'shelf_id': shelfId,
      'name': name,
      'description': description,
      'quantity': quantity,
      'price': price,
      'currency': currency,
      'tags': tags.join(','),
      'barcode': barcode,
      'image_url': imageUrl,
      'created_at': createdAt.millisecondsSinceEpoch,
      'updated_at': updatedAt.millisecondsSinceEpoch,
      'custom_fields': customFields,
    };
  }

  static InventoryItem fromMap(Map<String, dynamic> map) {
    return InventoryItem(
      id: map['id'],
      shelfId: map['shelf_id'],
      name: map['name'],
      description: map['description'] ?? '',
      quantity: map['quantity'] ?? 1,
      price: map['price']?.toDouble(),
      currency: map['currency'] ?? 'USD',
      tags: (map['tags'] as String?)?.split(',').where((t) => t.isNotEmpty).toList() ?? [],
      barcode: map['barcode'],
      imageUrl: map['image_url'],
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at']),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(map['updated_at']),
      customFields: Map<String, dynamic>.from(map['custom_fields'] ?? {}),
    );
  }

  InventoryItem copyWith({
    String? name,
    String? description,
    int? quantity,
    double? price,
    String? currency,
    List<String>? tags,
    String? barcode,
    String? imageUrl,
    Map<String, dynamic>? customFields,
  }) {
    return InventoryItem(
      id: id,
      shelfId: shelfId,
      name: name ?? this.name,
      description: description ?? this.description,
      quantity: quantity ?? this.quantity,
      price: price ?? this.price,
      currency: currency ?? this.currency,
      tags: tags ?? this.tags,
      barcode: barcode ?? this.barcode,
      imageUrl: imageUrl ?? this.imageUrl,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
      customFields: customFields ?? this.customFields,
    );
  }
}

// Connected Device model for P2P networking
class ConnectedDevice {
  final String id;
  final String name;
  final String ip;
  final int port;
  final String protocol;
  final DateTime connectedAt;
  final bool isActive;

  ConnectedDevice({
    required this.id,
    required this.name,
    required this.ip,
    required this.port,
    required this.protocol,
    required this.connectedAt,
    this.isActive = true,
  });

  factory ConnectedDevice.fromDeviceInfo(DeviceInfo deviceInfo) {
    return ConnectedDevice(
      id: deviceInfo.id,
      name: deviceInfo.name,
      ip: deviceInfo.ip,
      port: deviceInfo.port,
      protocol: deviceInfo.protocol,
      connectedAt: deviceInfo.discoveredAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'ip': ip,
      'port': port,
      'protocol': protocol,
      'connected_at': connectedAt.millisecondsSinceEpoch,
      'is_active': isActive,
    };
  }

  @override
  String toString() => 'ConnectedDevice($name @ $ip:$port)';
}