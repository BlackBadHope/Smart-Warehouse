// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ItemCore _$ItemCoreFromJson(Map<String, dynamic> json) => ItemCore(
      name: json['name'] as String,
      category: json['category'] as String?,
      quantity: (json['quantity'] as num).toInt(),
      unit: $enumDecodeNullable(_$UnitEnumMap, json['unit']),
      price: (json['price'] as num?)?.toDouble(),
      currency: json['currency'] as String?,
      purchaseDate: json['purchaseDate'] as String?,
      expiryDate: json['expiryDate'] as String?,
      priority: $enumDecode(_$PriorityEnumMap, json['priority']),
      description: json['description'] as String?,
      labels:
          (json['labels'] as List<dynamic>?)?.map((e) => e as String).toList(),
      barcode: json['barcode'] as String?,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      ownerId: json['ownerId'] as String,
      isPublic: json['isPublic'] as bool,
      createdBy: json['createdBy'] as String,
      lastModifiedAt: json['lastModifiedAt'] == null
          ? null
          : DateTime.parse(json['lastModifiedAt'] as String),
      lastModifiedBy: json['lastModifiedBy'] as String?,
    );

Map<String, dynamic> _$ItemCoreToJson(ItemCore instance) => <String, dynamic>{
      'name': instance.name,
      'category': instance.category,
      'quantity': instance.quantity,
      'unit': _$UnitEnumMap[instance.unit],
      'price': instance.price,
      'currency': instance.currency,
      'purchaseDate': instance.purchaseDate,
      'expiryDate': instance.expiryDate,
      'priority': _$PriorityEnumMap[instance.priority]!,
      'description': instance.description,
      'labels': instance.labels,
      'barcode': instance.barcode,
      'createdAt': instance.createdAt?.toIso8601String(),
      'ownerId': instance.ownerId,
      'isPublic': instance.isPublic,
      'createdBy': instance.createdBy,
      'lastModifiedAt': instance.lastModifiedAt?.toIso8601String(),
      'lastModifiedBy': instance.lastModifiedBy,
    };

const _$UnitEnumMap = {
  Unit.pcs: 'pcs',
  Unit.kg: 'kg',
  Unit.g: 'g',
  Unit.l: 'l',
  Unit.ml: 'ml',
  Unit.box: 'box',
  Unit.pack: 'pack',
};

const _$PriorityEnumMap = {
  Priority.high: 'high',
  Priority.normal: 'normal',
  Priority.low: 'low',
  Priority.dispose: 'dispose',
};

Item _$ItemFromJson(Map<String, dynamic> json) => Item(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String?,
      quantity: (json['quantity'] as num).toInt(),
      unit: $enumDecodeNullable(_$UnitEnumMap, json['unit']),
      price: (json['price'] as num?)?.toDouble(),
      currency: json['currency'] as String?,
      purchaseDate: json['purchaseDate'] as String?,
      expiryDate: json['expiryDate'] as String?,
      priority: $enumDecode(_$PriorityEnumMap, json['priority']),
      description: json['description'] as String?,
      labels:
          (json['labels'] as List<dynamic>?)?.map((e) => e as String).toList(),
      barcode: json['barcode'] as String?,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      ownerId: json['ownerId'] as String,
      isPublic: json['isPublic'] as bool,
      createdBy: json['createdBy'] as String,
      lastModifiedAt: json['lastModifiedAt'] == null
          ? null
          : DateTime.parse(json['lastModifiedAt'] as String),
      lastModifiedBy: json['lastModifiedBy'] as String?,
    );

Map<String, dynamic> _$ItemToJson(Item instance) => <String, dynamic>{
      'name': instance.name,
      'category': instance.category,
      'quantity': instance.quantity,
      'unit': _$UnitEnumMap[instance.unit],
      'price': instance.price,
      'currency': instance.currency,
      'purchaseDate': instance.purchaseDate,
      'expiryDate': instance.expiryDate,
      'priority': _$PriorityEnumMap[instance.priority]!,
      'description': instance.description,
      'labels': instance.labels,
      'barcode': instance.barcode,
      'createdAt': instance.createdAt?.toIso8601String(),
      'ownerId': instance.ownerId,
      'isPublic': instance.isPublic,
      'createdBy': instance.createdBy,
      'lastModifiedAt': instance.lastModifiedAt?.toIso8601String(),
      'lastModifiedBy': instance.lastModifiedBy,
      'id': instance.id,
    };

BucketDestination _$BucketDestinationFromJson(Map<String, dynamic> json) =>
    BucketDestination(
      warehouseId: json['warehouseId'] as String,
      warehouseName: json['warehouseName'] as String,
      roomId: json['roomId'] as String,
      roomName: json['roomName'] as String,
      shelfId: json['shelfId'] as String,
      shelfName: json['shelfName'] as String,
    );

Map<String, dynamic> _$BucketDestinationToJson(BucketDestination instance) =>
    <String, dynamic>{
      'warehouseId': instance.warehouseId,
      'warehouseName': instance.warehouseName,
      'roomId': instance.roomId,
      'roomName': instance.roomName,
      'shelfId': instance.shelfId,
      'shelfName': instance.shelfName,
    };

BucketItem _$BucketItemFromJson(Map<String, dynamic> json) => BucketItem(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String?,
      quantity: (json['quantity'] as num).toInt(),
      unit: $enumDecodeNullable(_$UnitEnumMap, json['unit']),
      price: (json['price'] as num?)?.toDouble(),
      currency: json['currency'] as String?,
      purchaseDate: json['purchaseDate'] as String?,
      expiryDate: json['expiryDate'] as String?,
      priority: $enumDecode(_$PriorityEnumMap, json['priority']),
      description: json['description'] as String?,
      labels:
          (json['labels'] as List<dynamic>?)?.map((e) => e as String).toList(),
      barcode: json['barcode'] as String?,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      ownerId: json['ownerId'] as String,
      isPublic: json['isPublic'] as bool,
      createdBy: json['createdBy'] as String,
      lastModifiedAt: json['lastModifiedAt'] == null
          ? null
          : DateTime.parse(json['lastModifiedAt'] as String),
      lastModifiedBy: json['lastModifiedBy'] as String?,
      originalPath: json['originalPath'] as String?,
      destination: json['destination'] == null
          ? null
          : BucketDestination.fromJson(
              json['destination'] as Map<String, dynamic>),
      isReadyToTransfer: json['isReadyToTransfer'] as bool?,
    );

Map<String, dynamic> _$BucketItemToJson(BucketItem instance) =>
    <String, dynamic>{
      'name': instance.name,
      'category': instance.category,
      'quantity': instance.quantity,
      'unit': _$UnitEnumMap[instance.unit],
      'price': instance.price,
      'currency': instance.currency,
      'purchaseDate': instance.purchaseDate,
      'expiryDate': instance.expiryDate,
      'priority': _$PriorityEnumMap[instance.priority]!,
      'description': instance.description,
      'labels': instance.labels,
      'barcode': instance.barcode,
      'createdAt': instance.createdAt?.toIso8601String(),
      'ownerId': instance.ownerId,
      'isPublic': instance.isPublic,
      'createdBy': instance.createdBy,
      'lastModifiedAt': instance.lastModifiedAt?.toIso8601String(),
      'lastModifiedBy': instance.lastModifiedBy,
      'id': instance.id,
      'originalPath': instance.originalPath,
      'destination': instance.destination,
      'isReadyToTransfer': instance.isReadyToTransfer,
    };
