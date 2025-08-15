// Главный экран со списком складов
// Следуем UX паттернам из оригинального приложения

import 'dart:async';
import 'package:flutter/material.dart';
import '../models/warehouse.dart';
import '../services/database_service.dart';
import '../services/p2p_server.dart';
import '../services/device_discovery.dart';
import '../services/qr_service.dart';
import '../services/sync_service.dart';
import 'warehouse_detail_screen.dart';

class WarehouseListScreen extends StatefulWidget {
  const WarehouseListScreen({super.key});

  @override
  State<WarehouseListScreen> createState() => _WarehouseListScreenState();
}

class _WarehouseListScreenState extends State<WarehouseListScreen> {
  final DatabaseService _dbService = DatabaseService();
  final P2PServer _p2pServer = P2PServer();
  final DeviceDiscovery _discovery = DeviceDiscovery();
  final SyncService _syncService = SyncService();
  
  List<Warehouse> _warehouses = [];
  List<DeviceInfo> _discoveredDevices = [];
  bool _isLoading = true;
  bool _isP2PEnabled = false;

  @override
  void initState() {
    super.initState();
    _loadWarehouses();
    _initP2P();
  }

  @override
  void dispose() {
    _p2pServer.stop();
    _discovery.stopScanning();
    super.dispose();
  }

  Future<void> _initP2P() async {
    try {
      final started = await _p2pServer.start();
      if (started) {
        await _discovery.startScanning();
        setState(() => _isP2PEnabled = true);
        
        // Периодически обновляем список устройств
        Timer.periodic(const Duration(seconds: 5), (timer) {
          if (mounted && _isP2PEnabled) {
            setState(() {
              _discoveredDevices = _discovery.discoveredDevices;
            });
          } else {
            timer.cancel();
          }
        });
      }
    } catch (e) {
      print('P2P initialization failed: $e');
    }
  }

  Future<void> _loadWarehouses() async {
    setState(() => _isLoading = true);
    try {
      final warehouses = await _dbService.getWarehouses();
      setState(() {
        _warehouses = warehouses;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка загрузки: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _showCreateWarehouseDialog() async {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    bool isPrivate = true;

    final result = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Создать склад'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Название склада',
                      hintText: 'Например: Основной склад',
                    ),
                    autofocus: true,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Описание (опционально)',
                      hintText: 'Краткое описание склада',
                    ),
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Приватный склад'),
                    subtitle: Text(isPrivate 
                        ? 'Только вы можете видеть этот склад' 
                        : 'Склад будет доступен для обмена по P2P'),
                    value: isPrivate,
                    onChanged: (value) {
                      setDialogState(() => isPrivate = value);
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Отмена'),
                ),
                ElevatedButton(
                  onPressed: () {
                    if (nameController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Введите название склада')),
                      );
                      return;
                    }
                    Navigator.of(context).pop(true);
                  },
                  child: const Text('Создать'),
                ),
              ],
            );
          },
        );
      },
    );

    if (result == true && nameController.text.trim().isNotEmpty) {
      try {
        final warehouse = Warehouse(
          name: nameController.text.trim(),
          description: descriptionController.text.trim(),
          isPrivate: isPrivate,
          ownerId: 'default-user', // В будущем заменить на реальный user ID
        );
        
        await _dbService.createWarehouse(warehouse);
        await _loadWarehouses();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Склад успешно создан!')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Ошибка создания: ${e.toString()}')),
          );
        }
      }
    }
  }

  Future<void> _deleteWarehouse(Warehouse warehouse) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Удалить склад'),
          content: Text('Вы уверены, что хотите удалить склад "${warehouse.name}"? '
                       'Все данные будут безвозвратно потеряны.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Отмена'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              child: const Text('Удалить'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      try {
        await _dbService.deleteWarehouse(warehouse.id);
        await _loadWarehouses();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Склад удален')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Ошибка удаления: ${e.toString()}')),
          );
        }
      }
    }
  }

  Future<void> _showP2PDialog() async {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.wifi, color: Colors.green),
              const SizedBox(width: 8),
              const Text('P2P устройства'),
              const Spacer(),
              Text(
                '${_discoveredDevices.length}',
                style: const TextStyle(fontSize: 16, color: Colors.green),
              ),
            ],
          ),
          content: SizedBox(
            width: double.maxFinite,
            height: 300,
            child: _discoveredDevices.isEmpty
                ? const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search, size: 48, color: Colors.grey),
                      SizedBox(height: 16),
                      Text('Поиск устройств...'),
                      SizedBox(height: 8),
                      Text(
                        'Убедитесь что на других устройствах запущено приложение',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  )
                : ListView.builder(
                    itemCount: _discoveredDevices.length,
                    itemBuilder: (context, index) {
                      final device = _discoveredDevices[index];
                      return ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Colors.green,
                          child: Icon(Icons.phone_android, color: Colors.white),
                        ),
                        title: Text(device.name),
                        subtitle: Text('${device.ip}:${device.port}'),
                        trailing: ElevatedButton(
                          onPressed: () => _connectToDevice(device),
                          child: const Text('Подключиться'),
                        ),
                      );
                    },
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                _discovery.clearDevices();
                setState(() => _discoveredDevices.clear());
              },
              child: const Text('Очистить'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Закрыть'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _connectToDevice(DeviceInfo device) async {
    try {
      // Получаем информацию о складах с другого устройства
      final warehouses = await _discovery.getWarehousesFromDevice(device);
      
      if (warehouses != null && warehouses.isNotEmpty) {
        if (mounted) {
          Navigator.of(context).pop(); // Close P2P dialog
          
          // Показываем список складов для синхронизации
          _showSyncWarehousesDialog(device, warehouses);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Нет доступных складов на ${device.name}')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка подключения: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _showSyncWarehousesDialog(DeviceInfo device, List<Map<String, dynamic>> warehouses) async {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Склады на ${device.name}'),
          content: SizedBox(
            width: double.maxFinite,
            height: 300,
            child: ListView.builder(
              itemCount: warehouses.length,
              itemBuilder: (context, index) {
                final warehouse = warehouses[index];
                return ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Colors.blue,
                    child: Icon(Icons.inventory_2, color: Colors.white),
                  ),
                  title: Text(warehouse['name'] ?? 'Без названия'),
                  subtitle: Text(warehouse['description'] ?? ''),
                  trailing: ElevatedButton(
                    onPressed: () {
                      // TODO: Implement warehouse sync
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Синхронизация скоро будет доступна')),
                      );
                    },
                    child: const Text('Синхронизировать'),
                  ),
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Закрыть'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _performFullSync() async {
    if (!_isP2PEnabled || _discoveredDevices.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Нет доступных устройств для синхронизации'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Показать диалог с прогрессом
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return const AlertDialog(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Синхронизация с устройствами...'),
            ],
          ),
        );
      },
    );

    try {
      // Выполняем синхронизацию со всеми найденными устройствами
      final results = await _syncService.syncWithAllDevices();
      
      if (mounted) {
        Navigator.of(context).pop(); // Закрыть диалог прогресса
        
        // Подсчитываем результаты
        int totalWarehouses = 0;
        int totalRooms = 0;
        int totalItems = 0;
        int successfulSyncs = 0;
        List<String> errors = [];

        for (final result in results) {
          if (result.success) {
            successfulSyncs++;
            totalWarehouses += result.warehouses;
            totalRooms += result.rooms;
            totalItems += result.items;
          } else {
            errors.add(result.error ?? 'Неизвестная ошибка');
          }
        }

        // Обновляем UI
        await _loadWarehouses();

        // Показываем результаты
        final message = successfulSyncs > 0 
          ? 'Синхронизация завершена!\n'
            'Устройств: $successfulSyncs/${results.length}\n'
            'Складов: $totalWarehouses, Комнат: $totalRooms'
          : 'Синхронизация не удалась';

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: successfulSyncs > 0 ? Colors.green : Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );

        // Если есть ошибки, показываем их
        if (errors.isNotEmpty && errors.length < results.length) {
          showDialog(
            context: context,
            builder: (BuildContext context) {
              return AlertDialog(
                title: const Text('Предупреждения синхронизации'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Частичная синхронизация ($successfulSyncs/${results.length})'),
                    const SizedBox(height: 8),
                    ...errors.map((error) => Text('• $error')),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('ОК'),
                  ),
                ],
              );
            },
          );
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // Закрыть диалог прогресса
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка синхронизации: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildWarehouseCard(Warehouse warehouse) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: warehouse.isPrivate 
              ? Colors.orange 
              : Colors.green,
          child: Icon(
            warehouse.isPrivate 
                ? Icons.lock 
                : Icons.share,
            color: Colors.white,
          ),
        ),
        title: Text(
          warehouse.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (warehouse.description.isNotEmpty) ...[
              Text(warehouse.description),
              const SizedBox(height: 4),
            ],
            Text(
              warehouse.isPrivate ? 'Приватный' : 'Публичный',
              style: TextStyle(
                color: warehouse.isPrivate ? Colors.orange : Colors.green,
                fontSize: 12,
              ),
            ),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            if (value == 'delete') {
              _deleteWarehouse(warehouse);
            }
          },
          itemBuilder: (BuildContext context) => [
            const PopupMenuItem<String>(
              value: 'delete',
              child: ListTile(
                leading: Icon(Icons.delete, color: Colors.red),
                title: Text('Удалить'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ],
        ),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => WarehouseDetailScreen(warehouse: warehouse),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory OS'),
        actions: [
          // P2P Status indicator
          if (_isP2PEnabled)
            IconButton(
              icon: Stack(
                children: [
                  const Icon(Icons.wifi),
                  if (_discoveredDevices.isNotEmpty)
                    Positioned(
                      right: 0,
                      top: 0,
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          '${_discoveredDevices.length}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
              onPressed: _showP2PDialog,
            ),
          
          // QR Actions
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'show_qr':
                  QRService.showConnectionQR(context);
                  break;
                case 'scan_qr':
                  QRService.showQRScanner(context);
                  break;
                case 'sync_all':
                  _performFullSync();
                  break;
                case 'refresh':
                  _loadWarehouses();
                  break;
              }
            },
            itemBuilder: (BuildContext context) => [
              if (_isP2PEnabled) ...[
                const PopupMenuItem<String>(
                  value: 'show_qr',
                  child: ListTile(
                    leading: Icon(Icons.qr_code),
                    title: Text('Показать QR код'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem<String>(
                  value: 'scan_qr',
                  child: ListTile(
                    leading: Icon(Icons.qr_code_scanner),
                    title: Text('Сканировать QR код'),
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
                const PopupMenuItem<String>(
                  value: 'sync_all',
                  child: ListTile(
                    leading: Icon(Icons.sync, color: Colors.blue),
                    title: Text('Синхронизация'),
                    subtitle: Text('Обновить данные со всех устройств'),
                    contentPadding: EdgeInsets.zero,
                    isThreeLine: false,
                  ),
                ),
                const PopupMenuDivider(),
              ],
              const PopupMenuItem<String>(
                value: 'refresh',
                child: ListTile(
                  leading: Icon(Icons.refresh),
                  title: Text('Обновить'),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _warehouses.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.inventory_2_outlined,
                        size: 80,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Нет складов',
                        style: TextStyle(
                          fontSize: 24,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Создайте свой первый склад',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[500],
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _showCreateWarehouseDialog,
                        icon: const Icon(Icons.add),
                        label: const Text('Создать склад'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadWarehouses,
                  child: ListView.builder(
                    itemCount: _warehouses.length,
                    itemBuilder: (context, index) {
                      return _buildWarehouseCard(_warehouses[index]);
                    },
                  ),
                ),
      floatingActionButton: _warehouses.isNotEmpty
          ? FloatingActionButton(
              onPressed: _showCreateWarehouseDialog,
              child: const Icon(Icons.add),
            )
          : null,
    );
  }
}