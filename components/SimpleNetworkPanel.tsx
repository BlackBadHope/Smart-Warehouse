import React, { useState, useEffect } from 'react';
import { X, Wifi, Users, Send, Settings, RefreshCw, Edit2, Check } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import simpleP2PService from '../services/simpleP2PService';

interface SimpleNetworkPanelProps {
  show: boolean;
  onClose: () => void;
}

interface P2PDevice {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastSeen: number;
}

const SimpleNetworkPanel: React.FC<SimpleNetworkPanelProps> = ({ show, onClose }) => {
  const [devices, setDevices] = useState<P2PDevice[]>([]);
  const [myDeviceName, setMyDeviceName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('offline');

  useEffect(() => {
    if (!show) return;

    const updateState = () => {
      setDevices(simpleP2PService.getDiscoveredDevices());
      setMyDeviceName(simpleP2PService.getDeviceName());
      setConnectionStatus(simpleP2PService.getConnectionStatus());
    };

    // Initial update
    updateState();

    // Subscribe to events
    const unsubscribes = [
      simpleP2PService.on('device_discovered', updateState),
      simpleP2PService.on('device_lost', updateState),
      simpleP2PService.on('connection_changed', updateState),
    ];

    // Periodic update
    const interval = setInterval(updateState, 5000);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearInterval(interval);
    };
  }, [show]);

  const handleStartP2P = async () => {
    try {
      await simpleP2PService.initialize();
    } catch (error) {
      console.error('Failed to start P2P:', error);
    }
  };

  const handleRefreshDevices = () => {
    // Force announcement to trigger device discovery
    if (connectionStatus === 'online') {
      setDevices([]);
      // The service will automatically re-announce and rediscover
    }
  };

  const handlePingDevice = (deviceId: string) => {
    simpleP2PService.pingDevice(deviceId);
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      simpleP2PService.setDeviceName(newName.trim());
      setMyDeviceName(newName.trim());
      setIsEditingName(false);
      setNewName('');
    }
  };

  const startEditingName = () => {
    setNewName(myDeviceName);
    setIsEditingName(true);
  };

  const formatLastSeen = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${ASCII_COLORS.modalBg} rounded-lg shadow-xl w-full max-w-lg border-2 ${ASCII_COLORS.border} max-h-[80vh] overflow-hidden`}>
        {/* Header */}
        <div className={`p-4 border-b ${ASCII_COLORS.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <Wifi size={24} className={connectionStatus === 'online' ? 'text-green-400' : 'text-red-400'} />
            <h2 className={`text-xl font-bold ${ASCII_COLORS.accent}`}>
              Simple P2P Network
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`${ASCII_COLORS.buttonBg} p-2 rounded hover:bg-red-600 transition-colors`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-96">
          {/* My Device Info */}
          <div className={`p-3 rounded-lg bg-blue-900/20 border ${ASCII_COLORS.border}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">My Device</span>
              <span className={`text-xs px-2 py-1 rounded ${
                connectionStatus === 'online' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
              }`}>
                {connectionStatus}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className={`${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} px-2 py-1 rounded border ${ASCII_COLORS.border} flex-1 text-sm`}
                    placeholder="Device name"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className={`${ASCII_COLORS.buttonBg} p-1 rounded hover:bg-green-600 transition-colors`}
                  >
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className={`${ASCII_COLORS.text} font-medium flex-1`}>{myDeviceName}</span>
                  <button
                    onClick={startEditingName}
                    className={`${ASCII_COLORS.buttonBg} p-1 rounded hover:bg-gray-600 transition-colors`}
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Connection Control */}
          {connectionStatus === 'offline' && (
            <div className="text-center">
              <button
                onClick={handleStartP2P}
                className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded-lg ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-green-400 font-semibold`}
              >
                Start P2P Network
              </button>
              <p className="text-sm text-gray-400 mt-2">
                Click to enable peer-to-peer connections
              </p>
            </div>
          )}

          {/* Discovered Devices */}
          {connectionStatus === 'online' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`${ASCII_COLORS.text} font-semibold flex items-center gap-2`}>
                  <Users size={18} />
                  Discovered Devices ({devices.length})
                </h3>
                <button
                  onClick={handleRefreshDevices}
                  className={`${ASCII_COLORS.buttonBg} p-1 rounded hover:bg-blue-600 transition-colors`}
                  title="Refresh device list"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No devices found</p>
                  <p className="text-xs mt-1">
                    Open this app in another tab or device to test P2P
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className={`flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border ${ASCII_COLORS.border}`}
                    >
                      <div>
                        <div className={`${ASCII_COLORS.text} font-medium`}>
                          {device.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatLastSeen(device.lastSeen)} • {device.id.slice(0, 8)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          device.status === 'online' ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'
                        }`}>
                          {device.status}
                        </span>
                        <button
                          onClick={() => handlePingDevice(device.id)}
                          className={`${ASCII_COLORS.buttonBg} p-1 rounded hover:bg-blue-600 transition-colors`}
                          title="Ping device"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {connectionStatus === 'online' && (
            <div className={`p-3 rounded-lg bg-yellow-900/20 border-yellow-600 border text-yellow-200 text-sm`}>
              <strong>Quick Test:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>1. Open this app in a new browser tab</li>
                <li>2. Both tabs will auto-discover each other</li>
                <li>3. Try syncing inventory between them</li>
                <li>4. Use "Ping" to test connectivity</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleNetworkPanel;