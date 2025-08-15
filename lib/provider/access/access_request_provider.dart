import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../../models/access_request.dart';

final accessRequestProvider = StateNotifierProvider<AccessRequestNotifier, AccessRequestState>((ref) {
  return AccessRequestNotifier();
});

class AccessRequestState {
  final List<AccessRequest> pendingRequests;
  final List<AccessRequest> allRequests;
  final bool isInitialized;
  final String? error;

  const AccessRequestState({
    required this.pendingRequests,
    required this.allRequests,
    required this.isInitialized,
    this.error,
  });

  AccessRequestState copyWith({
    List<AccessRequest>? pendingRequests,
    List<AccessRequest>? allRequests,
    bool? isInitialized,
    String? error,
  }) {
    return AccessRequestState(
      pendingRequests: pendingRequests ?? this.pendingRequests,
      allRequests: allRequests ?? this.allRequests,
      isInitialized: isInitialized ?? this.isInitialized,
      error: error,
    );
  }
}

class AccessRequestNotifier extends StateNotifier<AccessRequestState> {
  static const String _accessRequestsKey = 'access_requests';
  
  AccessRequestNotifier() : super(const AccessRequestState(
    pendingRequests: [],
    allRequests: [],
    isInitialized: false,
  )) {
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final requestsJson = prefs.getString(_accessRequestsKey);
      
      List<AccessRequest> requests = [];
      if (requestsJson != null) {
        final List<dynamic> requestsList = jsonDecode(requestsJson);
        requests = requestsList.map((json) => AccessRequest.fromJson(json)).toList();
        
        // Удаляем истёкшие запросы (старше 24 часов)
        final now = DateTime.now();
        requests = requests.where((request) => 
          now.difference(request.requestTime).inHours < 24
        ).toList();
        
        // Сохраняем очищенный список
        await _saveRequests(requests);
      }
      
      final pendingRequests = requests.where((r) => r.status == AccessRequestStatus.pending).toList();
      
      state = state.copyWith(
        allRequests: requests,
        pendingRequests: pendingRequests,
        isInitialized: true,
      );
    } catch (e) {
      state = state.copyWith(
        error: 'Failed to load access requests: $e',
        isInitialized: true,
      );
    }
  }

  Future<void> _saveRequests(List<AccessRequest> requests) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final requestsJson = jsonEncode(requests.map((r) => r.toJson()).toList());
      await prefs.setString(_accessRequestsKey, requestsJson);
    } catch (e) {
      state = state.copyWith(error: 'Failed to save access requests: $e');
    }
  }

  Future<void> createAccessRequest({
    required String warehouseId,
    required String warehouseName,
    required String requesterId,
    required String requesterName,
    required String requesterIp,
    String? message,
  }) async {
    try {
      // Проверяем, есть ли уже активный запрос от этого пользователя к этому складу
      final existingRequest = state.allRequests.where((r) => 
        r.warehouseId == warehouseId && 
        r.requesterId == requesterId && 
        r.status == AccessRequestStatus.pending
      ).firstOrNull;
      
      if (existingRequest != null) {
        state = state.copyWith(error: 'Access request already exists');
        return;
      }

      final request = AccessRequest(
        id: const Uuid().v4(),
        warehouseId: warehouseId,
        warehouseName: warehouseName,
        requesterId: requesterId,
        requesterName: requesterName,
        requesterIp: requesterIp,
        requestTime: DateTime.now(),
        status: AccessRequestStatus.pending,
        message: message,
      );

      final updatedRequests = [...state.allRequests, request];
      final updatedPendingRequests = [...state.pendingRequests, request];
      
      await _saveRequests(updatedRequests);
      
      state = state.copyWith(
        allRequests: updatedRequests,
        pendingRequests: updatedPendingRequests,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(error: 'Failed to create access request: $e');
    }
  }

  Future<void> respondToRequest(String requestId, AccessRequestStatus status, {String? message}) async {
    try {
      final requestIndex = state.allRequests.indexWhere((r) => r.id == requestId);
      if (requestIndex == -1) {
        state = state.copyWith(error: 'Request not found');
        return;
      }

      final updatedRequest = state.allRequests[requestIndex].copyWith(
        status: status,
        message: message,
        responseTime: DateTime.now(),
      );

      final updatedRequests = [...state.allRequests];
      updatedRequests[requestIndex] = updatedRequest;

      final updatedPendingRequests = state.pendingRequests
          .where((r) => r.id != requestId)
          .toList();

      await _saveRequests(updatedRequests);

      state = state.copyWith(
        allRequests: updatedRequests,
        pendingRequests: updatedPendingRequests,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(error: 'Failed to respond to request: $e');
    }
  }

  Future<void> approveRequest(String requestId) async {
    await respondToRequest(requestId, AccessRequestStatus.approved);
  }

  Future<void> denyRequest(String requestId, {String? reason}) async {
    await respondToRequest(requestId, AccessRequestStatus.denied, message: reason);
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  // Проверяет, есть ли доступ к складу
  bool hasAccessToWarehouse(String warehouseId, String userId) {
    // Владелец всегда имеет доступ (это будет проверяться отдельно)
    // Здесь проверяем только одобренные запросы
    return state.allRequests.any((request) => 
      request.warehouseId == warehouseId &&
      request.requesterId == userId &&
      request.status == AccessRequestStatus.approved
    );
  }

  // Получить количество ожидающих запросов
  int get pendingRequestsCount => state.pendingRequests.length;
}