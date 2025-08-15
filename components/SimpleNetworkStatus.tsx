import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Users, Circle } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import simpleP2PService from '../services/simpleP2PService';

interface SimpleNetworkStatusProps {
  onClick?: () => void;
}

interface NetworkState {
  status: 'online' | 'offline';
  deviceCount: number;
  deviceName: string;
  devices: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline';
  }>;
}

const SimpleNetworkStatus: React.FC<SimpleNetworkStatusProps> = ({ onClick }) => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    status: 'offline',
    deviceCount: 0,
    deviceName: 'Unknown',
    devices: []
  });

  useEffect(() => {
    const updateNetworkState = () => {
      const devices = simpleP2PService.getDiscoveredDevices();
      setNetworkState({
        status: simpleP2PService.getConnectionStatus(),
        deviceCount: devices.length,
        deviceName: simpleP2PService.getDeviceName(),
        devices: devices.map(d => ({
          id: d.id,
          name: d.name,
          status: d.status
        }))
      });
    };

    // Initial update
    updateNetworkState();

    // Subscribe to P2P events
    const unsubscribeConnectionChanged = simpleP2PService.on('connection_changed', updateNetworkState);
    const unsubscribeDeviceDiscovered = simpleP2PService.on('device_discovered', updateNetworkState);
    const unsubscribeDeviceLost = simpleP2PService.on('device_lost', updateNetworkState);

    // Update every 10 seconds
    const interval = setInterval(updateNetworkState, 10000);

    return () => {
      unsubscribeConnectionChanged();
      unsubscribeDeviceDiscovered();
      unsubscribeDeviceLost();
      clearInterval(interval);
    };
  }, []);

  const getStatusIcon = () => {
    if (networkState.status === 'offline') {
      return <WifiOff size={16} className="text-red-400" />;
    }
    
    if (networkState.deviceCount === 0) {
      return <Wifi size={16} className="text-yellow-400" />;
    }
    
    return <Wifi size={16} className="text-green-400" />;
  };

  const getStatusText = () => {
    if (networkState.status === 'offline') {
      return 'P2P Offline';
    }
    
    if (networkState.deviceCount === 0) {
      return 'P2P Ready';
    }
    
    return `${networkState.deviceCount} Device${networkState.deviceCount > 1 ? 's' : ''}`;
  };

  const getStatusColor = () => {
    if (networkState.status === 'offline') {
      return 'text-red-400';
    }
    
    if (networkState.deviceCount === 0) {
      return 'text-yellow-400';
    }
    
    return 'text-green-400';
  };

  return (
    <button
      onClick={onClick}
      className={`${ASCII_COLORS.buttonBg} px-3 py-1 rounded-md ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} flex items-center gap-2 transition-colors`}
      title={`P2P Network: ${networkState.deviceName}`}
    >
      {getStatusIcon()}
      <span className={`text-xs font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      
      {/* Connection pulse animation for active connections */}
      {networkState.status === 'online' && networkState.deviceCount > 0 && (
        <Circle size={6} className="text-green-400 animate-pulse" />
      )}
    </button>
  );
};

export default SimpleNetworkStatus;