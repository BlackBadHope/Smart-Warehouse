import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class QRScannerScreen extends StatefulWidget {
  const QRScannerScreen({super.key});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController controller = MobileScannerController();
  bool isScanning = true;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (!isScanning) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final String? code = barcode.rawValue;
      if (code != null) {
        setState(() {
          isScanning = false;
        });
        
        // Возвращаем результат
        Navigator.pop(context, code);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR Code'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: controller.torchState,
              builder: (context, state, child) {
                switch (state) {
                  case TorchState.off:
                    return const Icon(Icons.flash_off, color: Colors.grey);
                  case TorchState.on:
                    return const Icon(Icons.flash_on, color: Colors.yellow);
                }
              },
            ),
            onPressed: () => controller.toggleTorch(),
          ),
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: controller.cameraFacingState,
              builder: (context, state, child) {
                return const Icon(Icons.camera_front);
              },
            ),
            onPressed: () => controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // QR Scanner
          MobileScanner(
            controller: controller,
            onDetect: _onDetect,
          ),
          
          // Overlay с рамкой
          Container(
            decoration: ShapeDecoration(
              shape: QrScannerOverlayShape(
                borderColor: Colors.white,
                borderRadius: 10,
                borderLength: 30,
                borderWidth: 10,
                cutOutSize: 250,
              ),
            ),
          ),
          
          // Инструкции
          Positioned(
            bottom: 100,
            left: 0,
            right: 0,
            child: Container(
              margin: const EdgeInsets.all(20),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.qr_code_scanner,
                    color: Colors.white,
                    size: 32,
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Point camera at QR code',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 4),
                  Text(
                    'QR code will be scanned automatically',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Кастомная рамка для QR сканера
class QrScannerOverlayShape extends ShapeBorder {
  const QrScannerOverlayShape({
    this.borderColor = Colors.red,
    this.borderWidth = 3.0,
    this.overlayColor = const Color.fromRGBO(0, 0, 0, 80),
    this.borderRadius = 0,
    this.borderLength = 40,
    this.cutOutSize = 250,
  });

  final Color borderColor;
  final double borderWidth;
  final Color overlayColor;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;

  @override
  EdgeInsetsGeometry get dimensions => const EdgeInsets.all(10);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path()
      ..fillType = PathFillType.evenOdd
      ..addPath(getOuterPath(rect), Offset.zero);
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    Path _getLeftTopPath(Rect rect) {
      return Path()
        ..moveTo(rect.left, rect.bottom)
        ..lineTo(rect.left, rect.top + borderRadius)
        ..quadraticBezierTo(rect.left, rect.top, rect.left + borderRadius, rect.top)
        ..lineTo(rect.right, rect.top);
    }

    return _getLeftTopPath(rect)
      ..lineTo(rect.right, rect.bottom)
      ..lineTo(rect.left, rect.bottom)
      ..lineTo(rect.left, rect.top);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final width = rect.width;
    final borderWidthSize = width / 2;
    final height = rect.height;
    final borderOffset = borderWidth / 2;
    final _cutOutSize = cutOutSize < width && cutOutSize < height
        ? cutOutSize
        : (width < height ? width : height) - borderOffset * 2;
    final _cutOutRadius = borderRadius + borderOffset;

    final _cutOutLeft = width / 2 - _cutOutSize / 2 + borderOffset;
    final _cutOutTop = height / 2 - _cutOutSize / 2 + borderOffset;

    final cutOutRect = Rect.fromLTWH(
      _cutOutLeft,
      _cutOutTop,
      _cutOutSize - borderOffset * 2,
      _cutOutSize - borderOffset * 2,
    );

    /// Outer Path
    final outerPath = Path()..addRect(rect);

    /// CutOut Path
    final cutOutPath = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          cutOutRect,
          Radius.circular(_cutOutRadius),
        ),
      );

    final overlayPaint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill
      ..blendMode = BlendMode.srcOut;

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;

    final cutOutPaint = Path.combine(
      PathOperation.difference,
      outerPath,
      cutOutPath,
    );

    /// Overlay
    canvas.drawPath(cutOutPaint, overlayPaint);

    /// Border
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        cutOutRect,
        Radius.circular(_cutOutRadius),
      ),
      borderPaint,
    );

    /// Border Corners
    final _borderLength = borderLength > _cutOutSize / 2 + borderOffset * 2
        ? _cutOutSize / 2 + borderOffset * 2
        : borderLength;
    final _radius = _cutOutRadius + borderOffset * 2;

    /// Top Left
    canvas.drawPath(
      Path()
        ..moveTo(_cutOutLeft - borderOffset + _radius, _cutOutTop - borderOffset)
        ..lineTo(_cutOutLeft - borderOffset + _borderLength, _cutOutTop - borderOffset)
        ..moveTo(_cutOutLeft - borderOffset, _cutOutTop - borderOffset + _radius)
        ..lineTo(_cutOutLeft - borderOffset, _cutOutTop - borderOffset + _borderLength),
      borderPaint,
    );

    /// Top Right
    canvas.drawPath(
      Path()
        ..moveTo(_cutOutLeft + _cutOutSize + borderOffset - _radius, _cutOutTop - borderOffset)
        ..lineTo(_cutOutLeft + _cutOutSize + borderOffset - _borderLength, _cutOutTop - borderOffset)
        ..moveTo(_cutOutLeft + _cutOutSize + borderOffset, _cutOutTop - borderOffset + _radius)
        ..lineTo(_cutOutLeft + _cutOutSize + borderOffset, _cutOutTop - borderOffset + _borderLength),
      borderPaint,
    );

    /// Bottom Left
    canvas.drawPath(
      Path()
        ..moveTo(_cutOutLeft - borderOffset + _radius, _cutOutTop + _cutOutSize + borderOffset)
        ..lineTo(_cutOutLeft - borderOffset + _borderLength, _cutOutTop + _cutOutSize + borderOffset)
        ..moveTo(_cutOutLeft - borderOffset, _cutOutTop + _cutOutSize + borderOffset - _radius)
        ..lineTo(_cutOutLeft - borderOffset, _cutOutTop + _cutOutSize + borderOffset - _borderLength),
      borderPaint,
    );

    /// Bottom Right
    canvas.drawPath(
      Path()
        ..moveTo(_cutOutLeft + _cutOutSize + borderOffset - _radius, _cutOutTop + _cutOutSize + borderOffset)
        ..lineTo(_cutOutLeft + _cutOutSize + borderOffset - _borderLength, _cutOutTop + _cutOutSize + borderOffset)
        ..moveTo(_cutOutLeft + _cutOutSize + borderOffset, _cutOutTop + _cutOutSize + borderOffset - _radius)
        ..lineTo(_cutOutLeft + _cutOutSize + borderOffset, _cutOutTop + _cutOutSize + borderOffset - _borderLength),
      borderPaint,
    );
  }

  @override
  ShapeBorder scale(double t) {
    return QrScannerOverlayShape(
      borderColor: borderColor,
      borderWidth: borderWidth,
      overlayColor: overlayColor,
    );
  }
}