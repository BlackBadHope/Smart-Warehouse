import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/network.dart';

final deviceIdentityProvider = StateNotifierProvider<DeviceIdentityNotifier, NetworkDevice?>((ref) {
  return DeviceIdentityNotifier();
});

class DeviceIdentityNotifier extends StateNotifier<NetworkDevice?> {
  static const String _deviceIdKey = 'device_id';
  static const String _deviceNameKey = 'device_name';
  static const int _defaultPort = 53317; // Same as LocalSend
  
  DeviceIdentityNotifier() : super(null) {
    _initializeDevice();
  }

  Future<void> _initializeDevice() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Get or create device ID
      String? deviceId = prefs.getString(_deviceIdKey);
      if (deviceId == null) {
        deviceId = const Uuid().v4();
        await prefs.setString(_deviceIdKey, deviceId);
      }

      // Get or create device name
      String? deviceName = prefs.getString(_deviceNameKey);
      if (deviceName == null) {
        deviceName = await _generateDeviceName();
        await prefs.setString(_deviceNameKey, deviceName);
      }

      // Get local IP address
      final ipAddress = await _getLocalIpAddress();

      state = NetworkDevice(
        id: deviceId,
        name: deviceName,
        ipAddress: ipAddress,
        port: _defaultPort,
        lastSeen: DateTime.now(),
        capabilities: ['warehouses', 'access-requests'], // Поддержка складов и запросов доступа
      );
    } catch (e) {
      // Fallback device
      state = NetworkDevice(
        id: const Uuid().v4(),
        name: 'Unknown Device',
        ipAddress: '127.0.0.1',
        port: _defaultPort,
        lastSeen: DateTime.now(),
        capabilities: ['warehouses', 'access-requests'], // Поддержка складов и запросов доступа
      );
    }
  }

  Future<String> _getLocalIpAddress() async {
    try {
      final info = NetworkInfo();
      
      // Try WiFi IP first
      final wifiIP = await info.getWifiIP();
      if (wifiIP != null && wifiIP != '127.0.0.1') {
        return wifiIP;
      }

      // Fallback to localhost
      return '127.0.0.1';
    } catch (e) {
      return '127.0.0.1';
    }
  }

  Future<String> _generateDeviceName() async {
    try {
      // Try to get WiFi name for device identification
      final info = NetworkInfo();
      final wifiName = await info.getWifiName();
      
      if (wifiName != null && wifiName.isNotEmpty) {
        return 'Inventory-${wifiName.replaceAll('"', '')}';
      }
      
      return 'Inventory-Device';
    } catch (e) {
      return 'Inventory-Device';
    }
  }

  Future<void> updateDeviceName(String newName) async {
    if (state == null) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_deviceNameKey, newName);

      state = NetworkDevice(
        id: state!.id,
        name: newName,
        ipAddress: state!.ipAddress,
        port: state!.port,
        lastSeen: DateTime.now(),
        publicKey: state!.publicKey,
        capabilities: state!.capabilities,
      );
    } catch (e) {
      // Ignore update errors
    }
  }

  Future<void> refreshIpAddress() async {
    if (state == null) return;

    try {
      final ipAddress = await _getLocalIpAddress();
      
      state = NetworkDevice(
        id: state!.id,
        name: state!.name,
        ipAddress: ipAddress,
        port: state!.port,
        lastSeen: DateTime.now(),
        publicKey: state!.publicKey,
        capabilities: state!.capabilities,
      );
    } catch (e) {
      // Ignore refresh errors
    }
  }

  String get connectionString {
    if (state == null) return '';
    return '${state!.ipAddress}:${state!.port}';
  }

  Map<String, dynamic> get deviceInfo {
    if (state == null) return {};
    
    return {
      'id': state!.id,
      'name': state!.name,
      'ip': state!.ipAddress,
      'port': state!.port,
      'capabilities': state!.capabilities,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };
  }
}