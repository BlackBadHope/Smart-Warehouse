import React, { useState, useEffect } from 'react';
import { Wifi, Share2, Users, Database } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import httpServerService from '../services/httpServerService';
import localNetworkScanner from '../services/localNetworkScanner';

interface LocalWarehouseSharingProps {
  currentWarehouse: { id: string; name: string } | null;
  warehouses: any[];
  onConnectToRemoteWarehouse: (warehouse: any) => void;
}

const LocalWarehouseSharing: React.FC<LocalWarehouseSharingProps> = ({
  currentWarehouse,
  warehouses,
  onConnectToRemoteWarehouse
}) => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [sharedWarehouses, setSharedWarehouses] = useState<any[]>([]);
  const [discoveredServers, setDiscoveredServers] = useState<any[]>([]);

  useEffect(() => {
    setIsServerRunning(httpServerService.isServerRunning());
    setSharedWarehouses(httpServerService.getSharedWarehouses());
  }, []);

  const handleStartServer = async () => {
    const started = await httpServerService.startServer();
    if (started) {
      setIsServerRunning(true);
      alert('✅ Local server started! You can now share warehouses.');
    } else {
      alert('❌ Failed to start server');
    }
  };

  const handleStopServer = async () => {
    await httpServerService.stopServer();
    setIsServerRunning(false);
    setSharedWarehouses([]);
    alert('🔴 Server stopped');
  };

  const handleShareWarehouse = (warehouse: any) => {
    if (!isServerRunning) {
      alert('❌ Start server first');
      return;
    }

    const success = httpServerService.shareWarehouse(warehouse.id, warehouse);
    if (success) {
      setSharedWarehouses(httpServerService.getSharedWarehouses());
      alert(`✅ Sharing "${warehouse.name}" on local network`);
    }
  };

  const handleUnshareWarehouse = (warehouseId: string) => {
    const success = httpServerService.unshareWarehouse(warehouseId);
    if (success) {
      setSharedWarehouses(httpServerService.getSharedWarehouses());
      alert('🔴 Stopped sharing warehouse');
    }
  };

  const handleScanNetwork = async () => {
    setIsScanning(true);
    try {
      const servers = await localNetworkScanner.scanLocalNetwork();
      setDiscoveredServers(servers);
      alert(`🔍 Scan complete! Found ${servers.length} servers`);
    } catch (error) {
      alert('❌ Network scan failed: ' + (error as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectToWarehouse = async (serverIP: string, warehouseId: string) => {
    try {
      const warehouse = await localNetworkScanner.connectToWarehouse(serverIP, warehouseId);
      onConnectToRemoteWarehouse(warehouse);
      alert(`✅ Connected to remote warehouse: ${warehouse.name}`);
    } catch (error) {
      alert('❌ Connection failed: ' + (error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Server Control */}
      <div className={`p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
        <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3 flex items-center`}>
          <Wifi className="w-5 h-5 mr-2" />
          Local Network Server
        </h3>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded ${
            isServerRunning ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isServerRunning ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {isServerRunning ? 'Server Running' : 'Server Stopped'}
          </div>
          
          {!isServerRunning ? (
            <button
              onClick={handleStartServer}
              className={`px-4 py-2 bg-green-800 hover:bg-green-700 rounded border ${ASCII_COLORS.border}`}
            >
              Start Server
            </button>
          ) : (
            <button
              onClick={handleStopServer}
              className={`px-4 py-2 bg-red-800 hover:bg-red-700 rounded border ${ASCII_COLORS.border}`}
            >
              Stop Server
            </button>
          )}
        </div>
      </div>

      {/* Share Current Warehouse */}
      {isServerRunning && currentWarehouse && (
        <div className={`p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
          <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3 flex items-center`}>
            <Share2 className="w-5 h-5 mr-2" />
            Share Current Warehouse
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{currentWarehouse.name}</p>
              <p className="text-sm text-gray-400">ID: {currentWarehouse.id}</p>
            </div>
            
            <button
              onClick={() => handleShareWarehouse(currentWarehouse)}
              className={`px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded border ${ASCII_COLORS.border}`}
            >
              Share on Network
            </button>
          </div>
        </div>
      )}

      {/* Currently Shared Warehouses */}
      {sharedWarehouses.length > 0 && (
        <div className={`p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
          <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3 flex items-center`}>
            <Database className="w-5 h-5 mr-2" />
            Shared Warehouses ({sharedWarehouses.length})
          </h3>
          
          <div className="space-y-2">
            {sharedWarehouses.map((warehouse) => (
              <div key={warehouse.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <span>{warehouse.name}</span>
                <button
                  onClick={() => handleUnshareWarehouse(warehouse.id)}
                  className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm"
                >
                  Stop Sharing
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Discovery */}
      <div className={`p-4 border-2 ${ASCII_COLORS.border} rounded-lg`}>
        <h3 className={`${ASCII_COLORS.accent} text-lg font-bold mb-3 flex items-center`}>
          <Users className="w-5 h-5 mr-2" />
          Find Shared Warehouses
        </h3>
        
        <button
          onClick={handleScanNetwork}
          disabled={isScanning}
          className={`px-4 py-2 bg-purple-800 hover:bg-purple-700 rounded border ${ASCII_COLORS.border} disabled:opacity-50`}
        >
          {isScanning ? 'Scanning Network...' : 'Scan Local Network'}
        </button>

        {discoveredServers.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="font-medium text-yellow-400">Found Servers:</h4>
            {discoveredServers.map((server) => (
              <div key={server.ip} className={`p-3 border ${ASCII_COLORS.border} rounded bg-gray-800`}>
                <div className="flex items-center justify-between mb-2">
                  <strong>{server.device_name}</strong>
                  <span className="text-sm text-gray-400">{server.ip}</span>
                </div>
                
                {server.warehouses.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300">Shared Warehouses:</p>
                    {server.warehouses.map((warehouse: any) => (
                      <div key={warehouse.id} className="flex items-center justify-between text-sm">
                        <span>{warehouse.name}</span>
                        <button
                          onClick={() => handleConnectToWarehouse(server.ip, warehouse.id)}
                          className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs"
                        >
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No warehouses shared</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalWarehouseSharing;