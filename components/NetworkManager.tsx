import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Users, Shield, Key, Globe, Lock, Plus, Trash2, Edit } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import { NetworkDevice, NetworkState, UserRole } from '../types';
import networkService from '../services/networkService';
import accessControlService from '../services/accessControlService';
import debugService from '../services/debugService';

interface NetworkManagerProps {
  show: boolean;
  onClose: () => void;
}

const NetworkManager: React.FC<NetworkManagerProps> = ({ show, onClose }) => {
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [selectedTab, setSelectedTab] = useState<'devices' | 'security' | 'settings'>('devices');
  const [deviceName, setDeviceName] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (show) {
      loadNetworkState();
      setupNetworkListeners();
    }
    
    return () => {
      cleanupNetworkListeners();
    };
  }, [show]);

  const loadNetworkState = async () => {
    try {
      const state = networkService.getNetworkState();
      setNetworkState(state);
      setDeviceName(state.localDevice.name);
    } catch (error) {
      debugService.error('NetworkManager: Failed to load network state', error);
    }
  };

  const setupNetworkListeners = () => {
    document.addEventListener('network_device_discovered', handleDeviceDiscovered);
    document.addEventListener('network_initialized', handleNetworkInitialized);
  };

  const cleanupNetworkListeners = () => {
    document.removeEventListener('network_device_discovered', handleDeviceDiscovered);
    document.removeEventListener('network_initialized', handleNetworkInitialized);
  };

  const handleDeviceDiscovered = (event: any) => {
    loadNetworkState(); // Refresh state when devices change
  };

  const handleNetworkInitialized = (event: any) => {
    loadNetworkState();
    setIsInitializing(false);
  };

  const handleInitializeNetwork = async () => {
    setIsInitializing(true);
    try {
      await networkService.initialize();
    } catch (error) {
      debugService.error('NetworkManager: Failed to initialize network', error);
      setIsInitializing(false);
    }
  };

  const handleConnectToDevice = async (deviceId: string) => {
    try {
      const success = await networkService.connectToDevice(deviceId);
      if (success) {
        loadNetworkState();
      }
    } catch (error) {
      debugService.error('NetworkManager: Failed to connect to device', error);
    }
  };

  const handleDisconnectFromDevice = (deviceId: string) => {
    networkService.disconnectFromDevice(deviceId);
    loadNetworkState();
  };

  const handleUpdateDeviceName = () => {
    if (deviceName.trim()) {
      networkService.setDeviceName(deviceName.trim());
      loadNetworkState();
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'master': return 'text-yellow-400';
      case 'editor': return 'text-green-400';
      case 'viewer': return 'text-blue-400';
      case 'guest': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'master': return <Key className="w-4 h-4" />;
      case 'editor': return <Edit className="w-4 h-4" />;
      case 'viewer': return <Users className="w-4 h-4" />;
      case 'guest': return <Globe className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className={`modal-content ${ASCII_COLORS.modalBg} rounded-lg shadow-2xl w-full max-w-4xl h-5/6 border-2 ${ASCII_COLORS.border} flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b-2 ${ASCII_COLORS.border}`}>
          <h2 className={`${ASCII_COLORS.accent} text-xl font-bold flex items-center`}>
            <Wifi className="w-5 h-5 mr-2" />
            Network Manager
          </h2>
          <button 
            onClick={onClose} 
            className={`${ASCII_COLORS.buttonBg} p-2 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            [CLOSE]
          </button>
        </div>

        {/* Status Bar */}
        <div className={`p-3 border-b ${ASCII_COLORS.border} bg-black/40`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${networkState?.isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {networkState?.isOnline ? <Wifi className="w-4 h-4 mr-1" /> : <WifiOff className="w-4 h-4 mr-1" />}
                {networkState?.isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-gray-400 text-sm">
                Devices: {networkState?.discoveredDevices.length || 0}
              </div>
              <div className="text-gray-400 text-sm">
                Connections: {networkState?.connections.size || 0}
              </div>
            </div>
            {!networkState?.isOnline && (
              <button
                onClick={handleInitializeNetwork}
                disabled={isInitializing}
                className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center disabled:opacity-50`}
              >
                {isInitializing ? 'Initializing...' : 'Start Network'}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${ASCII_COLORS.border}`}>
          {[
            { id: 'devices', label: 'Devices', icon: Wifi },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'settings', label: 'Settings', icon: Edit }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center px-4 py-3 text-sm font-medium border-r ${ASCII_COLORS.border} transition-colors ${
                selectedTab === tab.id 
                  ? `${ASCII_COLORS.accent} bg-yellow-900/20` 
                  : `text-gray-400 hover:text-gray-200`
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {selectedTab === 'devices' && (
            <div className="space-y-4">
              <div>
                <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold mb-3`}>
                  Discovered Devices
                </h3>
                {networkState?.discoveredDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Wifi className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No devices discovered yet</p>
                    <p className="text-sm mt-1">Make sure other devices are on the same network</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {networkState?.discoveredDevices.map(device => (
                      <div key={device.id} className={`p-4 border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.inputBg}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <Wifi className="w-4 h-4 mr-2 text-green-400" />
                              <span className="font-medium">{device.name}</span>
                              {device.publicKey && <Shield className="w-4 h-4 ml-2 text-yellow-400" />}
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                              <div>IP: {device.ipAddress}:{device.port}</div>
                              <div>ID: {device.id.slice(0, 12)}...</div>
                              <div>Last seen: {new Date(device.lastSeen).toLocaleTimeString()}</div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {device.capabilities.map(cap => (
                                  <span key={cap} className="px-2 py-1 text-xs bg-gray-700 rounded">
                                    {cap}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            {networkService.isDeviceConnected(device.id) ? (
                              <button
                                onClick={() => handleDisconnectFromDevice(device.id)}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConnectToDevice(device.id)}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold mb-3 flex items-center`}>
                  <Shield className="w-5 h-5 mr-2" />
                  Security Settings
                </h3>
                <div className="space-y-4">
                  <div className={`p-4 border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.inputBg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Encryption</span>
                      <span className="text-green-400">Enabled</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      All private warehouse data is encrypted using AES-256-GCM
                    </p>
                  </div>
                  
                  <div className={`p-4 border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.inputBg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Digital Signatures</span>
                      <span className="text-green-400">Enabled</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Messages are signed using ECDSA for authenticity verification
                    </p>
                  </div>

                  <div className={`p-4 border ${ASCII_COLORS.border} rounded-lg ${ASCII_COLORS.inputBg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Local Network Only</span>
                      <span className="text-green-400">Active</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Connections are restricted to local network devices only
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold mb-3`}>
                  Device Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Device Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        className={`flex-1 p-2 rounded border ${ASCII_COLORS.border} ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
                        placeholder="Enter device name"
                      />
                      <button
                        onClick={handleUpdateDeviceName}
                        className={`px-4 py-2 ${ASCII_COLORS.buttonBg} rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
                      >
                        Update
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      This name will be visible to other devices on the network
                    </p>
                  </div>

                  {networkState && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Device Information</label>
                      <div className={`p-3 rounded border ${ASCII_COLORS.border} ${ASCII_COLORS.inputBg} space-y-2 text-sm`}>
                        <div>Device ID: {networkState.localDevice.id}</div>
                        <div>IP Address: {networkState.localDevice.ipAddress}</div>
                        <div>Port: {networkState.localDevice.port}</div>
                        <div>Capabilities: {networkState.localDevice.capabilities.join(', ')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkManager;