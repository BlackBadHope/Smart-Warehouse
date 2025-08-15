import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../provider/storage/local_storage_provider.dart';
import '../provider/network/server/server_provider.dart';
import '../provider/network/device_identity_provider.dart';
import '../provider/network/discovery/device_discovery_provider.dart';
import '../models/warehouse.dart';
import '../widgets/warehouse_card.dart';
import '../widgets/network_debug_panel.dart';
import 'warehouse_detail_screen.dart';
import 'qr_scanner_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  bool _showNetworkDebug = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final storageState = ref.watch(localStorageProvider);
    final serverState = ref.watch(serverProvider);
    final deviceIdentity = ref.watch(deviceIdentityProvider);
    final discoveryState = ref.watch(deviceDiscoveryProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Inventory OS'),
            if (deviceIdentity != null)
              Text(
                '${deviceIdentity.name} • ${deviceIdentity.ipAddress}:${deviceIdentity.port}',
                style: const TextStyle(fontSize: 12, color: Colors.white70),
              ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.warehouse), text: 'Warehouses'),
            Tab(icon: Icon(Icons.devices), text: 'Network'),
            Tab(icon: Icon(Icons.settings), text: 'Settings'),
          ],
        ),
        actions: [
          // Network status indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: serverState.isRunning ? Colors.green : Colors.red,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  serverState.isRunning ? Icons.wifi : Icons.wifi_off,
                  size: 16,
                  color: Colors.white,
                ),
                const SizedBox(width: 4),
                Text(
                  serverState.isRunning ? 'Online' : 'Offline',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(_showNetworkDebug ? Icons.visibility_off : Icons.bug_report),
            onPressed: () {
              setState(() {
                _showNetworkDebug = !_showNetworkDebug;
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Network debug panel (collapsible)
          if (_showNetworkDebug) const NetworkDebugPanel(),
          
          // Main content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildWarehousesTab(),
                _buildNetworkTab(),
                _buildSettingsTab(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: _tabController.index == 0
        ? FloatingActionButton(
            onPressed: _createWarehouse,
            child: const Icon(Icons.add),
          )
        : null,
    );
  }

  Widget _buildWarehousesTab() {
    final storageState = ref.watch(localStorageProvider);

    if (storageState.warehouses.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.warehouse,
              size: 64,
              color: Color(0xFF6B7280), // gray-500
            ),
            SizedBox(height: 16),
            Text(
              'No warehouses yet',
              style: TextStyle(fontSize: 18, color: Color(0xFF6B7280), fontFamily: 'monospace'),
            ),
            SizedBox(height: 8),
            Text(
              'Tap + to create your first warehouse',
              style: TextStyle(color: Color(0xFF6B7280), fontFamily: 'monospace'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: storageState.warehouses.length,
      itemBuilder: (context, index) {
        final warehouse = storageState.warehouses[index];
        return WarehouseCard(
          warehouse: warehouse,
          onTap: () => _openWarehouse(warehouse),
        );
      },
    );
  }

  Widget _buildNetworkTab() {
    final discoveryState = ref.watch(deviceDiscoveryProvider);
    final deviceIdentity = ref.watch(deviceIdentityProvider);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Local device info
          Card(
            child: ListTile(
              leading: const Icon(Icons.phone_android, color: Colors.blue),
              title: Text(deviceIdentity?.name ?? 'Unknown Device'),
              subtitle: Text('${deviceIdentity?.ipAddress ?? '0.0.0.0'}:${deviceIdentity?.port ?? 0}'),
              trailing: const Chip(
                label: Text('This Device'),
                backgroundColor: Colors.blue,
                labelStyle: TextStyle(color: Colors.white),
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Discovered devices
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Discovered Devices (${discoveryState.discoveredDevices.length})',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: () {
                      ref.read(deviceDiscoveryProvider.notifier).announcePresence();
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.qr_code_scanner),
                    onPressed: _scanQRCode,
                  ),
                ],
              ),
            ],
          ),
          
          Expanded(
            child: discoveryState.discoveredDevices.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search, size: 64, color: Color(0xFF6B7280)), // gray-500
                      SizedBox(height: 16),
                      Text(
                        'No devices found',
                        style: TextStyle(fontSize: 18, color: Color(0xFF6B7280), fontFamily: 'monospace'),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Make sure other devices are on the same network',
                        style: TextStyle(color: Color(0xFF6B7280), fontFamily: 'monospace'),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: discoveryState.discoveredDevices.length,
                  itemBuilder: (context, index) {
                    final device = discoveryState.discoveredDevices[index];
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.devices),
                        title: Text(device.name),
                        subtitle: Text('${device.ipAddress}:${device.port}'),
                        trailing: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _formatLastSeen(device.lastSeen),
                              style: const TextStyle(fontSize: 12),
                            ),
                            Wrap(
                              spacing: 4,
                              children: device.capabilities.map((cap) => 
                                Chip(
                                  label: Text(cap),
                                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                )
                              ).toList(),
                            ),
                          ],
                        ),
                        onTap: () => _connectToDevice(device),
                      ),
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTab() {
    final serverState = ref.watch(serverProvider);
    
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.info),
                title: const Text('App Info'),
                subtitle: const Text('Inventory OS v2.6.0'),
              ),
              ListTile(
                leading: Icon(
                  serverState.isRunning ? Icons.check_circle : Icons.error,
                  color: serverState.isRunning ? Colors.green : Colors.red,
                ),
                title: const Text('P2P Server'),
                subtitle: Text(
                  serverState.isRunning 
                    ? 'Running on port ${serverState.port}'
                    : 'Not running'
                ),
                trailing: Switch(
                  value: serverState.isRunning,
                  onChanged: (value) async {
                    final notifier = ref.read(serverProvider.notifier);
                    if (value) {
                      await notifier.startServer();
                    } else {
                      await notifier.stopServer();
                    }
                  },
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.storage),
                title: const Text('Clear All Data'),
                subtitle: const Text('Remove all warehouses and items'),
                trailing: const Icon(Icons.warning, color: Colors.red),
                onTap: _clearAllData,
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatLastSeen(DateTime lastSeen) {
    final diff = DateTime.now().difference(lastSeen);
    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else {
      return '${diff.inHours}h ago';
    }
  }

  void _createWarehouse() {
    final nameController = TextEditingController();
    bool isPublic = false;
    bool networkVisible = false;
    bool encryptionEnabled = false;
    
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Create Warehouse'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Warehouse Name',
                    hintText: 'Enter warehouse name',
                  ),
                  autofocus: true,
                ),
                const SizedBox(height: 20),
                
                // Access Level
                const Text(
                  'Access Level',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFFB923C), // orange-400
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF18181B), // zinc-900
                    border: Border.all(color: const Color(0xFFEAB308), width: 1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(
                            isPublic ? Icons.public : Icons.lock,
                            color: isPublic ? const Color(0xFF4ADE80) : const Color(0xFFF87171), // green/red
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            isPublic ? 'Public' : 'Private',
                            style: TextStyle(
                              color: isPublic ? const Color(0xFF4ADE80) : const Color(0xFFF87171),
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          Switch(
                            value: isPublic,
                            onChanged: (value) {
                              setState(() {
                                isPublic = value;
                                // Если приватный, отключаем сетевую видимость
                                if (!isPublic) {
                                  networkVisible = false;
                                }
                              });
                            },
                            activeColor: const Color(0xFF4ADE80), // green-400
                            inactiveThumbColor: const Color(0xFFF87171), // red-400
                          ),
                        ],
                      ),
                      if (isPublic) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(
                              Icons.wifi,
                              color: Color(0xFF818CF8), // indigo-400
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Network Visible',
                              style: TextStyle(
                                color: Color(0xFFFBBF24), // yellow-400
                                fontFamily: 'monospace',
                              ),
                            ),
                            const Spacer(),
                            Switch(
                              value: networkVisible,
                              onChanged: (value) {
                                setState(() {
                                  networkVisible = value;
                                });
                              },
                              activeColor: const Color(0xFF818CF8), // indigo-400
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(
                              Icons.security,
                              color: Color(0xFF4ADE80), // green-400
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Encryption',
                              style: TextStyle(
                                color: Color(0xFFFBBF24), // yellow-400
                                fontFamily: 'monospace',
                              ),
                            ),
                            const Spacer(),
                            Switch(
                              value: encryptionEnabled,
                              onChanged: (value) {
                                setState(() {
                                  encryptionEnabled = value;
                                });
                              },
                              activeColor: const Color(0xFF4ADE80), // green-400
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final name = nameController.text.trim();
                if (name.isEmpty) return;
                
                // Create warehouse с выбранными настройками
                final warehouse = Warehouse(
                  id: const Uuid().v4(),
                  name: name,
                  createdAt: DateTime.now(),
                  rooms: [],
                  ownerId: 'local-user',
                  accessControl: WarehouseAccessControl(
                    accessLevel: isPublic ? AccessLevel.public : AccessLevel.private,
                    permissions: [],
                    encryptionEnabled: encryptionEnabled,
                  ),
                  networkVisible: networkVisible,
                  syncVersion: 1,
                );
                
                // Save to storage
                await ref.read(localStorageProvider.notifier).saveWarehouse(warehouse);
                
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Created warehouse: $name'),
                    backgroundColor: const Color(0xFF14532D), // green-900
                  ),
                );
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _openWarehouse(Warehouse warehouse) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => WarehouseDetailScreen(warehouse: warehouse),
      ),
    );
  }

  void _scanQRCode() async {
    try {
      // Проверяем разрешения
      final hasPermission = await _checkCameraPermission();
      if (!hasPermission) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Camera permission required for QR scanning')),
          );
        }
        return;
      }

      // Показываем QR сканер
      final result = await Navigator.push<String>(
        context,
        MaterialPageRoute(
          builder: (context) => const QRScannerScreen(),
        ),
      );

      if (result != null && mounted) {
        // Обрабатываем результат QR кода
        await _processQRCode(result);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('QR scanning error: ${e.toString()}')),
        );
      }
    }
  }

  Future<bool> _checkCameraPermission() async {
    try {
      // В мобильном контексте требуется проверка разрешений
      // Пока возвращаем true для упрощения
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> _processQRCode(String qrData) async {
    try {
      // Парсим QR код (ожидаем JSON с информацией об устройстве)
      final data = Uri.tryParse(qrData);
      if (data != null && data.scheme == 'inventory') {
        // Формат: inventory://device?name=DeviceName&ip=192.168.1.1&port=53317
        final deviceName = data.queryParameters['name'] ?? 'Unknown Device';
        final deviceIP = data.queryParameters['ip'];
        final devicePort = data.queryParameters['port'];
        
        if (deviceIP != null && devicePort != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Found device: $deviceName at $deviceIP:$devicePort'),
              backgroundColor: Colors.green,
            ),
          );
          
          // Добавляем устройство в список обнаруженных
          // TODO: Добавить в deviceDiscoveryProvider
        } else {
          throw FormatException('Invalid QR code format');
        }
      } else {
        throw FormatException('QR code is not an Inventory OS device code');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Invalid QR code: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _connectToDevice(device) {
    // Простое соединение без передачи данных
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Connected to ${device.name} - no data transfer'),
        backgroundColor: const Color(0xFF14532D), // green-900
      ),
    );
  }

  void _clearAllData() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear All Data'),
        content: const Text(
          'This will permanently delete all warehouses, rooms, shelves, and items. '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              try {
                // Очищаем все данные через storage provider
                final storageNotifier = ref.read(localStorageProvider.notifier);
                await storageNotifier.clearAllData();
                
                Navigator.pop(context);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('All data cleared successfully'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (e) {
                Navigator.pop(context);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Error clearing data: ${e.toString()}'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Clear All'),
          ),
        ],
      ),
    );
  }
}