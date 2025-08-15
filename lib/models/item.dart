import 'package:json_annotation/json_annotation.dart';

part 'item.g.dart';

enum Priority { high, normal, low, dispose }

enum Unit { pcs, kg, g, l, ml, box, pack }

enum EntityType { warehouse, room, shelf }

@JsonSerializable()
class ItemCore {
  final String name;
  final String? category;
  final int quantity;
  final Unit? unit;
  final double? price;
  final String? currency;
  final String? purchaseDate;
  final String? expiryDate;
  final Priority priority;
  final String? description;
  final List<String>? labels;
  final String? barcode;
  final DateTime? createdAt;
  final String ownerId;
  final bool isPublic;
  final String createdBy;
  final DateTime? lastModifiedAt;
  final String? lastModifiedBy;

  const ItemCore({
    required this.name,
    this.category,
    required this.quantity,
    this.unit,
    this.price,
    this.currency,
    this.purchaseDate,
    this.expiryDate,
    required this.priority,
    this.description,
    this.labels,
    this.barcode,
    this.createdAt,
    required this.ownerId,
    required this.isPublic,
    required this.createdBy,
    this.lastModifiedAt,
    this.lastModifiedBy,
  });

  factory ItemCore.fromJson(Map<String, dynamic> json) => _$ItemCoreFromJson(json);
  Map<String, dynamic> toJson() => _$ItemCoreToJson(this);
}

@JsonSerializable()
class Item extends ItemCore {
  final String id;

  const Item({
    required this.id,
    required super.name,
    super.category,
    required super.quantity,
    super.unit,
    super.price,
    super.currency,
    super.purchaseDate,
    super.expiryDate,
    required super.priority,
    super.description,
    super.labels,
    super.barcode,
    super.createdAt,
    required super.ownerId,
    required super.isPublic,
    required super.createdBy,
    super.lastModifiedAt,
    super.lastModifiedBy,
  });

  factory Item.fromJson(Map<String, dynamic> json) => _$ItemFromJson(json);
  @override
  Map<String, dynamic> toJson() => _$ItemToJson(this);
}

@JsonSerializable()
class BucketDestination {
  final String warehouseId;
  final String warehouseName;
  final String roomId;
  final String roomName;
  final String shelfId;
  final String shelfName;

  const BucketDestination({
    required this.warehouseId,
    required this.warehouseName,
    required this.roomId,
    required this.roomName,
    required this.shelfId,
    required this.shelfName,
  });

  factory BucketDestination.fromJson(Map<String, dynamic> json) => 
      _$BucketDestinationFromJson(json);
  Map<String, dynamic> toJson() => _$BucketDestinationToJson(this);
}

@JsonSerializable()
class BucketItem extends Item {
  final String? originalPath;
  final BucketDestination? destination;
  final bool? isReadyToTransfer;

  const BucketItem({
    required super.id,
    required super.name,
    super.category,
    required super.quantity,
    super.unit,
    super.price,
    super.currency,
    super.purchaseDate,
    super.expiryDate,
    required super.priority,
    super.description,
    super.labels,
    super.barcode,
    super.createdAt,
    required super.ownerId,
    required super.isPublic,
    required super.createdBy,
    super.lastModifiedAt,
    super.lastModifiedBy,
    this.originalPath,
    this.destination,
    this.isReadyToTransfer,
  });

  factory BucketItem.fromJson(Map<String, dynamic> json) => 
      _$BucketItemFromJson(json);
  @override
  Map<String, dynamic> toJson() => _$BucketItemToJson(this);
}