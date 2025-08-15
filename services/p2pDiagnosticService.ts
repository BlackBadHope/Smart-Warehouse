import debugService from './debugService';

interface DiagnosticStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  error?: any;
  timestamp?: number;
}

interface P2PDiagnosticResult {
  steps: DiagnosticStep[];
  overallStatus: 'success' | 'partial' | 'failed';
  recommendations: string[];
}

class P2PDiagnosticService {
  private diagnosticSteps: DiagnosticStep[] = [
    { name: 'Browser WebRTC Support', status: 'pending' },
    { name: 'RTCPeerConnection Creation', status: 'pending' },
    { name: 'Data Channel Support', status: 'pending' },
    { name: 'BroadcastChannel API', status: 'pending' },
    { name: 'WebRTC Service Initialization', status: 'pending' },
    { name: 'P2P Sync Service Setup', status: 'pending' },
    { name: 'Network Service Integration', status: 'pending' },
    { name: 'Device Discovery Test', status: 'pending' },
    { name: 'Connection Establishment', status: 'pending' },
    { name: 'Data Channel Communication', status: 'pending' }
  ];

  async runFullDiagnostic(): Promise<P2PDiagnosticResult> {
    debugService.info('P2PDiagnostic: Starting comprehensive P2P diagnostic');
    
    const results: DiagnosticStep[] = [];
    const recommendations: string[] = [];

    // Step 1: Browser WebRTC Support
    const webrtcSupport = await this.testWebRTCSupport();
    results.push(webrtcSupport);
    if (webrtcSupport.status === 'error') {
      recommendations.push('Your browser does not support WebRTC. Please use Chrome, Firefox, or Edge.');
    }

    // Step 2: RTCPeerConnection Creation
    const peerConnectionTest = await this.testPeerConnectionCreation();
    results.push(peerConnectionTest);
    if (peerConnectionTest.status === 'error') {
      recommendations.push('RTCPeerConnection creation failed. Check browser security settings.');
    }

    // Step 3: Data Channel Support
    const dataChannelTest = await this.testDataChannelSupport();
    results.push(dataChannelTest);
    if (dataChannelTest.status === 'error') {
      recommendations.push('Data channels not supported. Some features may not work.');
    }

    // Step 4: BroadcastChannel API
    const broadcastChannelTest = await this.testBroadcastChannelAPI();
    results.push(broadcastChannelTest);
    if (broadcastChannelTest.status === 'error') {
      recommendations.push('BroadcastChannel API not available. Device discovery will not work between tabs.');
    }

    // Step 5: WebRTC Service Initialization
    const webrtcServiceTest = await this.testWebRTCServiceInit();
    results.push(webrtcServiceTest);

    // Step 6: P2P Sync Service Setup
    const syncServiceTest = await this.testP2PSyncServiceSetup();
    results.push(syncServiceTest);

    // Step 7: Network Service Integration
    const networkIntegrationTest = await this.testNetworkServiceIntegration();
    results.push(networkIntegrationTest);

    // Step 8: Device Discovery Test
    const discoveryTest = await this.testDeviceDiscovery();
    results.push(discoveryTest);

    // Step 9: Connection Establishment Test
    const connectionTest = await this.testConnectionEstablishment();
    results.push(connectionTest);

    // Step 10: Data Channel Communication Test
    const communicationTest = await this.testDataChannelCommunication();
    results.push(communicationTest);

    // Calculate overall status
    const errorCount = results.filter(r => r.status === 'error').length;
    const successCount = results.filter(r => r.status === 'success').length;
    
    let overallStatus: 'success' | 'partial' | 'failed';
    if (errorCount === 0) {
      overallStatus = 'success';
    } else if (successCount > errorCount) {
      overallStatus = 'partial';
    } else {
      overallStatus = 'failed';
    }

    const result: P2PDiagnosticResult = {
      steps: results,
      overallStatus,
      recommendations
    };

    debugService.info('P2PDiagnostic: Diagnostic complete', {
      overallStatus,
      successCount,
      errorCount,
      recommendationsCount: recommendations.length
    });

    return result;
  }

  private async testWebRTCSupport(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'Browser WebRTC Support',
      status: 'running',
      timestamp: Date.now()
    };

    try {
      if (!window.RTCPeerConnection) {
        throw new Error('RTCPeerConnection not available');
      }
      if (!window.RTCDataChannel && !RTCPeerConnection.prototype.createDataChannel) {
        throw new Error('RTCDataChannel not available');
      }

      step.status = 'success';
      step.message = 'WebRTC APIs are available';
    } catch (error) {
      step.status = 'error';
      step.error = error;
      step.message = `WebRTC not supported: ${error.message}`;
    }

    return step;
  }

  private async testPeerConnectionCreation(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'RTCPeerConnection Creation',
      status: 'running',
      timestamp: Date.now()
    };

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Test creating offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      pc.close();

      step.status = 'success';
      step.message = 'RTCPeerConnection created and offer generated successfully';
    } catch (error) {
      step.status = 'error';
      step.error = error;
      step.message = `Failed to create RTCPeerConnection: ${error.message}`;
    }

    return step;
  }

  private async testDataChannelSupport(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'Data Channel Support',
      status: 'running',
      timestamp: Date.now()
    };

    try {
      const pc = new RTCPeerConnection();
      const channel = pc.createDataChannel('test', { ordered: true });
      
      if (!channel) {
        throw new Error('createDataChannel returned null');
      }

      pc.close();

      step.status = 'success';
      step.message = 'Data channels are supported';
    } catch (error) {
      step.status = 'error';
      step.error = error;
      step.message = `Data channel creation failed: ${error.message}`;
    }

    return step;
  }

  private async testBroadcastChannelAPI(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'BroadcastChannel API',
      status: 'running',
      timestamp: Date.now()
    };

    try {
      if (!window.BroadcastChannel) {
        throw new Error('BroadcastChannel API not available');
      }

      const channel = new BroadcastChannel('test-diagnostic');
      channel.close();

      step.status = 'success';
      step.message = 'BroadcastChannel API is available';
    } catch (error) {
      step.status = 'error';
      step.error = error;
      step.message = `BroadcastChannel not available: ${error.message}`;
    }

    return step;
  }

  private async testWebRTCServiceInit(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'WebRTC Service Initialization',
      status: 'running',
      timestamp: Date.now()
    };

    try {
      // Try to import webrtcService
      const webrtcService = await import('./webrtcService');
      
      if (!webrtcService.default) {
        throw new Error('WebRTC service not available');
      }

      // Check if service has required methods
      const requiredMethods = ['initialize', 'connectToPeer', 'sendMessage', 'broadcastMessage'];
      for (const method of requiredMethods) {
        if (typeof webrtcService.default[method] !== 'function') {
          throw new Error(`WebRTC service missing method: ${method}`);
        }
      }

      step.status = 'success';
      step.message = 'WebRTC service loaded and has required methods';
    } catch (error) {
      step.status = 'error';
      step.error = error;
      step.message = `WebRTC service initialization failed: ${error.message}`;
    }

    return step;
  }

  private async testP2PSyncServiceSetup(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'P2P Sync Service Setup',
      status: 'running',
      timestamp: Date.now()
    };

    try {
      const p2pSyncService = await import('./p2pSyncService');
      
      if (!p2pSyncService.default) {
        throw new Error('P2P sync service not available');
      }

      // Check required methods
      const requiredMethods = ['requestFullSync', 'getSyncStatus'];
      for (const method of requiredMethods) {
        if (typeof p2pSyncService.default[method] !== 'function') {
          throw new Error(`P2P sync service missing method: ${method}`);
        }
      }

      step.status = 'success';
      step.message = 'P2P sync service loaded and configured';
    } catch (error) {
      step.status = 'error';
      step.error = error;
      step.message = `P2P sync service setup failed: ${error.message}`;
    }

    return step;
  }

  private async testNetworkServiceIntegration(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'Network Service Integration',
      status: 'running',
      timestamp: Date.now()
    };

    try {
      const networkService = await import('./networkService');
      
      if (!networkService.default) {
        throw new Error('Network service not available');
      }

      // Check P2P integration methods
      const p2pMethods = ['getP2PStats', 'connectToP2PDevice', 'sendP2PMessage'];
      for (const method of p2pMethods) {
        if (typeof networkService.default[method] !== 'function') {
          throw new Error(`Network service missing P2P method: ${method}`);
        }
      }

      step.status = 'success';
      step.message = 'Network service has P2P integration';
    } catch (error) {
      step.status = 'error';
      step.error = error;
      step.message = `Network service integration failed: ${error.message}`;
    }

    return step;
  }

  private async testDeviceDiscovery(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'Real Device Discovery Test',
      status: 'running',
      timestamp: Date.now()
    };

    // ЧЕСТНАЯ ДИАГНОСТИКА: BroadcastChannel НЕ РАБОТАЕТ между устройствами
    step.status = 'error';
    step.error = new Error('BroadcastChannel only works within the same browser');
    step.message = 'CRITICAL: Current implementation cannot discover devices across different machines. BroadcastChannel only works between tabs in the same browser. Real P2P requires a signaling server.';

    return step;
  }

  private async testConnectionEstablishment(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'Real P2P Connection Test',
      status: 'running',
      timestamp: Date.now()
    };

    // ЧЕСТНАЯ ДИАГНОСТИКА: Без сигналинг сервера нет реального P2P
    step.status = 'error';
    step.error = new Error('No signaling server for real device connections');
    step.message = 'CRITICAL: WebRTC requires signaling server to exchange SDP offers/answers between different devices. Current implementation has no signaling server, so real P2P connections are impossible.';

    return step;
  }

  private async testDataChannelCommunication(): Promise<DiagnosticStep> {
    const step: DiagnosticStep = {
      name: 'Real Data Channel Communication',
      status: 'running',
      timestamp: Date.now()
    };

    // ЧЕСТНАЯ ДИАГНОСТИКА: Без подключенных устройств нет обмена данными
    step.status = 'error';
    step.error = new Error('No real devices connected for data exchange');
    step.message = 'CRITICAL: Data channels work only after establishing P2P connections between real devices. Since there is no signaling server, no devices can connect, so data communication is impossible.';

    return step;
  }

  // Quick diagnostic for immediate issues
  async quickDiagnostic(): Promise<{ issue: string; fix: string }[]> {
    const issues: { issue: string; fix: string }[] = [];

    // КРИТИЧЕСКАЯ ПРОБЛЕМА: Нет реального P2P
    issues.push({
      issue: 'P2P system cannot work between different devices',
      fix: 'CRITICAL: BroadcastChannel only works within the same browser. Need to implement a signaling server for real device-to-device connections.'
    });

    issues.push({
      issue: 'No signaling server for WebRTC connections',
      fix: 'Implement WebSocket signaling server or use external service like Firebase, Socket.io, or WebRTC signaling service.'
    });

    issues.push({
      issue: 'Device discovery is fake - only works between browser tabs',
      fix: 'Replace BroadcastChannel with real network discovery (mDNS, server coordination, QR codes, or manual IP entry).'
    });

    // Также проверим браузерную поддержку
    if (!window.RTCPeerConnection) {
      issues.push({
        issue: 'WebRTC not supported in this browser',
        fix: 'Use Chrome, Firefox, Safari, or Edge browser'
      });
    }

    if (!window.BroadcastChannel) {
      issues.push({
        issue: 'BroadcastChannel API not available',
        fix: 'Update browser to a recent version'
      });
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      issues.push({
        issue: 'WebRTC requires HTTPS or localhost',
        fix: 'Serve the application over HTTPS or use localhost'
      });
    }

    return issues;
  }
}

export default new P2PDiagnosticService();