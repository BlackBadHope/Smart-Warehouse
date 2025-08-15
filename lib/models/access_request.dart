import 'package:json_annotation/json_annotation.dart';

part 'access_request.g.dart';

@JsonSerializable()
class AccessRequest {
  final String id;
  final String warehouseId;
  final String warehouseName;
  final String requesterId;
  final String requesterName;
  final String requesterIp;
  final DateTime requestTime;
  final AccessRequestStatus status;
  final String? message;
  final DateTime? responseTime;

  const AccessRequest({
    required this.id,
    required this.warehouseId,
    required this.warehouseName,
    required this.requesterId,
    required this.requesterName,
    required this.requesterIp,
    required this.requestTime,
    required this.status,
    this.message,
    this.responseTime,
  });

  factory AccessRequest.fromJson(Map<String, dynamic> json) => _$AccessRequestFromJson(json);
  Map<String, dynamic> toJson() => _$AccessRequestToJson(this);

  AccessRequest copyWith({
    AccessRequestStatus? status,
    String? message,
    DateTime? responseTime,
  }) {
    return AccessRequest(
      id: id,
      warehouseId: warehouseId,
      warehouseName: warehouseName,
      requesterId: requesterId,
      requesterName: requesterName,
      requesterIp: requesterIp,
      requestTime: requestTime,
      status: status ?? this.status,
      message: message ?? this.message,
      responseTime: responseTime ?? this.responseTime,
    );
  }
}

@JsonEnum()
enum AccessRequestStatus {
  pending,
  approved,
  denied,
  expired,
}