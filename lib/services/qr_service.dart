// QR Service для P2P соединений
// Генерация и сканирование QR кодов для подключения устройств

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'p2p_server.dart';
import 'device_discovery.dart';

class QRService {
  static QRService? _instance;
  
  QRService._internal();
  
  factory QRService() {
    _instance ??= QRService._internal();
    return _instance!;
  }

  // Генерация QR кода для подключения - как в LocalSend
  Future<String> generateConnectionQR() async {
    final server = P2PServer();
    
    if (!server.isRunning) {
      throw Exception('P2P Server not running');
    }

    final connectionInfo = server.getConnectionInfo();
    return jsonEncode(connectionInfo);
  }

  // Создание QR виджета
  Widget buildQRWidget(String qrData, {double size = 200}) {
    return QrImageView(
      data: qrData,
      version: QrVersions.auto,
      size: size,
      backgroundColor: Colors.white,
      foregroundColor: Colors.black,
    );
  }

  // Показать QR код в диалоге
  static Future<void> showConnectionQR(BuildContext context) async {
    final qrService = QRService();
    
    try {
      final qrData = await qrService.generateConnectionQR();
      
      if (!context.mounted) return;
      
      showDialog(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: const Text('Подключение по QR'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Отсканируйте этот QR код с другого устройства для подключения:',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: qrService.buildQRWidget(qrData),
                ),
                const SizedBox(height: 16),
                const Text(
                  'QR код содержит IP адрес и порт для прямого соединения',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
              ],
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
    } catch (e) {
      if (!context.mounted) return;
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Ошибка создания QR: ${e.toString()}')),
      );
    }
  }

  // Показать сканер QR кода
  static Future<void> showQRScanner(BuildContext context) async {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _QRScannerScreen(),
      ),
    );
  }
}

// Экран сканера QR кода
class _QRScannerScreen extends StatefulWidget {
  @override
  _QRScannerScreenState createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<_QRScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Сканировать QR код'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _controller.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onQRDetected,
          ),
          // Overlay с рамкой
          Container(
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.5),
            ),
            child: Center(
              child: Container(
                width: 250,
                height: 250,
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Colors.white,
                    width: 2,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Container(
                  margin: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: Colors.green,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ),
          // Инструкция
          Positioned(
            bottom: 100,
            left: 0,
            right: 0,
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Наведите камеру на QR код другого устройства',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
          // Loading indicator
          if (_isProcessing)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text(
                      'Подключение к устройству...',
                      style: TextStyle(color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _onQRDetected(BarcodeCapture capture) async {
    if (_isProcessing) return;
    
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    
    final qrData = barcodes.first.rawValue;
    if (qrData == null) return;

    setState(() => _isProcessing = true);

    try {
      // Парсим QR данные
      final data = jsonDecode(qrData);
      
      // Проверяем что это правильный формат
      if (data is Map<String, dynamic> && 
          data.containsKey('ip') && 
          data.containsKey('port')) {
        
        // Пытаемся подключиться к устройству
        final discovery = DeviceDiscovery();
        final device = await discovery.connectByQR(qrData);
        
        if (device != null) {
          if (mounted) {
            Navigator.of(context).pop();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Подключено к ${device.name}'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } else {
          throw Exception('Устройство не найдено или недоступно');
        }
      } else {
        throw Exception('Неверный формат QR кода');
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
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}