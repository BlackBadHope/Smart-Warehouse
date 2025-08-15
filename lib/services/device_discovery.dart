// Device Discovery service через multicast DNS
// Следует LocalSend протоколу для автообнаружения устройств

import 'dart:io';
import 'dart:convert';
import 'package:multicast_dns/multicast_dns.dart';
import 'package:http/http.dart' as http;

class DeviceInfo {
  final String id;
  final String name;
  final String ip;
  final int port;
  final String protocol;
  final DateTime discoveredAt;

  DeviceInfo({
    required this.id,
    required this.name,
    required this.ip,
    required this.port,
    required this.protocol,
    required this.discoveredAt,
  });

  factory DeviceInfo.fromJson(Map<String, dynamic> json) {
    return DeviceInfo(
      id: json['fingerprint'] ?? json['id'] ?? 'unknown',
      name: json['alias'] ?? json['name'] ?? 'Unknown Device',
      ip: json['ip'] ?? '',
      port: json['port'] ?? 53317,
      protocol: json['protocol'] ?? 'unknown',
      discoveredAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'ip': ip,
      'port': port,
      'protocol': protocol,
      'discovered_at': discoveredAt.millisecondsSinceEpoch,
    };
  }

  @override
  String toString() => 'Device($name @ $ip:$port)';
}

class DeviceDiscovery {
  static DeviceDiscovery? _instance;
  MDnsClient? _mdnsClient;
  final Map<String, DeviceInfo> _discoveredDevices = {};
  bool _isScanning = false;

  DeviceDiscovery._internal();

  factory DeviceDiscovery() {
    _instance ??= DeviceDiscovery._internal();
    return _instance!;
  }

  // Getters
  bool get isScanning => _isScanning;
  List<DeviceInfo> get discoveredDevices => _discoveredDevices.values.toList();

  // Начать сканирование сети - LocalSend style mDNS
  Future<void> startScanning() async {
    if (_isScanning) return;

    try {
      _isScanning = true;
      _mdnsClient = MDnsClient();
      await _mdnsClient!.start();

      // Scan for LocalSend-compatible devices
      await _scanMDns();
      
      // Also scan local network с HTTP запросами
      await _scanLocalNetwork();

      print('Device discovery started');
    } catch (e) {
      print('Failed to start device discovery: $e');
      _isScanning = false;
    }
  }

  // Остановить сканирование
  Future<void> stopScanning() async {
    if (!_isScanning) return;

    try {
      if (_mdnsClient != null) {
        _mdnsClient!.stop();
      }
      _mdnsClient = null;
      _isScanning = false;
      print('Device discovery stopped');
    } catch (e) {
      print('Error stopping device discovery: $e');
    }
  }

  // mDNS scanning - как в LocalSend
  Future<void> _scanMDns() async {
    if (_mdnsClient == null) return;

    try {
      // Look for LocalSend service type
      await for (final PtrResourceRecord ptr in _mdnsClient!.lookup<PtrResourceRecord>(
        ResourceRecordQuery.serverPointer('_localsend._tcp.local'),
      )) {
        // Found a LocalSend device, get its details
        await for (final SrvResourceRecord srv in _mdnsClient!.lookup<SrvResourceRecord>(
          ResourceRecordQuery.service(ptr.domainName),
        )) {
          _checkDevice(srv.target, srv.port);
        }
      }
    } catch (e) {
      print('mDNS scan error: $e');
    }
  }

  // Сканирование локальной сети - fallback method
  Future<void> _scanLocalNetwork() async {
    try {
      // Получаем локальный IP диапазон
      final interfaces = await NetworkInterface.list();
      final localIPs = <String>[];

      for (final interface in interfaces) {
        for (final address in interface.addresses) {
          if (address.type == InternetAddressType.IPv4 && 
              !address.isLoopback &&
              (address.address.startsWith('192.168.') || 
               address.address.startsWith('10.') ||
               address.address.startsWith('172.'))) {
            localIPs.add(address.address);
          }
        }
      }

      // Сканируем подсети
      for (final localIP in localIPs) {
        final subnet = localIP.substring(0, localIP.lastIndexOf('.'));
        await _scanSubnet(subnet);
      }
    } catch (e) {
      print('Local network scan error: $e');
    }
  }

  // Сканирование подсети 
  Future<void> _scanSubnet(String subnet) async {
    final futures = <Future>[];

    // Сканируем первые 50 адресов (для производительности)
    for (int i = 1; i <= 50; i++) {
      final ip = '$subnet.$i';
      futures.add(_checkDevice(ip, 53317));
    }

    await Future.wait(futures);
  }

  // Проверка устройства через HTTP запрос к /api/info
  Future<void> _checkDevice(String ip, int port) async {
    try {
      final url = 'http://$ip:$port/api/info';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        
        // Проверяем что это совместимое устройство
        final protocol = data['protocol'] as String?;
        if (protocol != null && 
            (protocol.contains('localsend') || 
             protocol.contains('inventory-p2p'))) {
          
          final deviceInfo = DeviceInfo.fromJson({
            ...data,
            'ip': ip,
            'port': port,
          });

          // Добавляем в список если новое
          if (!_discoveredDevices.containsKey(deviceInfo.id)) {
            _discoveredDevices[deviceInfo.id] = deviceInfo;
            print('Discovered device: $deviceInfo');
          }
        }
      }
    } catch (e) {
      // Device not reachable или не поддерживает протокол, игнорируем
    }
  }

  // Подключение к устройству по QR данным
  Future<DeviceInfo?> connectByQR(String qrData) async {
    try {
      final data = jsonDecode(qrData) as Map<String, dynamic>;
      
      final ip = data['ip'] as String?;
      final port = data['port'] as int?;
      
      if (ip == null || port == null) {
        throw Exception('Invalid QR data: missing ip or port');
      }

      // Проверяем доступность устройства
      await _checkDevice(ip, port);
      
      // Возвращаем найденное устройство
      final device = _discoveredDevices.values
          .where((d) => d.ip == ip && d.port == port)
          .firstOrNull;
          
      return device;
    } catch (e) {
      print('QR connect error: $e');
      return null;
    }
  }

  // Регистрация на другом устройстве
  Future<bool> registerWithDevice(DeviceInfo device, Map<String, dynamic> ourInfo) async {
    try {
      final url = 'http://${device.ip}:${device.port}/api/register';
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(ourInfo),
      ).timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (e) {
      print('Registration failed with ${device.name}: $e');
      return false;
    }
  }

  // Получение складов с другого устройства
  Future<List<Map<String, dynamic>>?> getWarehousesFromDevice(DeviceInfo device) async {
    try {
      final url = 'http://${device.ip}:${device.port}/api/warehouses';
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return List<Map<String, dynamic>>.from(data['warehouses'] ?? []);
      }
      return null;
    } catch (e) {
      print('Failed to get warehouses from ${device.name}: $e');
      return null;
    }
  }

  // Очистка списка устройств
  void clearDevices() {
    _discoveredDevices.clear();
  }

  // Удаление устройства
  void removeDevice(String deviceId) {
    _discoveredDevices.remove(deviceId);
  }

  // Получение подключенных устройств (для совместимости с SyncService)
  List<DeviceInfo> getConnectedDevices() {
    return discoveredDevices;
  }
}