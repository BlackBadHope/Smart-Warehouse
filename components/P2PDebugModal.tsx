import React, { useState, useEffect } from 'react';
import { Wifi, Users, Zap, Sync, MessageCircle, X, RefreshCw, CheckCircle, AlertCircle, Bug, Play, StopCircle } from 'lucide-react';
import { ASCII_COLORS } from '../constants';
import networkService from '../services/networkService';
import debugService from '../services/debugService';
import p2pDiagnosticService from '../services/p2pDiagnosticService';

interface P2PDebugModalProps {
  show: boolean;
  onClose: () => void;
}

interface P2PStatus {
  webrtcStats: { totalPeers: number; connectedPeers: number; isInitialized: boolean };
  syncStatus: { connectedPeers: number; activeSyncs: number; lastSyncTimes: Record<string, number> };
  connectedDevices: string[];
  networkState: any;
}

interface DiagnosticStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  error?: any;
  timestamp?: number;
}

interface DiagnosticResult {
  steps: DiagnosticStep[];
  overallStatus: 'success' | 'partial' | 'failed';
  recommendations: string[];
}

const P2PDebugModal: React.FC<P2PDebugModalProps> = ({ show, onClose }) => {
  const [status, setStatus] = useState<P2PStatus | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [testMessage, setTestMessage] = useState('Hello from P2P!');
  const [logs, setLogs] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'status' | 'diagnostic'>('status');
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

  useEffect(() => {
    if (show) {
      loadStatus();
      setupEventListeners();
      
      if (autoRefresh) {
        const interval = setInterval(loadStatus, 2000);
        return () => clearInterval(interval);
      }
    }
  }, [show, autoRefresh]);

  const loadStatus = async () => {
    try {
      const webrtcStats = networkService.getP2PStats();
      const syncStatus = networkService.getSyncStatus();
      const connectedDevices = networkService.getP2PConnectedDevices();
      const networkState = networkService.getNetworkState();

      setStatus({
        webrtcStats,
        syncStatus,
        connectedDevices,
        networkState
      });
    } catch (error) {
      addLog(`Error loading status: ${error}`);
    }
  };

  const setupEventListeners = () => {
    const handlePeerConnected = (event: any) => {
      addLog(`✅ Peer connected: ${event.detail.deviceId}`);
      loadStatus();
    };

    const handlePeerDisconnected = (event: any) => {
      addLog(`❌ Peer disconnected: ${event.detail.deviceId}`);
      loadStatus();
    };

    const handleSyncReceived = (event: any) => {
      addLog(`📦 Sync received from: ${event.detail.senderId}`);
    };

    const handleP2PMessage = (event: any) => {
      addLog(`💬 P2P message from ${event.detail.senderId}: ${event.detail.message.type}`);
    };

    const handleP2PInitialized = (event: any) => {
      addLog(`🎉 P2P system initialized successfully!`);
      loadStatus();
    };

    const handleP2PInitializationFailed = (event: any) => {
      addLog(`❌ P2P initialization failed: ${event.detail.error}`);
      if (event.detail.canContinue) {
        addLog(`⚠️ Application will continue without P2P functionality`);
      }
      loadStatus();
    };

    document.addEventListener('peer-connected', handlePeerConnected);
    document.addEventListener('peer-disconnected', handlePeerDisconnected);
    document.addEventListener('inventory-sync-received', handleSyncReceived);
    document.addEventListener('p2p-message', handleP2PMessage);
    document.addEventListener('network_p2p_initialized', handleP2PInitialized);
    document.addEventListener('network_p2p_initialization_failed', handleP2PInitializationFailed);

    return () => {
      document.removeEventListener('peer-connected', handlePeerConnected);
      document.removeEventListener('peer-disconnected', handlePeerDisconnected);
      document.removeEventListener('inventory-sync-received', handleSyncReceived);
      document.removeEventListener('p2p-message', handleP2PMessage);
      document.removeEventListener('network_p2p_initialized', handleP2PInitialized);
      document.removeEventListener('network_p2p_initialization_failed', handleP2PInitializationFailed);
    };
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const handleConnectToDevice = async () => {
    if (!selectedDevice) return;
    
    addLog(`🔗 Attempting to connect to device: ${selectedDevice}`);
    
    try {
      const success = await networkService.connectToP2PDevice(selectedDevice);
      addLog(success ? `✅ Connection initiated to ${selectedDevice}` : `❌ Failed to connect to ${selectedDevice}`);
    } catch (error) {
      addLog(`❌ Connection error: ${error}`);
    }
  };

  const handleSyncWithDevice = () => {
    if (!selectedDevice) return;
    
    addLog(`🔄 Starting sync with device: ${selectedDevice}`);
    networkService.syncWithDevice(selectedDevice);
  };

  const handleSyncWithAll = () => {
    addLog(`🔄 Starting sync with all connected devices`);
    networkService.syncWithAllDevices();
  };

  const handleSendTestMessage = () => {
    if (!selectedDevice || !testMessage) return;
    
    addLog(`📤 Sending test message to ${selectedDevice}: "${testMessage}"`);
    
    const success = networkService.sendP2PMessage(selectedDevice, 'ping', { 
      message: testMessage,
      timestamp: Date.now()
    });
    
    addLog(success ? `✅ Message sent` : `❌ Failed to send message`);
  };

  const handleBroadcastMessage = () => {
    if (!testMessage) return;
    
    addLog(`📢 Broadcasting message: "${testMessage}"`);
    
    networkService.broadcastP2PMessage('ping', {
      message: testMessage,
      timestamp: Date.now()
    });
    
    addLog(`✅ Broadcast sent to ${status?.connectedDevices.length || 0} devices`);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const runDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    addLog('🔍 Starting comprehensive P2P diagnostic...');
    
    try {
      const result = await p2pDiagnosticService.runFullDiagnostic();
      setDiagnosticResult(result);
      
      addLog(`✅ Diagnostic complete: ${result.overallStatus}`);
      addLog(`📊 Steps: ${result.steps.filter(s => s.status === 'success').length}/${result.steps.length} successful`);
      
      if (result.recommendations.length > 0) {
        addLog(`💡 Recommendations: ${result.recommendations.length} items`);
      }
    } catch (error) {
      addLog(`❌ Diagnostic failed: ${error}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const runQuickDiagnostic = async () => {
    addLog('⚡ Running quick diagnostic...');
    
    try {
      const issues = await p2pDiagnosticService.quickDiagnostic();
      
      if (issues.length === 0) {
        addLog('✅ Quick diagnostic: No immediate issues found');
      } else {
        addLog(`⚠️ Quick diagnostic: Found ${issues.length} issues:`);
        issues.forEach((issue, index) => {
          addLog(`   ${index + 1}. ${issue.issue}`);
          addLog(`      Fix: ${issue.fix}`);
        });
      }
    } catch (error) {
      addLog(`❌ Quick diagnostic failed: ${error}`);
    }
  };

  const forceInitializeP2P = async () => {
    addLog('🔄 Force initializing P2P system...');
    
    try {
      // Try to reinitialize NetworkService
      await networkService.initialize();
      addLog('✅ NetworkService reinitialization attempted');
    } catch (error) {
      addLog(`❌ Failed to reinitialize NetworkService: ${error}`);
    }
  };

  const checkP2PStatus = () => {
    addLog('📊 Checking current P2P status...');
    
    try {
      const stats = networkService.getP2PStats();
      addLog(`📈 P2P Stats: Initialized=${stats.isInitialized}, Connected=${stats.connectedPeers}/${stats.totalPeers}`);
      
      const devices = networkService.getP2PConnectedDevices();
      addLog(`🔗 Connected devices: ${devices.length} (${devices.join(', ')})`);
      
      const networkState = networkService.getNetworkState();
      addLog(`🌐 Network state: Online=${networkState.isOnline}, Devices=${networkState.discoveredDevices.length}`);
      
    } catch (error) {
      addLog(`❌ Failed to get P2P status: ${error}`);
    }
  };

  if (!show) return null;

  return (
    <div className={`fixed inset-0 ${ASCII_COLORS.bg} bg-opacity-90 flex items-center justify-center z-50 p-4`}>
      <div className={`${ASCII_COLORS.modalBg} p-6 rounded-lg shadow-xl w-full max-w-5xl border-2 ${ASCII_COLORS.border} max-h-[90vh] overflow-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`${ASCII_COLORS.accent} text-xl font-bold flex items-center`}>
            <Wifi className="w-6 h-6 mr-2 text-blue-400" />
            P2P DEBUG CONSOLE
          </h2>
          <button 
            onClick={onClose}
            className={`${ASCII_COLORS.buttonBg} p-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-600">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'status' 
                ? 'border-blue-400 text-blue-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Status & Controls
          </button>
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'diagnostic' 
                ? 'border-red-400 text-red-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <Bug className="w-4 h-4 inline mr-2" />
            Diagnostic
          </button>
        </div>

        {activeTab === 'status' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Panel */}
            <div className="space-y-4">
            <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold flex items-center`}>
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
              System Status
            </h3>
            
            {status && (
              <div className={`${ASCII_COLORS.inputBg} p-4 rounded border ${ASCII_COLORS.border} space-y-3`}>
                {/* WebRTC Status */}
                <div>
                  <div className={`${ASCII_COLORS.text} font-semibold mb-2`}>WebRTC P2P:</div>
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div className={`${ASCII_COLORS.textMuted}`}>
                      Initialized: {status.webrtcStats.isInitialized ? 
                        <span className="text-green-400">✅ Yes</span> : 
                        <span className="text-red-400">❌ No</span>
                      }
                    </div>
                    <div className={`${ASCII_COLORS.textMuted}`}>
                      Total Peers: <span className={`${ASCII_COLORS.accent}`}>{status.webrtcStats.totalPeers}</span>
                    </div>
                    <div className={`${ASCII_COLORS.textMuted}`}>
                      Connected: <span className={`${ASCII_COLORS.accent}`}>{status.webrtcStats.connectedPeers}</span>
                    </div>
                  </div>
                  <div className="p-2 bg-red-900 bg-opacity-30 rounded border border-red-500 text-xs">
                    <span className="text-red-400 font-bold">⚠️ WARNING:</span> 
                    <span className="text-red-300"> P2P only works between browser tabs, NOT between different devices. Real device-to-device P2P requires signaling server.</span>
                  </div>
                </div>

                {/* Sync Status */}
                <div>
                  <div className={`${ASCII_COLORS.text} font-semibold mb-2`}>Sync Status:</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className={`${ASCII_COLORS.textMuted}`}>
                      Active Syncs: <span className={`${ASCII_COLORS.accent}`}>{status.syncStatus.activeSyncs}</span>
                    </div>
                    <div className={`${ASCII_COLORS.textMuted}`}>
                      Sync Peers: <span className={`${ASCII_COLORS.accent}`}>{status.syncStatus.connectedPeers}</span>
                    </div>
                  </div>
                </div>

                {/* Network Info */}
                <div>
                  <div className={`${ASCII_COLORS.text} font-semibold mb-2`}>Network Info:</div>
                  <div className="text-sm space-y-1">
                    <div className={`${ASCII_COLORS.textMuted}`}>
                      Device ID: <span className={`${ASCII_COLORS.accent} font-mono`}>{status.networkState.localDevice?.id?.slice(0, 16)}...</span>
                    </div>
                    <div className={`${ASCII_COLORS.textMuted}`}>
                      Device Name: <span className={`${ASCII_COLORS.accent}`}>{status.networkState.localDevice?.name}</span>
                    </div>
                    <div className={`${ASCII_COLORS.textMuted}`}>
                      IP Address: <span className={`${ASCII_COLORS.accent}`}>{status.networkState.localDevice?.ipAddress}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Connected Devices */}
            <div>
              <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold flex items-center`}>
                <Users className="w-5 h-5 mr-2 text-purple-400" />
                Connected Devices ({status?.connectedDevices.length || 0})
              </h3>
              
              <div className={`${ASCII_COLORS.inputBg} p-4 rounded border ${ASCII_COLORS.border} max-h-40 overflow-auto`}>
                {status?.connectedDevices.length ? (
                  <div className="space-y-2">
                    {status.connectedDevices.map(deviceId => (
                      <div 
                        key={deviceId}
                        className={`flex items-center justify-between p-2 rounded ${
                          selectedDevice === deviceId ? 'bg-blue-900 bg-opacity-30' : 'hover:bg-gray-800'
                        } cursor-pointer`}
                        onClick={() => setSelectedDevice(deviceId)}
                      >
                        <span className={`${ASCII_COLORS.text} font-mono text-sm`}>
                          {deviceId.slice(0, 16)}...
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 text-xs">Online</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${ASCII_COLORS.textMuted} text-center py-4`}>
                    No connected devices
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold flex items-center`}>
                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                Controls
              </h3>
              
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Device ID to connect"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className={`flex-1 ${ASCII_COLORS.inputBg} p-2 rounded border ${ASCII_COLORS.border} ${ASCII_COLORS.text} text-sm font-mono`}
                  />
                  <button
                    onClick={handleConnectToDevice}
                    className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-sm`}
                  >
                    Connect
                  </button>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleSyncWithDevice}
                    disabled={!selectedDevice}
                    className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border border-blue-500 text-sm disabled:opacity-50 flex items-center`}
                  >
                    <Sync className="w-4 h-4 mr-1" />
                    Sync Selected
                  </button>
                  <button
                    onClick={handleSyncWithAll}
                    className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border border-green-500 text-sm flex items-center`}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Sync All
                  </button>
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Test message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className={`flex-1 ${ASCII_COLORS.inputBg} p-2 rounded border ${ASCII_COLORS.border} ${ASCII_COLORS.text} text-sm`}
                  />
                  <button
                    onClick={handleSendTestMessage}
                    disabled={!selectedDevice || !testMessage}
                    className={`${ASCII_COLORS.buttonBg} px-3 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-sm disabled:opacity-50`}
                  >
                    Send
                  </button>
                  <button
                    onClick={handleBroadcastMessage}
                    disabled={!testMessage}
                    className={`${ASCII_COLORS.buttonBg} px-3 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border border-purple-500 text-sm disabled:opacity-50`}
                  >
                    Broadcast
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded"
                    />
                    <span className={`${ASCII_COLORS.text} text-sm`}>Auto-refresh status</span>
                  </label>
                  <button
                    onClick={loadStatus}
                    className={`${ASCII_COLORS.buttonBg} px-3 py-1 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-sm`}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold flex items-center`}>
                <MessageCircle className="w-5 h-5 mr-2 text-cyan-400" />
                Live Logs ({logs.length})
              </h3>
              <button
                onClick={clearLogs}
                className={`${ASCII_COLORS.buttonBg} px-3 py-1 rounded ${ASCII_COLORS.buttonHoverBg} border ${ASCII_COLORS.border} text-sm`}
              >
                Clear
              </button>
            </div>
            
            <div className={`${ASCII_COLORS.inputBg} p-4 rounded border ${ASCII_COLORS.border} h-96 overflow-auto`}>
              {logs.length ? (
                <div className="space-y-1 font-mono text-xs">
                  {logs.map((log, index) => (
                    <div key={index} className={`${ASCII_COLORS.textMuted} break-words`}>
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${ASCII_COLORS.textMuted} text-center py-8`}>
                  No logs yet. Start testing P2P functionality!
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {activeTab === 'diagnostic' && (
          <div className="space-y-6">
            {/* Diagnostic Controls */}
            <div className="flex items-center justify-between">
              <h3 className={`${ASCII_COLORS.accent} text-lg font-semibold flex items-center`}>
                <Bug className="w-5 h-5 mr-2 text-red-400" />
                P2P System Diagnostic
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={runQuickDiagnostic}
                  disabled={isRunningDiagnostic}
                  className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border border-yellow-500 text-sm disabled:opacity-50 flex items-center`}
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Quick Check
                </button>
                <button
                  onClick={runDiagnostic}
                  disabled={isRunningDiagnostic}
                  className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border border-red-500 text-sm disabled:opacity-50 flex items-center`}
                >
                  {isRunningDiagnostic ? (
                    <StopCircle className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  Full Diagnostic
                </button>
                <button
                  onClick={checkP2PStatus}
                  className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border border-blue-500 text-sm flex items-center`}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Check Status
                </button>
                <button
                  onClick={forceInitializeP2P}
                  className={`${ASCII_COLORS.buttonBg} px-4 py-2 rounded ${ASCII_COLORS.buttonHoverBg} border border-green-500 text-sm flex items-center`}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Force Init
                </button>
              </div>
            </div>

            {/* Diagnostic Results */}
            {diagnosticResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Diagnostic Steps */}
                <div className="space-y-4">
                  <h4 className={`${ASCII_COLORS.text} font-semibold`}>Diagnostic Steps</h4>
                  <div className={`${ASCII_COLORS.inputBg} p-4 rounded border ${ASCII_COLORS.border} max-h-96 overflow-auto`}>
                    <div className="space-y-3">
                      {diagnosticResult.steps.map((step, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {step.status === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                            {step.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                            {step.status === 'running' && <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />}
                            {step.status === 'pending' && <div className="w-4 h-4 rounded-full border border-gray-500" />}
                          </div>
                          <div className="flex-1">
                            <div className={`${ASCII_COLORS.text} text-sm font-medium`}>{step.name}</div>
                            {step.message && (
                              <div className={`${ASCII_COLORS.textMuted} text-xs mt-1`}>{step.message}</div>
                            )}
                            {step.error && (
                              <div className="text-red-400 text-xs mt-1 font-mono">{step.error.message || step.error}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-4">
                  <h4 className={`${ASCII_COLORS.text} font-semibold`}>
                    Recommendations ({diagnosticResult.recommendations.length})
                  </h4>
                  <div className={`${ASCII_COLORS.inputBg} p-4 rounded border ${ASCII_COLORS.border} max-h-96 overflow-auto`}>
                    {diagnosticResult.recommendations.length > 0 ? (
                      <div className="space-y-2">
                        {diagnosticResult.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="text-yellow-400 text-sm">💡</div>
                            <div className={`${ASCII_COLORS.textMuted} text-sm`}>{rec}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`${ASCII_COLORS.textMuted} text-center py-4`}>
                        No recommendations - system appears healthy!
                      </div>
                    )}
                  </div>

                  {/* Overall Status */}
                  <div className={`p-4 rounded border ${
                    diagnosticResult.overallStatus === 'success' ? 'border-green-500 bg-green-900 bg-opacity-20' :
                    diagnosticResult.overallStatus === 'partial' ? 'border-yellow-500 bg-yellow-900 bg-opacity-20' :
                    'border-red-500 bg-red-900 bg-opacity-20'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {diagnosticResult.overallStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {diagnosticResult.overallStatus === 'partial' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                      {diagnosticResult.overallStatus === 'failed' && <AlertCircle className="w-5 h-5 text-red-400" />}
                      <span className={`font-semibold ${
                        diagnosticResult.overallStatus === 'success' ? 'text-green-400' :
                        diagnosticResult.overallStatus === 'partial' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {diagnosticResult.overallStatus === 'success' && 'System Healthy'}
                        {diagnosticResult.overallStatus === 'partial' && 'Partial Issues'}
                        {diagnosticResult.overallStatus === 'failed' && 'Critical Issues'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Honest P2P Status */}
            {!diagnosticResult && (
              <div className={`${ASCII_COLORS.inputBg} p-6 rounded border border-red-500`}>
                <h4 className="text-red-400 font-semibold mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  🚨 CRITICAL: P2P System Cannot Work Between Devices
                </h4>
                <div className={`${ASCII_COLORS.textMuted} text-sm space-y-3`}>
                  <div className="p-3 bg-red-900 bg-opacity-30 rounded border border-red-500">
                    <strong className="text-red-400">Current Status:</strong> P2P system is fundamentally broken for device-to-device connections
                  </div>
                  
                  <div>
                    <strong className="text-yellow-400">Problem:</strong> BroadcastChannel only works between tabs in the same browser
                  </div>
                  
                  <div>
                    <strong className="text-yellow-400">Reality:</strong> Two different phones/computers will NEVER discover each other
                  </div>
                  
                  <div>
                    <strong className="text-yellow-400">Missing:</strong> Signaling server for WebRTC connection coordination
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 rounded border border-yellow-500">
                    <strong className="text-yellow-400">⚠️ What diagnostics show:</strong> Browser compatibility (which works), 
                    but NOT real device-to-device functionality (which is impossible with current architecture).
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 rounded border border-blue-500">
                    <strong className="text-blue-400">💡 To fix:</strong> Need to implement signaling server, QR code exchange, 
                    or manual IP entry for real P2P between devices.
                  </div>
                  
                  <div className="mt-4">
                    <a 
                      href="/honest-p2p-analysis.html" 
                      target="_blank"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      📖 Read detailed technical analysis →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default P2PDebugModal;