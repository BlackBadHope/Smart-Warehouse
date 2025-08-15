import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Copy, Check, Camera } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import simpleQRP2PService from '../services/simpleQRP2PService';
import debugService from '../services/debugService';
import localizationService from '../services/localizationService';

interface QRConnectionModalProps {
  show: boolean;
  onClose: () => void;
}

// Generate QR code URL using external service
function generateQRCodeUrl(data: string): string {
  const encoded = encodeURIComponent(data);
  // Use a public QR API service
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
}

const QRConnectionModal: React.FC<QRConnectionModalProps> = ({ show, onClose }) => {
  const [mode, setMode] = useState<'menu' | 'generate' | 'scan' | 'camera' | 'complete'>('menu');
  const [qrData, setQrData] = useState<string>('');
  const [connectionData, setConnectionData] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrImageError, setQrImageError] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Автозапуск видео при получении стрима
  React.useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => {
        console.error('Video autoplay failed:', e);
        // Добавляем кнопку play если автозапуск не сработал
      });
    }
  }, [cameraStream]);

  if (!show) return null;

  const handleCreateConnection = async () => {
    try {
      setIsConnecting(true);
      debugService.info('Creating SIMPLE QR connection offer...');
      
      // Используем новый простой сервис БЕЗ STUN серверов
      const connectionString = await simpleQRP2PService.createQRConnectionOffer();
      
      alert(`QR создан! Длина данных: ${connectionString.length}`);
      
      console.log('Setting QR data:', { connectionString: connectionString.substring(0, 100) + '...' });
      
      setQrData(connectionString);
      setQrImageError(false); // Reset QR error state
      setMode('generate');
      
      console.log('Mode changed to generate, qrData length:', connectionString.length);
      
      debugService.info('SIMPLE QR connection offer created!');
    } catch (error) {
      debugService.error('Failed to create QR connection offer', error);
      alert('❌ Ошибка создания QR кода: ' + (error as Error).message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleScanConnection = () => {
    setMode('scan');
  };

  const handleCameraConnection = async () => {
    try {
      setIsConnecting(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Задняя камера для сканирования
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      setCameraStream(stream);
      setMode('camera');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Принудительный запуск видео
        videoRef.current.play().catch(e => console.error('Video play failed:', e));
      }
    } catch (error) {
      alert('❌ Не удалось получить доступ к камере: ' + (error as Error).message);
    } finally {
      setIsConnecting(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleAcceptConnection = async () => {
    const textarea = textareaRef.current;
    if (!textarea?.value.trim()) {
      alert('⚠️ Вставьте данные QR кода');
      return;
    }

    try {
      setIsConnecting(true);
      const offerData = JSON.parse(textarea.value.trim());
      
      debugService.info('Accepting QR connection...', { deviceId: offerData.deviceId });
      
      // Используем новый простой сервис
      const answerJson = await simpleQRP2PService.acceptQRConnectionOffer(textarea.value.trim());
      try {
        await navigator.clipboard.writeText(answerJson);
        alert('✅ Подключение создано и ответ скопирован!\\n\\n📋 Отправьте скопированные данные обратно на первое устройство для завершения подключения.');
      } catch (e) {
        alert(`✅ Подключение создано!\\n\\n📋 Скопируйте данные:\\n${answerJson}\\n\\n📤 Отправьте их на первое устройство для завершения подключения.`);
      }
      
      debugService.info('SIMPLE QR connection accepted successfully!');
    } catch (error) {
      debugService.error('Failed to accept QR connection', error);
      alert('❌ Ошибка подключения: ' + (error as Error).message);
    } finally {
      setIsConnecting(false);
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

  const handleCompleteConnection = async () => {
    const textarea = textareaRef.current;
    if (!textarea?.value.trim()) {
      alert('⚠️ Вставьте ответные данные от второго устройства');
      return;
    }

    try {
      setIsConnecting(true);
      
      // Завершаем соединение с ответными данными
      await simpleQRP2PService.completeQRConnection(textarea.value.trim());
      
      alert('🎉 P2P соединение установлено успешно!');
      setMode('complete');
      
      debugService.info('SIMPLE QR connection completed successfully!');
    } catch (error) {
      debugService.error('Failed to complete QR connection', error);
      alert('❌ Ошибка завершения соединения: ' + (error as Error).message);
    } finally {
      setIsConnecting(false);
    }
  };

  const resetModal = () => {
    stopCamera(); // Останавливаем камеру
    setMode('menu');
    setQrData('');
    setConnectionData(null);
    setIsConnecting(false);
    setCopied(false);
    setQrImageError(false);
  };

  return (
    <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className={`modal-content ${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-lg border-2 ${ASCII_COLORS.border}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <div className="flex items-center">
            {mode !== 'menu' && (
              <button 
                onClick={resetModal}
                className={`mr-3 ${ASCII_COLORS.buttonBg} p-1 rounded border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg}`}
              >
                ←
              </button>
            )}
            <h2 className={`${ASCII_COLORS.accent} text-xl font-bold flex items-center`}>
              <QrCode className="w-5 h-5 mr-2" />
              {mode === 'menu' && localizationService.translate('p2p.title')}
              {mode === 'generate' && localizationService.translate('p2p.create_qr')}
              {mode === 'scan' && localizationService.translate('p2p.connect')}
              {mode === 'camera' && 'Сканировать QR камерой'}
              {mode === 'complete' && 'Завершить подключение'}
            </h2>
          </div>
          <button 
            onClick={() => { resetModal(); onClose(); }} 
            className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            [CLOSE]
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Menu Mode */}
          {mode === 'menu' && (
            <>
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  {localizationService.translate('p2p.connection_desc')}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleCreateConnection}
                  disabled={isConnecting}
                  className={`p-3 ${ASCII_COLORS.buttonBg} rounded-lg border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} flex flex-col items-center space-y-1 disabled:opacity-50`}
                >
                  <QrCode className="w-6 h-6 text-green-400" />
                  <span className="text-xs">{isConnecting ? 'Creating...' : 'Create QR'}</span>
                </button>

                <button
                  onClick={handleCameraConnection}
                  disabled={isConnecting}
                  className={`p-3 ${ASCII_COLORS.buttonBg} rounded-lg border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} flex flex-col items-center space-y-1 disabled:opacity-50`}
                >
                  <Camera className="w-6 h-6 text-blue-400" />
                  <span className="text-xs">{isConnecting ? 'Starting...' : 'Scan QR'}</span>
                </button>

                <button
                  onClick={handleScanConnection}
                  className={`p-3 ${ASCII_COLORS.buttonBg} rounded-lg border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} flex flex-col items-center space-y-1`}
                >
                  <div className="w-6 h-6 text-yellow-400 flex items-center justify-center text-sm font-bold">📋</div>
                  <span className="text-xs">Manual</span>
                </button>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-green-900/20`}>
                <p className="text-green-400 text-xs">
                  ✅ <strong>{localizationService.translate('ui.ready')}:</strong> {localizationService.translate('p2p.create_qr')}.<br/>
                  📱 <strong>{localizationService.translate('ui.compatible')}:</strong> {localizationService.translate('p2p.compatible') || 'Любые устройства с браузером'}.
                </p>
              </div>
            </>
          )}

          {/* Generate Mode */}
          {mode === 'generate' && (
            <>
              <div className="text-center mb-4">
                <p className="text-gray-300">
                  {localizationService.translate('p2p.connection_desc')}
                </p>
              </div>

              <div className={`p-4 bg-gray-900 rounded border ${ASCII_COLORS.border} text-center`}>
                <div className="mb-3">
                  {/* Real QR Code */}
                  {!qrImageError ? (
                    <img 
                      src={generateQRCodeUrl(qrData)} 
                      alt="QR Code for P2P Connection"
                      className="mx-auto mb-2 border border-white rounded"
                      style={{ maxWidth: '200px', height: 'auto' }}
                      onError={() => setQrImageError(true)}
                    />
                  ) : (
                    <div className="mx-auto mb-2 border border-red-500 rounded p-4 bg-red-900/20 max-w-[200px]">
                      <p className="text-red-400 text-xs">
                        ⚠️ QR код недоступен<br/>
                        Используйте данные ниже
                      </p>
                    </div>
                  )}
                  
                  {/* Fallback: JSON data for manual sharing */}
                  <details className="mt-2" open={qrImageError}>
                    <summary className="text-xs text-gray-400 cursor-pointer">📋 Manual Data {qrImageError ? '(QR failed)' : '(if QR fails)'}</summary>
                    <pre className="text-xs text-green-400 font-mono leading-tight mt-2 p-2 bg-black rounded border max-h-20 overflow-y-auto text-left">
                      {qrData}
                    </pre>
                  </details>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className={`flex-1 p-2 ${ASCII_COLORS.buttonBg} rounded border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} flex items-center justify-center`}
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 mr-2" /> {localizationService.translate('p2p.copied')}</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> {localizationService.translate('p2p.copy_data')}</>
                    )}
                  </button>
                </div>
                
                <button
                  onClick={() => setMode('complete')}
                  className={`w-full mt-3 p-3 bg-green-800 rounded border ${ASCII_COLORS.border} hover:bg-green-700 flex items-center justify-center text-green-100`}
                >
                  🔗 Ожидаю ответ от второго устройства...
                </button>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-blue-900/20`}>
                <p className="text-blue-400 text-xs">
                  📱 <strong>Инструкция:</strong><br/>
                  1. <strong>Сканируйте QR код</strong> другим телефоном (камера/QR сканер)<br/>
                  2. <strong>Или скопируйте данные</strong> кнопкой выше и отправьте<br/>
                  3. На другом устройстве выберите "Подключиться"<br/>
                  4. Вставьте данные и нажмите "Подключить"
                </p>
              </div>
            </>
          )}

          {/* Scan Mode */}
          {mode === 'scan' && (
            <>
              <div className="text-center mb-4">
                <p className="text-gray-300">
                  {localizationService.translate('p2p.paste_prompt')}
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  ref={textareaRef}
                  placeholder={localizationService.translate('p2p.paste_prompt')}
                  className={`w-full h-32 p-3 bg-gray-900 border ${ASCII_COLORS.border} rounded text-gray-300 text-sm font-mono resize-none`}
                />
                
                <button
                  onClick={handleAcceptConnection}
                  disabled={isConnecting}
                  className={`w-full p-3 ${ASCII_COLORS.buttonBg} rounded border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} disabled:opacity-50 flex items-center justify-center`}
                >
                  {isConnecting ? (
                    <>{localizationService.translate('p2p.connecting')}</>
                  ) : (
                    <>🔗 {localizationService.translate('p2p.connect_device')}</>
                  )}
                </button>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-blue-900/20`}>
                <p className="text-blue-400 text-xs">
                  📋 <strong>Формат:</strong> JSON данные от другого устройства<br/>
                  🔄 <strong>Ответ:</strong> После подключения вы получите данные для отправки обратно
                </p>
              </div>
            </>
          )}

          {/* Camera Mode - Сканирование QR камерой */}
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
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute inset-0 border-4 border-blue-500 border-dashed opacity-50 pointer-events-none"></div>
                  <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                    🔴 LIVE
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      stopCamera();
                      setMode('scan');
                    }}
                    className={`flex-1 p-3 ${ASCII_COLORS.buttonBg} rounded border ${ASCII_COLORS.border} hover:${ASCII_COLORS.buttonHoverBg} flex items-center justify-center`}
                  >
                    📋 Switch to Manual Input
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-orange-900/20`}>
                <p className="text-orange-400 text-xs">
                  ⚠️ <strong>В разработке:</strong><br/>
                  Автоматическое распознавание QR кодов будет добавлено в следующей версии.<br/>
                  Пока используйте Manual режим для копирования/вставки QR данных.
                </p>
              </div>
            </>
          )}

          {/* Complete Mode - Завершение соединения */}
          {mode === 'complete' && (
            <>
              <div className="text-center mb-4">
                <p className="text-gray-300">
                  Вставьте ответные данные от второго устройства для завершения P2P соединения:
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  ref={textareaRef}
                  placeholder="Вставьте JSON ответ от второго устройства..."
                  className={`w-full h-32 p-3 bg-gray-900 border ${ASCII_COLORS.border} rounded text-gray-300 text-sm font-mono resize-none`}
                />
                
                <button
                  onClick={handleCompleteConnection}
                  disabled={isConnecting}
                  className={`w-full p-3 bg-purple-800 rounded border ${ASCII_COLORS.border} hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center text-purple-100`}
                >
                  {isConnecting ? (
                    <>⏳ Завершаю соединение...</>
                  ) : (
                    <>🎉 Завершить P2P соединение</>
                  )}
                </button>
              </div>

              <div className={`p-3 rounded border ${ASCII_COLORS.border} bg-purple-900/20`}>
                <p className="text-purple-400 text-xs">
                  📋 <strong>Финальный шаг:</strong><br/>
                  1. Вставьте JSON данные полученные от второго устройства<br/>
                  2. Нажмите "Завершить P2P соединение"<br/>
                  3. После успеха устройства будут синхронизироваться!
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRConnectionModal;