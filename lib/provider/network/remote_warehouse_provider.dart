import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../widgets/remote_warehouse_card.dart';
import '../network/discovery/device_discovery_provider.dart';
import '../network/device_identity_provider.dart';

final remoteWarehouseProvider = StateNotifierProvider<RemoteWarehouseNotifier, RemoteWarehouseState>((ref) {
  return RemoteWarehouseNotifier(ref);
});

class RemoteWarehouseState {
  final List<RemoteWarehouse> warehouses;
  final bool isLoading;
  final String? error;

  const RemoteWarehouseState({
    required this.warehouses,
    required this.isLoading,
    this.error,
  });

  RemoteWarehouseState copyWith({
    List<RemoteWarehouse>? warehouses,
    bool? isLoading,
    String? error,
  }) {
    return RemoteWarehouseState(
      warehouses: warehouses ?? this.warehouses,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class RemoteWarehouseNotifier extends StateNotifier<RemoteWarehouseState> {
  final Ref _ref;
  
  RemoteWarehouseNotifier(this._ref) : super(const RemoteWarehouseState(
    warehouses: [],
    isLoading: false,
  ));

  Future<void> discoverWarehouses() async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final discoveryState = _ref.read(deviceDiscoveryProvider);
      final List<RemoteWarehouse> allWarehouses = [];
      
      // Для каждого найденного устройства запрашиваем склады
      for (final device in discoveryState.discoveredDevices) {
        if (device.capabilities.contains('warehouses')) {
          final warehouses = await _fetchWarehousesFromDevice(device);
          allWarehouses.addAll(warehouses);
        }
      }
      
      state = state.copyWith(
        warehouses: allWarehouses,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to discover warehouses: $e',
      );
    }
  }

  Future<List<RemoteWarehouse>> _fetchWarehousesFromDevice(device) async {
    try {
      final client = HttpClient();
      final request = await client.getUrl(Uri.parse('http://${device.ipAddress}:${device.port}/api/v1/warehouses'));
      request.headers.set('Content-Type', 'application/json');
      
      final response = await request.close();
      
      if (response.statusCode == 200) {
        final responseBody = await response.transform(utf8.decoder).join();
        final data = jsonDecode(responseBody);
        
        final List<dynamic> warehousesList = data['warehouses'] ?? [];
        
        return warehousesList.map((warehouseJson) => 
          RemoteWarehouse.fromJson(warehouseJson, device.name, device.ipAddress)
        ).toList();
      } else {
        throw Exception('HTTP ${response.statusCode}');
      }
    } catch (e) {
      // Игнорируем ошибки отдельных устройств
      return [];
    }
  }

  Future<bool> requestAccessToWarehouse(RemoteWarehouse warehouse, {String? message}) async {
    try {
      final deviceIdentity = _ref.read(deviceIdentityProvider);
      if (deviceIdentity == null) {
        state = state.copyWith(error: 'Device not initialized');
        return false;
      }

      final client = HttpClient();
      final request = await client.postUrl(Uri.parse('http://${warehouse.ownerIp}:53317/api/v1/access-request'));
      request.headers.set('Content-Type', 'application/json');
      
      final requestData = {
        'warehouseId': warehouse.id,
        'requesterId': deviceIdentity.id,
        'requesterName': deviceIdentity.name,
        'requesterIp': deviceIdentity.ipAddress,
        'message': message,
      };
      
      request.write(jsonEncode(requestData));
      
      final response = await request.close();
      
      if (response.statusCode == 200) {
        final responseBody = await response.transform(utf8.decoder).join();
        final data = jsonDecode(responseBody);
        
        if (data['status'] == 'request_created') {
          return true;
        }
      }
      
      final responseBody = await response.transform(utf8.decoder).join();
      final data = jsonDecode(responseBody);
      state = state.copyWith(error: data['error'] ?? 'Failed to send access request');
      return false;
    } catch (e) {
      state = state.copyWith(error: 'Failed to send access request: $e');
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}