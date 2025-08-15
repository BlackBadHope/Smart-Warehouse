import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Copy, Check, Wifi, Camera, X } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import localSendStyleService from '../services/localSendStyleService';
import debugService from '../services/debugService';
import QrScanner from 'qr-scanner';

interface SimpleQRModalProps {
  show: boolean;
  onClose: () => void;
  onDeviceConnected?: (deviceInfo: any) => void;
}

// Generate QR code URL using external service
function generateQRCodeUrl(data: string): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
}

/**
 * ПРОСТОЙ QR МОДАЛ - LocalSend стиль
 * 
 * Одна кнопка = одно подключение!
 * QR содержит только: { "ip": "192.168.1.100", "port": 8080, "name": "Устройство" }
 */
const SimpleQRModal: React.FC<SimpleQRModalProps> = ({ show, onClose, onDeviceConnected }) => {
  const [mode, setMode] = useState<'menu' | 'share' | 'connect' | 'camera'>('menu');
  const [qrData, setQrData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrImageError, setQrImageError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [qrScanner, setQrScanner] = useState<QrScanner | null>(null);

  // Cleanup QR scanner when modal closes
  useEffect(() => {
    if (!show && qrScanner) {
      qrScanner.stop();
      qrScanner.destroy();
      setQrScanner(null);
    }
  }, [show, qrScanner]);

  if (!show) return null;

  // Поделиться своим устройством
  const handleShare = async () => {
    try {
      setIsLoading(true);
      debugService.info('SimpleQR: Creating connection QR...');

      // Запускаем сервер если не запущен
      if (!localSendStyleService.isRunning()) {
        const started = await localSendStyleService.startServer();
        if (!started) {
          throw new Error('Failed to start server');
        }
      }

      // Создаем простой QR код
      const qrString = await localSendStyleService.createConnectionQR();
      setQrData(qrString);
      setQrImageError(false);
      setMode('share');

      debugService.info('SimpleQR: QR created successfully', { dataSize: qrString.length });

    } catch (error) {
      debugService.error('SimpleQR: Failed to create QR', error);
      alert('❌ Ошибка: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Включить камеру для сканирования QR
  const handleStartCamera = async () => {
    try {
      setIsLoading(true);
      debugService.info('SimpleQR: Starting camera for QR scanning...');

      if (!videoRef.current) {
        throw new Error('Video element not found');
      }

      // Создаем QR scanner
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          debugService.info('SimpleQR: QR code detected', result.data);
          
          // Автоматически подключаемся по отсканированному QR
          handleQRScanResult(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await scanner.start();
      setQrScanner(scanner);
      setMode('camera');
      
      debugService.info('SimpleQR: Camera started successfully');

    } catch (error) {
      debugService.error('SimpleQR: Failed to start camera', error);
      alert('❌ Не удалось включить камеру: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка результата сканирования QR
  const handleQRScanResult = async (qrDataString: string) => {
    try {
      debugService.info('SimpleQR: Processing scanned QR data...');
      
      // Останавливаем сканер
      if (qrScanner) {
        qrScanner.stop();
        qrScanner.destroy();
        setQrScanner(null);
      }

      // Подключаемся
      const success = await localSendStyleService.connectByQR(qrDataString);
      
      if (success) {
        const qrData = JSON.parse(qrDataString);
        alert(`✅ QR код отсканирован и подключение успешно!\\n\\nУстройство: ${qrData.name}\\nIP: ${qrData.ip}:${qrData.port}`);
        
        if (onDeviceConnected) {
          onDeviceConnected(qrData);
        }
        
        handleClose();
      }

    } catch (error) {
      debugService.error('SimpleQR: QR scan result processing failed', error);
      alert('❌ Ошибка обработки QR кода: ' + (error as Error).message);
      setMode('menu');
    }
  };

  // Остановить камеру
  const handleStopCamera = () => {
    if (qrScanner) {
      qrScanner.stop();
      qrScanner.destroy();
      setQrScanner(null);
    }
    setMode('menu');
  };

  // Подключиться к устройству
  const handleConnect = async () => {
    const textarea = textareaRef.current;
    if (!textarea?.value.trim()) {
      alert('⚠️ Вставьте QR данные');
      return;
    }

    try {
      setIsLoading(true);
      debugService.info('SimpleQR: Connecting to device...');

      const success = await localSendStyleService.connectByQR(textarea.value.trim());
      
      if (success) {
        const qrData = JSON.parse(textarea.value.trim());
        alert(`✅ Подключение успешно!\\n\\nУстройство: ${qrData.name}\\nIP: ${qrData.ip}:${qrData.port}`);
        
        if (onDeviceConnected) {
          onDeviceConnected(qrData);
        }
        
        // Закрываем модал
        handleClose();
      }

    } catch (error) {
      debugService.error('SimpleQR: Connection failed', error);
      alert('❌ Ошибка подключения: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!qrData) return;
    
    try {
      await navigator.clipboard.writeText(qrData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = qrData;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    // Останавливаем QR сканер если активен
    if (qrScanner) {
      qrScanner.stop();
      qrScanner.destroy();
      setQrScanner(null);
    }
    
    setMode('menu');
    setQrData('');
    setCopied(false);
    setQrImageError(false);
    onClose();
  };

  return (
    <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className={`modal-content ${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-lg border-2 ${ASCII_COLORS.border}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <div className="flex items-center">
            {mode !== 'menu' && (
              <button 
                onClick={() => setMode('menu')}
                className={`mr-3 ${ASCII_COLORS.buttonBg} p-1 rounded border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg}`}
              >
                ←
              </button>
            )}
            <h2 className={`${ASCII_COLORS.accent} text-xl font-bold flex items-center`}>
              <QrCode className="w-5 h-5 mr-2" />
              {mode === 'menu' && 'Простое P2P подключение'}
              {mode === 'share' && 'Поделиться устройством'}
              {mode === 'connect' && 'Подключиться к устройству'}
              {mode === 'camera' && 'Сканирование QR камерой'}
            </h2>
          </div>
          <button 
            onClick={handleClose}
            className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Menu Mode */}
          {mode === 'menu' && (
            <>
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  Быстрое подключение устройств через QR код
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={handleShare}
                  disabled={isLoading}
                  className={`p-3 ${ASCII_COLORS.buttonBg} rounded-lg border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} disabled:opacity-50 flex flex-col items-center space-y-1`}
                >
                  <Wifi className="w-6 h-6 text-green-400" />
                  <span className="text-xs font-medium">
                    {isLoading ? 'Запуск...' : 'Поделиться'}
                  </span>
                  <span className="text-xs text-gray-400">
                    Создать QR
                  </span>
                </button>

                <button
                  onClick={handleStartCamera}
                  disabled={isLoading}
                  className={`p-3 ${ASCII_COLORS.buttonBg} rounded-lg border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} disabled:opacity-50 flex flex-col items-center space-y-1`}
                >
                  <Camera className="w-6 h-6 text-blue-400" />
                  <span className="text-xs font-medium">
                    {isLoading ? 'Запуск...' : 'Сканировать'}
                  </span>
                  <span className="text-xs text-gray-400">
                    Камера QR
                  </span>
                </button>

                <button
                  onClick={() => setMode('connect')}
                  className={`p-3 ${ASCII_COLORS.buttonBg} rounded-lg border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} flex flex-col items-center space-y-1`}
                >
                  <QrCode className="w-6 h-6 text-yellow-400" />
                  <span className="text-xs font-medium">Ввести</span>
                  <span className="text-xs text-gray-400">
                    Вручную
                  </span>
                </button>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-green-900/20`}>
                <p className="text-green-400 text-sm">
                  ✅ <strong>Простота:</strong> Один QR = одно подключение<br/>
                  🚀 <strong>Скорость:</strong> Без сложных шагов авторизации<br/>
                  📱 <strong>Совместимость:</strong> Работает на любых устройствах
                </p>
              </div>
            </>
          )}

          {/* Share Mode */}
          {mode === 'share' && (
            <>
              <div className="text-center mb-4">
                <p className="text-gray-300">
                  Отсканируйте QR код другим устройством для подключения
                </p>
              </div>

              <div className={`p-4 bg-gray-900 rounded border ${ASCII_COLORS.border} text-center`}>
                {/* Real QR Code */}
                {!qrImageError ? (
                  <img 
                    src={generateQRCodeUrl(qrData)} 
                    alt="QR Code for Connection"
                    className="mx-auto mb-3 border border-white rounded"
                    style={{ maxWidth: '200px', height: 'auto' }}
                    onError={() => setQrImageError(true)}
                  />
                ) : (
                  <div className="mx-auto mb-3 border border-red-500 rounded p-4 bg-red-900/20 max-w-[200px]">
                    <p className="text-red-400 text-xs">
                      ⚠️ QR код недоступен<br/>
                      Используйте данные ниже
                    </p>
                  </div>
                )}
                
                {/* Compact JSON data */}
                <details className="mt-2" open={qrImageError}>
                  <summary className="text-xs text-gray-400 cursor-pointer">📋 Данные для ручного ввода</summary>
                  <pre className="text-xs text-green-400 font-mono leading-tight mt-2 p-2 bg-black rounded border max-h-20 overflow-y-auto text-left">
                    {qrData}
                  </pre>
                </details>
                
                <button
                  onClick={copyToClipboard}
                  className={`mt-3 px-4 py-2 ${ASCII_COLORS.buttonBg} rounded border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} flex items-center justify-center mx-auto`}
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-2" /> Скопировано!</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Копировать данные</>
                  )}
                </button>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-blue-900/20`}>
                <p className="text-blue-400 text-xs">
                  📱 <strong>Инструкция:</strong><br/>
                  1. На другом устройстве откройте это же приложение<br/>
                  2. Выберите "Подключиться" → вставьте данные выше<br/>
                  3. Устройства автоматически подключатся!
                </p>
              </div>
            </>
          )}

          {/* Connect Mode */}
          {mode === 'connect' && (
            <>
              <div className="text-center mb-4">
                <p className="text-gray-300">
                  Вставьте QR данные от другого устройства
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  ref={textareaRef}
                  placeholder='Вставьте JSON данные, например: {"ip":"192.168.1.100","port":8080,"name":"Склад 1"}'
                  className={`w-full h-32 p-3 bg-gray-900 border ${ASCII_COLORS.border} rounded text-gray-300 text-sm font-mono resize-none`}
                />
                
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className={`w-full p-3 bg-blue-800 hover:bg-blue-700 rounded border ${ASCII_COLORS.border} disabled:opacity-50 flex items-center justify-center`}
                >
                  {isLoading ? (
                    <>⏳ Подключаемся...</>
                  ) : (
                    <>🔗 Подключиться к устройству</>
                  )}
                </button>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-blue-900/20`}>
                <p className="text-blue-400 text-xs">
                  📋 <strong>Формат данных:</strong> JSON с IP, портом и именем устройства<br/>
                  ⚡ <strong>Мгновенно:</strong> Подключение происходит сразу после нажатия кнопки
                </p>
              </div>
            </>
          )}

          {/* Camera Mode */}
          {mode === 'camera' && (
            <>
              <div className="text-center mb-4">
                <p className="text-gray-300">
                  Наведите камеру на QR код для автоматического подключения
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative bg-black rounded-lg overflow-hidden border-2 border-dashed border-blue-500">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 border-4 border-blue-500 border-dashed opacity-30 pointer-events-none"></div>
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    📷 QR Scanner Active
                  </div>
                </div>
                
                <button
                  onClick={handleStopCamera}
                  className={`w-full p-3 bg-red-800 hover:bg-red-700 rounded border ${ASCII_COLORS.border} flex items-center justify-center`}
                >
                  <X className="w-4 h-4 mr-2" />
                  Остановить сканирование
                </button>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-blue-900/20`}>
                <p className="text-blue-400 text-xs">
                  📷 <strong>Автоматическое сканирование:</strong><br/>
                  Как только QR код попадет в кадр, произойдет автоматическое подключение<br/>
                  🎯 <strong>Точность:</strong> Наведите QR код точно в центр экрана
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleQRModal;