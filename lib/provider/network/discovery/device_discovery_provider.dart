import 'dart:io';
import 'dart:convert';
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:network_info_plus/network_info_plus.dart';
import '../../../models/network.dart';
import '../device_identity_provider.dart';

final deviceDiscoveryProvider = StateNotifierProvider<DeviceDiscoveryNotifier, DeviceDiscoveryState>((ref) {
  return DeviceDiscoveryNotifier(ref);
});

class DeviceDiscoveryState {
  final bool isScanning;
  final List<NetworkDevice> discoveredDevices;
  final String? error;
  final List<String> logs;

  const DeviceDiscoveryState({
    required this.isScanning,
    required this.discoveredDevices,
    this.error,
    required this.logs,
  });

  DeviceDiscoveryState copyWith({
    bool? isScanning,
    List<NetworkDevice>? discoveredDevices,
    String? error,
    List<String>? logs,
  }) {
    return DeviceDiscoveryState(
      isScanning: isScanning ?? this.isScanning,
      discoveredDevices: discoveredDevices ?? this.discoveredDevices,
      error: error,
      logs: logs ?? this.logs,
    );
  }
}

class DeviceDiscoveryNotifier extends StateNotifier<DeviceDiscoveryState> {
  final Ref _ref;
  RawDatagramSocket? _multicastSocket;
  Timer? _scanTimer;
  Timer? _cleanupTimer;

  DeviceDiscoveryNotifier(this._ref) : super(const DeviceDiscoveryState(
    isScanning: false,
    discoveredDevices: [],
    logs: [],
  )) {
    _startMulticastListener();
    _startPeriodicCleanup();
  }

  // Method 1: Multicast Discovery (Primary method like LocalSend)
  Future<void> _startMulticastListener() async {
    try {
      _addLog('Starting multicast listener...');
      
      _multicastSocket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 53317);
      _multicastSocket!.multicastHops = 1;
      _multicastSocket!.joinMulticast(InternetAddress('224.0.0.167'));
      
      _multicastSocket!.listen((RawSocketEvent event) {
        if (event == RawSocketEvent.read) {
          final datagram = _multicastSocket!.receive();
          if (datagram != null) {
            _handleMulticastMessage(datagram);
          }
        }
      });
      
      _addLog('Multicast listener started on 224.0.0.167:53317');
    } catch (e) {
      _addLog('Failed to start multicast listener: $e');
    }
  }

  void _handleMulticastMessage(Datagram datagram) {
    try {
      final message = utf8.decode(datagram.data);
      final data = jsonDecode(message) as Map<String, dynamic>;
      
      // Don't add ourselves
      final localDevice = _ref.read(deviceIdentityProvider);
      if (localDevice != null && data['id'] == localDevice.id) {
        return;
      }
      
      final device = NetworkDevice(
        id: data['id'] as String,
        name: data['name'] as String,
        ipAddress: data['ip'] as String,
        port: data['port'] as int,
        lastSeen: DateTime.now(),
        capabilities: (data['capabilities'] as List).cast<String>(),
      );
      
      _addOrUpdateDevice(device);
      _addLog('Discovered device via multicast: ${device.name}');
    } catch (e) {
      _addLog('Error parsing multicast message: $e');
    }
  }

  // Method 2: Legacy TCP Scan (Fallback like LocalSend)
  Future<void> startLegacyScan() async {
    if (state.isScanning) return;

    try {
      state = state.copyWith(isScanning: true);
      _addLog('Starting legacy TCP scan...');
      
      final subnet = await _getSubnet();
      if (subnet == null) {
        _addLog('Could not determine subnet');
        state = state.copyWith(isScanning: false);
        return;
      }
      
      _addLog('Scanning subnet: $subnet.x');
      
      // Scan range 1-254 (skip .0 and .255)
      final futures = <Future>[];
      for (int i = 1; i < 255; i++) {
        final ip = '$subnet.$i';
        futures.add(_scanDevice(ip));
      }
      
      await Future.wait(futures);
      
      state = state.copyWith(isScanning: false);
      _addLog('Legacy scan completed');
    } catch (e) {
      _addLog('Legacy scan error: $e');
      state = state.copyWith(isScanning: false, error: 'Scan failed: $e');
    }
  }

  // Method 3: Favorites Scan (Known devices like LocalSend)
  Future<void> scanFavorites(List<String> favoriteIps) async {
    _addLog('Scanning ${favoriteIps.length} favorite devices...');
    
    final futures = favoriteIps.map((ip) => _scanDevice(ip));
    await Future.wait(futures);
    
    _addLog('Favorites scan completed');
  }

  Future<String?> _getSubnet() async {
    try {
      final info = NetworkInfo();
      final ip = await info.getWifiIP();
      
      if (ip != null && ip.contains('.')) {
        final parts = ip.split('.');
        if (parts.length >= 3) {
          return '${parts[0]}.${parts[1]}.${parts[2]}';
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<void> _scanDevice(String ip) async {
    try {
      // Try to connect to device on standard port
      final url = 'http://$ip:53317/api/v1/info';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 2));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        
        final device = NetworkDevice(
          id: data['id'] as String,
          name: data['name'] as String,
          ipAddress: data['ip'] as String,
          port: data['port'] as int,
          lastSeen: DateTime.now(),
          capabilities: (data['capabilities'] as List).cast<String>(),
        );
        
        _addOrUpdateDevice(device);
        _addLog('Found device via TCP: ${device.name} at $ip');
      }
    } catch (e) {
      // Silent fail for individual device scans
    }
  }

  void _addOrUpdateDevice(NetworkDevice device) {
    final devices = [...state.discoveredDevices];
    
    // Remove existing device with same ID
    devices.removeWhere((d) => d.id == device.id);
    
    // Add new/updated device
    devices.add(device);
    
    // Sort by last seen (most recent first)
    devices.sort((a, b) => b.lastSeen.compareTo(a.lastSeen));
    
    state = state.copyWith(discoveredDevices: devices);
  }

  void _startPeriodicCleanup() {
    _cleanupTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      _cleanupOldDevices();
    });
  }

  void _cleanupOldDevices() {
    final cutoff = DateTime.now().subtract(const Duration(minutes: 10));
    final devices = state.discoveredDevices
        .where((device) => device.lastSeen.isAfter(cutoff))
        .toList();
    
    if (devices.length != state.discoveredDevices.length) {
      final removed = state.discoveredDevices.length - devices.length;
      _addLog('Cleaned up $removed old devices');
      state = state.copyWith(discoveredDevices: devices);
    }
  }

  Future<void> announcePresence() async {
    try {
      final device = _ref.read(deviceIdentityProvider);
      if (device == null) return;

      final socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);
      
      final announcement = {
        'id': device.id,
        'name': device.name,
        'ip': device.ipAddress,
        'port': device.port,
        'capabilities': device.capabilities,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };

      final data = utf8.encode(jsonEncode(announcement));
      socket.send(data, InternetAddress('224.0.0.167'), 53317);
      socket.close();
      
      _addLog('Announced presence to network');
    } catch (e) {
      _addLog('Failed to announce presence: $e');
    }
  }

  Future<bool> pingDevice(NetworkDevice device) async {
    try {
      final url = 'http://${device.ipAddress}:${device.port}/api/v1/ping';
      final response = await http.get(Uri.parse(url))
          .timeout(const Duration(seconds: 3));
      
      if (response.statusCode == 200) {
        // Update last seen time
        final updatedDevice = NetworkDevice(
          id: device.id,
          name: device.name,
          ipAddress: device.ipAddress,
          port: device.port,
          lastSeen: DateTime.now(),
          publicKey: device.publicKey,
          capabilities: device.capabilities,
        );
        
        _addOrUpdateDevice(updatedDevice);
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  void removeDevice(String deviceId) {
    final devices = state.discoveredDevices
        .where((device) => device.id != deviceId)
        .toList();
    
    state = state.copyWith(discoveredDevices: devices);
    _addLog('Removed device: $deviceId');
  }

  void clearDevices() {
    state = state.copyWith(discoveredDevices: []);
    _addLog('Cleared all discovered devices');
  }

  void _addLog(String message) {
    final timestamp = DateTime.now().toString().substring(11, 19);
    final logMessage = '[$timestamp] $message';
    
    final newLogs = [...state.logs, logMessage];
    final logs = newLogs.length > 50 ? newLogs.sublist(newLogs.length - 50) : newLogs;
    
    state = state.copyWith(logs: logs);
  }

  @override
  void dispose() {
    _multicastSocket?.close();
    _scanTimer?.cancel();
    _cleanupTimer?.cancel();
    super.dispose();
  }
}