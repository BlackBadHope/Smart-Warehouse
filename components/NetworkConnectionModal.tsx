import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Search, Server, Check, X, RefreshCw } from 'lucide-react';
import networkSync from '../services/networkSyncService';

interface ServerInfo {
  ip: string;
  port: number;
  name: string;
  version: string;
}

interface NetworkConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (serverUrl: string) => void;
}

export default function NetworkConnectionModal({ isOpen, onClose, onConnected }: NetworkConnectionModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [manualIp, setManualIp] = useState('');

  useEffect(() => {
    if (isOpen) {
      scanForServers();
    }
  }, [isOpen]);

  const scanForServers = async () => {
    setIsScanning(true);
    try {
      const servers = await networkSync.discoverServers();
      setAvailableServers(servers);
    } catch (error) {
      console.error('Error scanning for servers:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const connectToServer = async (serverIp: string) => {
    setIsConnecting(true);
    setConnectionStatus('disconnected');

    try {
      const serverUrl = `http://${serverIp}:3001`;
      const success = await networkSync.connectToServer(serverUrl);
      
      if (success) {
        setConnectionStatus('connected');
        onConnected(serverUrl);
        setTimeout(() => onClose(), 1500);
      } else {
        setConnectionStatus('error');
        setTimeout(() => setConnectionStatus('disconnected'), 2000);
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setTimeout(() => setConnectionStatus('disconnected'), 2000);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectManually = () => {
    if (manualIp.trim()) {
      connectToServer(manualIp.trim());
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Подключено!';
      case 'error':
        return 'Ошибка подключения';
      default:
        return 'Не подключено';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Локальная сеть</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Status */}
          <div className="mt-4 flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">{getStatusText()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Auto-discovery */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Найденные серверы</h3>
              <button
                onClick={scanForServers}
                disabled={isScanning}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>

            {isScanning ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-600">
                  <Search className="w-5 h-5 animate-pulse" />
                  <span>Поиск серверов...</span>
                </div>
              </div>
            ) : availableServers.length > 0 ? (
              <div className="space-y-2">
                {availableServers.map((server, index) => (
                  <button
                    key={index}
                    onClick={() => connectToServer(server.ip)}
                    disabled={isConnecting}
                    className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium">{server.name}</div>
                        <div className="text-sm text-gray-600">
                          {server.ip} • v{server.version}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Серверы не найдены</p>
                <p className="text-xs mt-1">Убедитесь, что сервер запущен в локальной сети</p>
              </div>
            )}
          </div>

          {/* Manual connection */}
          <div>
            <h3 className="font-medium mb-3">Подключение вручную</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="192.168.1.100"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isConnecting}
                onKeyPress={(e) => e.key === 'Enter' && connectManually()}
              />
              <button
                onClick={connectManually}
                disabled={isConnecting || !manualIp.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Подключить'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-600 text-center">
            💡 Совет: Запустите сервер командой <code className="bg-gray-200 px-1 rounded">npm run start:home</code>
          </p>
        </div>
      </div>
    </div>
  );
}