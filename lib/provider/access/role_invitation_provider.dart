import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../../models/warehouse.dart';
import '../network/device_identity_provider.dart';
import '../storage/local_storage_provider.dart';

final roleInvitationProvider = StateNotifierProvider<RoleInvitationNotifier, RoleInvitationState>((ref) {
  return RoleInvitationNotifier(ref);
});

class RoleInvitationState {
  final List<RoleInvitation> pendingInvites;
  final List<RoleInvitation> sentInvites;
  final List<UserPermission> activePermissions;
  final bool isInitialized;
  final String? error;

  const RoleInvitationState({
    required this.pendingInvites,
    required this.sentInvites,
    required this.activePermissions,
    required this.isInitialized,
    this.error,
  });

  RoleInvitationState copyWith({
    List<RoleInvitation>? pendingInvites,
    List<RoleInvitation>? sentInvites,
    List<UserPermission>? activePermissions,
    bool? isInitialized,
    String? error,
  }) {
    return RoleInvitationState(
      pendingInvites: pendingInvites ?? this.pendingInvites,
      sentInvites: sentInvites ?? this.sentInvites,
      activePermissions: activePermissions ?? this.activePermissions,
      isInitialized: isInitialized ?? this.isInitialized,
      error: error,
    );
  }
}

class RoleInvitation {
  final String id;
  final String warehouseId;
  final String warehouseName;
  final String inviterId;
  final String inviterName;
  final String inviterIp;
  final String? inviteeId;
  final String? inviteeName;
  final String? inviteeIp;
  final UserRole role;
  final String? message;
  final DateTime createdAt;
  final InvitationStatus status;
  final DateTime? respondedAt;

  const RoleInvitation({
    required this.id,
    required this.warehouseId,
    required this.warehouseName,
    required this.inviterId,
    required this.inviterName,
    required this.inviterIp,
    this.inviteeId,
    this.inviteeName,
    this.inviteeIp,
    required this.role,
    this.message,
    required this.createdAt,
    required this.status,
    this.respondedAt,
  });

  RoleInvitation copyWith({
    InvitationStatus? status,
    DateTime? respondedAt,
    String? inviteeId,
    String? inviteeName,
    String? inviteeIp,
  }) {
    return RoleInvitation(
      id: id,
      warehouseId: warehouseId,
      warehouseName: warehouseName,
      inviterId: inviterId,
      inviterName: inviterName,
      inviterIp: inviterIp,
      inviteeId: inviteeId ?? this.inviteeId,
      inviteeName: inviteeName ?? this.inviteeName,
      inviteeIp: inviteeIp ?? this.inviteeIp,
      role: role,
      message: message,
      createdAt: createdAt,
      status: status ?? this.status,
      respondedAt: respondedAt ?? this.respondedAt,
    );
  }
}

enum InvitationStatus {
  pending,
  accepted,
  declined,
  expired,
}

class RoleInvitationNotifier extends StateNotifier<RoleInvitationState> {
  final Ref _ref;
  static const String _invitationsKey = 'role_invitations';
  static const String _permissionsKey = 'user_permissions';
  
  RoleInvitationNotifier(this._ref) : super(const RoleInvitationState(
    pendingInvites: [],
    sentInvites: [],
    activePermissions: [],
    isInitialized: false,
  )) {
    _loadInvitations();
  }

  Future<void> _loadInvitations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Загрузить приглашения
      final invitationsJson = prefs.getString(_invitationsKey);
      List<RoleInvitation> allInvitations = [];
      if (invitationsJson != null) {
        final List<dynamic> invitationsList = jsonDecode(invitationsJson);
        allInvitations = invitationsList.map((json) => _roleInvitationFromJson(json)).toList();
      }

      // Загрузить активные разрешения
      final permissionsJson = prefs.getString(_permissionsKey);
      List<UserPermission> permissions = [];
      if (permissionsJson != null) {
        final List<dynamic> permissionsList = jsonDecode(permissionsJson);
        permissions = permissionsList.map((json) => UserPermission.fromJson(json)).toList();
      }

      final deviceIdentity = _ref.read(deviceIdentityProvider);
      final pendingInvites = allInvitations
          .where((inv) => inv.inviteeId == deviceIdentity?.id && inv.status == InvitationStatus.pending)
          .toList();
      
      final sentInvites = allInvitations
          .where((inv) => inv.inviterId == deviceIdentity?.id)
          .toList();

      state = state.copyWith(
        pendingInvites: pendingInvites,
        sentInvites: sentInvites,
        activePermissions: permissions,
        isInitialized: true,
      );
    } catch (e) {
      state = state.copyWith(
        error: 'Failed to load invitations: $e',
        isInitialized: true,
      );
    }
  }

  Future<bool> sendRoleInvite({
    required String targetDeviceIp,
    required int targetPort,
    required String warehouseId,
    required UserRole role,
    String? message,
  }) async {
    try {
      final deviceIdentity = _ref.read(deviceIdentityProvider);
      if (deviceIdentity == null) {
        state = state.copyWith(error: 'Device not initialized');
        return false;
      }

      final storageState = _ref.read(localStorageProvider);
      final warehouse = storageState.warehouses
          .where((w) => w.id == warehouseId)
          .firstOrNull;

      if (warehouse == null) {
        state = state.copyWith(error: 'Warehouse not found');
        return false;
      }

      final inviteId = const Uuid().v4();
      
      final invitation = RoleInvitation(
        id: inviteId,
        warehouseId: warehouseId,
        warehouseName: warehouse.name,
        inviterId: deviceIdentity.id,
        inviterName: deviceIdentity.name,
        inviterIp: deviceIdentity.ipAddress,
        role: role,
        message: message,
        createdAt: DateTime.now(),
        status: InvitationStatus.pending,
      );

      // Отправить приглашение по HTTP
      final client = HttpClient();
      final request = await client.postUrl(Uri.parse('http://$targetDeviceIp:$targetPort/api/v1/role-invite'));
      request.headers.set('Content-Type', 'application/json');
      
      final requestData = {
        'warehouseId': warehouseId,
        'inviteId': inviteId,
        'inviterName': deviceIdentity.name,
        'inviterIp': deviceIdentity.ipAddress,
        'role': role.name,
        'message': message,
      };
      
      request.write(jsonEncode(requestData));
      
      final response = await request.close();
      
      if (response.statusCode == 200) {
        // Сохранить отправленное приглашение
        final updatedSentInvites = [...state.sentInvites, invitation];
        await _saveInvitations();
        
        state = state.copyWith(
          sentInvites: updatedSentInvites,
          error: null,
        );
        return true;
      } else {
        final responseBody = await response.transform(utf8.decoder).join();
        final data = jsonDecode(responseBody);
        state = state.copyWith(error: data['error'] ?? 'Failed to send invite');
        return false;
      }
    } catch (e) {
      state = state.copyWith(error: 'Failed to send role invite: $e');
      return false;
    }
  }

  Future<void> respondToInvite(String inviteId, bool accepted) async {
    try {
      final inviteIndex = state.pendingInvites.indexWhere((inv) => inv.id == inviteId);
      if (inviteIndex == -1) {
        state = state.copyWith(error: 'Invitation not found');
        return;
      }

      final invite = state.pendingInvites[inviteIndex];
      final deviceIdentity = _ref.read(deviceIdentityProvider);
      if (deviceIdentity == null) {
        state = state.copyWith(error: 'Device not initialized');
        return;
      }

      // Отправить ответ на приглашение
      final client = HttpClient();
      final request = await client.postUrl(Uri.parse('http://${invite.inviterIp}:53317/api/v1/role-response'));
      request.headers.set('Content-Type', 'application/json');
      
      final responseData = {
        'inviteId': inviteId,
        'accepted': accepted,
        'responderId': deviceIdentity.id,
        'responderName': deviceIdentity.name,
      };
      
      request.write(jsonEncode(responseData));
      await request.close();

      // Обновить локальное состояние
      final updatedInvite = invite.copyWith(
        status: accepted ? InvitationStatus.accepted : InvitationStatus.declined,
        respondedAt: DateTime.now(),
        inviteeId: deviceIdentity.id,
        inviteeName: deviceIdentity.name,
        inviteeIp: deviceIdentity.ipAddress,
      );

      final updatedPendingInvites = [...state.pendingInvites];
      updatedPendingInvites.removeAt(inviteIndex);

      // Если принято - добавить в активные разрешения
      List<UserPermission> updatedPermissions = [...state.activePermissions];
      if (accepted) {
        final permission = UserPermission(
          userId: deviceIdentity.id,
          role: invite.role,
          grantedAt: DateTime.now(),
          grantedBy: invite.inviterId,
        );
        updatedPermissions.add(permission);
      }

      await _saveInvitations();
      await _savePermissions(updatedPermissions);

      state = state.copyWith(
        pendingInvites: updatedPendingInvites,
        activePermissions: updatedPermissions,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(error: 'Failed to respond to invite: $e');
    }
  }

  Future<void> _saveInvitations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final allInvitations = [...state.pendingInvites, ...state.sentInvites];
      final invitationsJson = jsonEncode(allInvitations.map((inv) => _roleInvitationToJson(inv)).toList());
      await prefs.setString(_invitationsKey, invitationsJson);
    } catch (e) {
      state = state.copyWith(error: 'Failed to save invitations: $e');
    }
  }

  Future<void> _savePermissions(List<UserPermission> permissions) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final permissionsJson = jsonEncode(permissions.map((p) => p.toJson()).toList());
      await prefs.setString(_permissionsKey, permissionsJson);
    } catch (e) {
      state = state.copyWith(error: 'Failed to save permissions: $e');
    }
  }

  // Проверка роли пользователя для склада
  UserRole? getUserRole(String warehouseId, String userId) {
    final permission = state.activePermissions
        .where((p) => p.userId == userId)
        .firstOrNull;
    return permission?.role;
  }

  // Проверка доступа к операции
  bool hasAccess(String warehouseId, String userId, {required bool isOwner}) {
    if (isOwner) return true; // Владелец всегда имеет доступ
    
    final role = getUserRole(warehouseId, userId);
    return role != null; // Любая роль дает базовый доступ
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  // Вспомогательные методы для JSON сериализации (временно, пока не генерируется)
  Map<String, dynamic> _roleInvitationToJson(RoleInvitation invitation) {
    return {
      'id': invitation.id,
      'warehouseId': invitation.warehouseId,
      'warehouseName': invitation.warehouseName,
      'inviterId': invitation.inviterId,
      'inviterName': invitation.inviterName,
      'inviterIp': invitation.inviterIp,
      'inviteeId': invitation.inviteeId,
      'inviteeName': invitation.inviteeName,
      'inviteeIp': invitation.inviteeIp,
      'role': invitation.role.name,
      'message': invitation.message,
      'createdAt': invitation.createdAt.toIso8601String(),
      'status': invitation.status.name,
      'respondedAt': invitation.respondedAt?.toIso8601String(),
    };
  }

  RoleInvitation _roleInvitationFromJson(Map<String, dynamic> json) {
    return RoleInvitation(
      id: json['id'],
      warehouseId: json['warehouseId'],
      warehouseName: json['warehouseName'],
      inviterId: json['inviterId'],
      inviterName: json['inviterName'],
      inviterIp: json['inviterIp'],
      inviteeId: json['inviteeId'],
      inviteeName: json['inviteeName'],
      inviteeIp: json['inviteeIp'],
      role: UserRole.values.firstWhere((r) => r.name == json['role']),
      message: json['message'],
      createdAt: DateTime.parse(json['createdAt']),
      status: InvitationStatus.values.firstWhere((s) => s.name == json['status']),
      respondedAt: json['respondedAt'] != null ? DateTime.parse(json['respondedAt']) : null,
    );
  }
}