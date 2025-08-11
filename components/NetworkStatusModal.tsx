import React, { useState, useEffect } from 'react';
import { Server, Wifi, WifiOff, Users, Globe, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import masterClientService from '../services/masterClientService';
import syncService from '../services/syncService';
import SyncConflictModal from './SyncConflictModal';

interface Props {
  show: boolean;
  onClose: () => void;
}

interface NetworkStatus {
  mode: 'master' | 'client';
  connected: boolean;
  masterIP: string | null;
  devicesCount: number;
  lastSync?: number;
}

const NetworkStatusModal: React.FC<Props> = ({ show, onClose }) => {
  const [status, setStatus] = useState<NetworkStatus | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncConflicts, setSyncConflicts] = useState<any[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  useEffect(() => {
    if (show) {
      loadStatus();
    }
  }, [show]);

  const loadStatus = async () => {
    try {
      const networkStatus = await masterClientService.getNetworkStatus();
      setStatus(networkStatus);
    } catch (error) {
      setError('Ошибка получения статуса сети');
    }
  };

  const handleInitialize = async () => {
    if (!status) return;
    
    setIsInitializing(true);
    setError('');
    setSuccess('');
    
    try {
      let result = false;
      
      if (status.mode === 'master') {
        result = await masterClientService.initializeMaster();
        setSuccess('Мастер-сервер запущен! Другие устройства могут подключаться.');
      } else {
        result = await masterClientService.initializeClient();
        if (result) {
          setSuccess('Подключен к мастер-серверу!');
        } else {
          setError('Мастер-сервер не найден в локальной сети');
        }
      }
      
      if (result) {
        await loadStatus();
      }
    } catch (error) {
      setError(`Ошибка инициализации: ${(error as Error).message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDisconnect = () => {
    masterClientService.disconnect();
    setSuccess('Отключен от сети');
    loadStatus();
  };

  const handleFullSync = async () => {
    if (status?.mode !== 'client' || !status.masterIP) return;
    
    setIsSyncing(true);
    setError('');
    setSuccess('');
    
    try {
      const syncResult = await syncService.triggerManualSync(status.masterIP);
      
      if (syncResult.conflicts.length > 0) {
        setSyncConflicts(syncResult.conflicts);
        setShowConflictModal(true);
      } else if (syncResult.success) {
        setSuccess(`Синхронизация выполнена! Обновлено ${syncResult.syncedItemsCount} объектов`);
        await loadStatus();
      } else {
        setError(syncResult.errorMessage || 'Не удалось выполнить синхронизацию');
      }
    } catch (error) {
      setError('Ошибка синхронизации: ' + (error as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConflictResolve = async (resolutions: Record<string, 'local' | 'server' | 'merge'>) => {
    if (!status?.masterIP) return;
    
    try {
      const success = await syncService.resolveConflicts(status.masterIP, syncConflicts, resolutions);
      
      if (success) {
        setSuccess('Конфликты разрешены! Синхронизация завершена.');
        setShowConflictModal(false);
        setSyncConflicts([]);
        await loadStatus();
        
        // Trigger data refresh
        window.dispatchEvent(new CustomEvent('syncDataUpdated'));
      } else {
        setError('Не удалось разрешить конфликты');
      }
    } catch (error) {
      setError('Ошибка разрешения конфликтов');
    }
  };

  const handleConflictCancel = () => {
    setShowConflictModal(false);
    setSyncConflicts([]);
    setError('Синхронизация отменена из-за конфликтов');
  };

  if (!show || !status) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-2xl border-2 ${ASCII_COLORS.border}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`${ASCII_COLORS.accent} text-xl font-bold flex items-center`}>
            {status.mode === 'master' ? (
              <Server className="w-6 h-6 mr-2 text-green-400" />
            ) : (
              <Wifi className="w-6 h-6 mr-2 text-blue-400" />
            )}
            СЕТЕВОЙ СТАТУС
          </h2>
          <button 
            onClick={onClose}
            className={`${ASCII_COLORS.buttonBg} p-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-900 bg-opacity-20 border border-red-500 p-3 rounded mb-4">
            <div className="flex items-center text-red-400">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-900 bg-opacity-20 border border-green-500 p-3 rounded mb-4">
            <div className="flex items-center text-green-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              {success}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Mode Info */}
          <div className={`${ASCII_COLORS.inputBg} p-4 rounded border ${ASCII_COLORS.border}`}>
            <h3 className="font-semibold mb-2 flex items-center">
              {status.mode === 'master' ? (
                <>
                  <Server className="w-5 h-5 mr-2 text-green-400" />
                  МАСТЕР РЕЖИМ
                </>
              ) : (
                <>
                  <Wifi className="w-5 h-5 mr-2 text-blue-400" />
                  КЛИЕНТ РЕЖИМ
                </>
              )}
            </h3>
            <p className="text-sm opacity-80">
              {status.mode === 'master' 
                ? 'Это устройство является главным сервером для локальной сети' 
                : 'Это устройство подключается к мастер-серверу для синхронизации данных'
              }
            </p>
          </div>

          {/* Connection Status */}
          <div className={`${ASCII_COLORS.inputBg} p-4 rounded border ${ASCII_COLORS.border}`}>
            <h3 className="font-semibold mb-2 flex items-center">
              {status.connected ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
                  ПОДКЛЮЧЕН
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 mr-2 text-red-400" />
                  НЕ ПОДКЛЮЧЕН
                </>
              )}
            </h3>
            
            <div className="space-y-2 text-sm">
              {status.masterIP && (
                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  <span>Мастер IP: {status.masterIP}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                <span>
                  {status.mode === 'master' 
                    ? `Подключенных клиентов: ${status.devicesCount}` 
                    : `Устройств в сети: ${status.devicesCount + 1}`
                  }
                </span>
              </div>
              
              {status.lastSync && (
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span>Последняя синхронизация: {new Date(status.lastSync).toLocaleTimeString('ru-RU')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {!status.connected ? (
              <button 
                onClick={handleInitialize}
                disabled={isInitializing}
                className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border border-green-500 disabled:opacity-50 flex items-center`}
              >
                {isInitializing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {status.mode === 'master' ? 'Запуск сервера...' : 'Поиск сервера...'}
                  </>
                ) : (
                  <>
                    {status.mode === 'master' ? (
                      <>🚀 ЗАПУСТИТЬ СЕРВЕР</>
                    ) : (
                      <>📡 НАЙТИ МАСТЕР</>
                    )}
                  </>
                )}
              </button>
            ) : (
              <button 
                onClick={handleDisconnect}
                className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-red-400 border-red-500`}
              >
                🔌 ОТКЛЮЧИТЬСЯ
              </button>
            )}

            {status.connected && status.mode === 'client' && (
              <button 
                onClick={handleFullSync}
                disabled={isSyncing}
                className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center disabled:opacity-50`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'СИНХРОНИЗАЦИЯ...' : 'ПОЛНАЯ СИНХРОНИЗАЦИЯ'}
              </button>
            )}

            <button 
              onClick={loadStatus}
              className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              ОБНОВИТЬ
            </button>
          </div>

          {/* Help Text */}
          <div className="bg-yellow-900 bg-opacity-20 p-3 rounded text-sm">
            <p className="text-yellow-300">
              <strong>Как это работает:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-xs opacity-80">
              {status.mode === 'master' ? (
                <>
                  <li>• Запустите сервер для создания локальной сети</li>
                  <li>• Клиентские устройства автоматически найдут этот сервер</li>
                  <li>• Все изменения синхронизируются между устройствами</li>
                  <li>• Данные хранятся на мастер-устройстве</li>
                </>
              ) : (
                <>
                  <li>• Убедитесь, что мастер-сервер запущен в сети</li>
                  <li>• Устройства должны быть в одной Wi-Fi сети</li>
                  <li>• Данные автоматически синхронизируются</li>
                  <li>• Можно работать офлайн, синхронизация произойдет позже</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
      
      <SyncConflictModal 
        show={showConflictModal}
        conflicts={syncConflicts}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
      />
    </div>
  );
};

export default NetworkStatusModal;