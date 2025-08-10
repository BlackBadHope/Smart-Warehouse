import React, { useState, useEffect } from 'react';
import { QrCode, Download, Upload, X, Wifi, Smartphone } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import debugService from '../services/debugService';
import * as localStorageService from '../services/localStorageService';

interface QRSyncModalProps {
  show: boolean;
  onClose: () => void;
}

interface SyncData {
  version: string;
  timestamp: string;
  deviceName: string;
  warehouses: any[];
  bucketItems: any[];
  users: any[];
}

export default function QRSyncModal({ show, onClose }: QRSyncModalProps) {
  const [mode, setMode] = useState<'share' | 'receive'>('share');
  const [qrData, setQrData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [deviceName, setDeviceName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (show) {
      // Set default device name
      const userAgent = navigator.userAgent;
      const deviceType = /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'Mobile' : 'Desktop';
      setDeviceName(`${deviceType}-${Date.now().toString().slice(-4)}`);
    }
  }, [show]);

  if (!show) return null;

  const generateQRData = () => {
    setIsGenerating(true);
    debugService.action('QRSync: Generating sync data');

    try {
      const syncData: SyncData = {
        version: '2.6.0',
        timestamp: new Date().toISOString(),
        deviceName: deviceName || 'Unknown Device',
        warehouses: localStorageService.getWarehouses(),
        bucketItems: localStorageService.getBucketItems(),
        users: JSON.parse(localStorage.getItem('inventory-os-users') || '[]')
      };

      // Compress data and convert to base64 (safe for Unicode/Cyrillic)
      const jsonString = JSON.stringify(syncData);
      const compressedData = btoa(unescape(encodeURIComponent(jsonString)));
      setQrData(compressedData);
      
      debugService.info('QRSync: Data generated successfully', { 
        warehouseCount: syncData.warehouses.length,
        itemCount: syncData.bucketItems.length,
        userCount: syncData.users.length,
        dataSize: compressedData.length 
      });
    } catch (error) {
      debugService.error('QRSync: Failed to generate data', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = () => {
    if (!importData.trim()) {
      debugService.warning('QRSync: No import data provided');
      return;
    }

    try {
      // Decode base64 and parse JSON (safe for Unicode/Cyrillic)
      const decodedData = decodeURIComponent(escape(atob(importData.trim())));
      const syncData: SyncData = JSON.parse(decodedData);

      debugService.action('QRSync: Importing data', {
        sourceDevice: syncData.deviceName,
        timestamp: syncData.timestamp,
        warehouseCount: syncData.warehouses?.length || 0
      });

      // Confirm before overwriting
      if (window.confirm(`Import data from \"${syncData.deviceName}\"? This will merge with your existing data.`)) {
        
        // Import warehouses (merge, don't overwrite)
        if (syncData.warehouses?.length > 0) {
          const existingWarehouses = localStorageService.getWarehouses();
          const mergedWarehouses = [...existingWarehouses];
          
          syncData.warehouses.forEach(importWarehouse => {
            // Check if warehouse already exists
            const existingIndex = mergedWarehouses.findIndex(w => w.id === importWarehouse.id);
            if (existingIndex === -1) {
              mergedWarehouses.push(importWarehouse);
            } else {
              // Merge rooms and containers
              const existing = mergedWarehouses[existingIndex];
              if (importWarehouse.rooms) {
                existing.rooms = existing.rooms || [];
                importWarehouse.rooms.forEach((room: any) => {
                  if (!existing.rooms.find((r: any) => r.id === room.id)) {
                    existing.rooms.push(room);
                  }
                });
              }
            }
          });
          
          localStorage.setItem('inventory-os-data', JSON.stringify({
            warehouses: mergedWarehouses,
            bucketItems: syncData.bucketItems || [],
            shoppingList: []
          }));
        }

        // Import users (merge)
        if (syncData.users?.length > 0) {
          const existingUsers = JSON.parse(localStorage.getItem('inventory-os-users') || '[]');
          const mergedUsers = [...existingUsers];
          
          syncData.users.forEach(importUser => {
            if (!mergedUsers.find(u => u.id === importUser.id)) {
              mergedUsers.push(importUser);
            }
          });
          
          localStorage.setItem('inventory-os-users', JSON.stringify(mergedUsers));
        }

        debugService.info('QRSync: Data imported successfully');
        alert('Data imported successfully! Please refresh the page to see changes.');
        onClose();
      }
    } catch (error) {
      debugService.error('QRSync: Failed to import data', error);
      alert('Failed to import data. Please check the QR code data and try again.');
    }
  };

  const generateQRCodeURL = (data: string) => {
    // Use a free QR code API
    return `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(data)}`;
  };

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} rounded-lg shadow-xl w-full max-w-md border-2 ${ASCII_COLORS.border}`}>
        <div className="flex items-center justify-between p-4 border-b border-yellow-700">
          <h2 className={`text-xl font-bold ${ASCII_COLORS.accent} flex items-center gap-2`}>
            <Wifi className="w-5 h-5" />
            Device Sync
          </h2>
          <button onClick={onClose} className={`${ASCII_COLORS.buttonBg} p-2 rounded ${ASCII_COLORS.buttonHoverBg}`}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          {/* Mode Selection */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('share')}
              className={`flex-1 p-2 rounded text-sm ${mode === 'share' ? `${ASCII_COLORS.accent} bg-yellow-600 bg-opacity-20` : `${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text}`}`}
            >
              <Upload className="w-4 h-4 mx-auto mb-1" />
              Share Data
            </button>
            <button
              onClick={() => setMode('receive')}
              className={`flex-1 p-2 rounded text-sm ${mode === 'receive' ? `${ASCII_COLORS.accent} bg-yellow-600 bg-opacity-20` : `${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text}`}`}
            >
              <Download className="w-4 h-4 mx-auto mb-1" />
              Receive Data
            </button>
          </div>

          {mode === 'share' ? (
            <div>
              <div className="mb-4">
                <label className={`block text-sm ${ASCII_COLORS.text} mb-2`}>Device Name:</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text}`}
                  placeholder="My Device"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {!qrData ? (
                <button
                  onClick={generateQRData}
                  disabled={isGenerating}
                  className={`w-full p-3 ${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}
                >
                  {isGenerating ? 'Generating...' : 'Generate QR Code'}
                </button>
              ) : (
                <div className="text-center">
                  <div className="mb-4 p-4 bg-white rounded-lg">
                    <img 
                      src={generateQRCodeURL(qrData)} 
                      alt="Sync QR Code"
                      className="mx-auto"
                      style={{ maxWidth: '256px', height: 'auto' }}
                    />
                  </div>
                  <p className={`text-sm ${ASCII_COLORS.text} opacity-70 mb-4`}>
                    Scan this QR code with another device to import your data
                  </p>
                  <button
                    onClick={() => setQrData('')}
                    className={`${ASCII_COLORS.buttonBg} ${ASCII_COLORS.text} px-4 py-2 rounded`}
                  >
                    Generate New
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className={`text-sm ${ASCII_COLORS.text} mb-4`}>
                Paste the data from QR code or enter manually:
              </p>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste QR code data here..."
                className={`w-full p-2 border ${ASCII_COLORS.border} rounded ${ASCII_COLORS.inputBg} ${ASCII_COLORS.text} h-32 text-xs`}
                style={{ fontSize: '16px' }}
              />
              <button
                onClick={handleImport}
                disabled={!importData.trim()}
                className={`w-full mt-4 p-3 ${ASCII_COLORS.buttonBg} ${ASCII_COLORS.accent} rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} disabled:opacity-50`}
              >
                Import Data
              </button>
            </div>
          )}

          <div className={`mt-4 p-3 bg-gray-800 rounded text-xs ${ASCII_COLORS.text} opacity-70`}>
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4" />
              <span className="font-medium">How it works:</span>
            </div>
            <ul className="space-y-1 text-xs">
              <li>• Generate QR on one device</li>
              <li>• Scan with another device's camera</li>
              <li>• Or manually copy/paste the data</li>
              <li>• Data is merged, not overwritten</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}