// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'access_request.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AccessRequest _$AccessRequestFromJson(Map<String, dynamic> json) => AccessRequest(
      id: json['id'] as String,
      warehouseId: json['warehouseId'] as String,
      warehouseName: json['warehouseName'] as String,
      requesterId: json['requesterId'] as String,
      requesterName: json['requesterName'] as String,
      requesterIp: json['requesterIp'] as String,
      requestTime: DateTime.parse(json['requestTime'] as String),
      status: $enumDecode(_$AccessRequestStatusEnumMap, json['status']),
      message: json['message'] as String?,
      responseTime: json['responseTime'] == null
          ? null
          : DateTime.parse(json['responseTime'] as String),
    );

Map<String, dynamic> _$AccessRequestToJson(AccessRequest instance) =>
    <String, dynamic>{
      'id': instance.id,
      'warehouseId': instance.warehouseId,
      'warehouseName': instance.warehouseName,
      'requesterId': instance.requesterId,
      'requesterName': instance.requesterName,
      'requesterIp': instance.requesterIp,
      'requestTime': instance.requestTime.toIso8601String(),
      'status': _$AccessRequestStatusEnumMap[instance.status]!,
      'message': instance.message,
      'responseTime': instance.responseTime?.toIso8601String(),
    };

const _$AccessRequestStatusEnumMap = {
  AccessRequestStatus.pending: 'pending',
  AccessRequestStatus.approved: 'approved',
  AccessRequestStatus.denied: 'denied',
  AccessRequestStatus.expired: 'expired',
};

T $enumDecode<T>(
  Map<T, Object> enumValues,
  Object? source, {
  T? unknownValue,
}) {
  if (source == null) {
    throw ArgumentError(
      'A value must be provided. Supported values: '
      '${enumValues.values.join(', ')}',
    );
  }

  return enumValues.entries.singleWhere(
    (e) => e.value == source,
    orElse: () {
      if (unknownValue == null) {
        throw ArgumentError(
          '`$source` is not one of the supported values: '
          '${enumValues.values.join(', ')}',
        );
      }
      return MapEntry(unknownValue, enumValues.values.first);
    },
  ).key;
}