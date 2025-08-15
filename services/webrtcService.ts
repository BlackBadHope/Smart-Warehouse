import debugService from './debugService';
import { NetworkDevice, NetworkMessage } from '../types';

interface PeerConnection {
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  deviceId: string;
  isInitiator: boolean;
  state: 'connecting' | 'connected' | 'disconnected' | 'failed';
}

interface P2PMessage {
  type: 'inventory_sync' | 'device_discovery' | 'ping' | 'warehouse_update' | 'user_invite';
  senderId: string;
  timestamp: number;
  data: any;
}

class WebRTCService {
  private localDevice: NetworkDevice | null = null;
  private peers = new Map<string, PeerConnection>();
  private signalingChannel: BroadcastChannel | null = null;
  private discoveryInterval?: number;
  private isInitialized = false;
  
  // STUN servers for NAT traversal
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  async initialize(device: NetworkDevice): Promise<void> {
    try {
      debugService.info('WebRTCService: Starting initialization...', { deviceId: device.id });
      
      if (this.isInitialized) {
        debugService.info('WebRTCService: Already initialized');
        return;
      }

      // Test WebRTC support
      if (!window.RTCPeerConnection) {
        throw new Error('WebRTC not supported in this browser');
      }

      if (!window.BroadcastChannel) {
        throw new Error('BroadcastChannel API not supported');
      }

      this.localDevice = device;
      debugService.info('WebRTCService: Local device set', { device: this.localDevice });
      
      this.setupSignaling();
      debugService.info('WebRTCService: Signaling setup complete');
      
      this.startDiscovery();
      debugService.info('WebRTCService: Discovery started');
      
      this.isInitialized = true;
      
      debugService.info('WebRTCService: Initialization complete', { 
        deviceId: device.id,
        deviceName: device.name 
      });
    } catch (error) {
      debugService.error('WebRTCService: Initialization failed', error);
      throw error;
    }
  }

  private setupSignaling(): void {
    try {
      debugService.info('WebRTCService: Setting up signaling channel...');
      
      // Use BroadcastChannel for local signaling (same device discovery)
      this.signalingChannel = new BroadcastChannel('inventory-p2p-signaling');
      
      this.signalingChannel.onmessage = (event) => {
        debugService.info('WebRTCService: Received signaling message', { 
          type: event.data?.type,
          senderId: event.data?.senderId 
        });
        this.handleSignalingMessage(event.data);
      };
      
      this.signalingChannel.onerror = (error) => {
        debugService.error('WebRTCService: Signaling channel error', error);
      };
      
      debugService.info('WebRTCService: Signaling channel setup complete');
    } catch (error) {
      debugService.error('WebRTCService: Failed to setup signaling', error);
      throw error;
    }
  }

  private async handleSignalingMessage(message: any): Promise<void> {
    if (!this.localDevice) {
      debugService.warning('WebRTCService: Cannot handle message - no local device');
      return;
    }

    const { senderId, type, data, targetId } = message;
    
    // Skip our own messages
    if (senderId === this.localDevice.id) {
      return;
    }
    
    debugService.info('WebRTCService: Received signaling message', { 
      type, 
      senderId, 
      targetId,
      isForUs: targetId === this.localDevice.id || targetId === 'broadcast'
    });
    
    // Handle broadcast messages (like device-discovery) or messages specifically for us
    if (targetId === 'broadcast' || targetId === this.localDevice.id) {
      switch (type) {
        case 'offer':
          await this.handleOffer(senderId, data);
          break;
        case 'answer':
          await this.handleAnswer(senderId, data);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(senderId, data);
          break;
        case 'device-discovery':
          await this.handleDeviceDiscovery(senderId, data);
          break;
        default:
          debugService.warning('WebRTCService: Unknown message type', type);
      }
    } else {
      debugService.info('WebRTCService: Message not for us, ignoring', { targetId, ourId: this.localDevice.id });
    }
  }

  private async createPeerConnection(deviceId: string, isInitiator = false): Promise<PeerConnection> {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    
    const peer: PeerConnection = {
      connection: pc,
      deviceId,
      isInitiator,
      state: 'connecting'
    };

    // Setup ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage(deviceId, 'ice-candidate', event.candidate);
      }
    };

    // Setup connection state monitoring
    pc.onconnectionstatechange = () => {
      peer.state = pc.connectionState as any;
      debugService.info('WebRTCService: Connection state changed', { 
        deviceId, 
        state: pc.connectionState 
      });
      
      if (pc.connectionState === 'connected') {
        this.onPeerConnected(deviceId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.onPeerDisconnected(deviceId);
      }
    };

    // Setup data channel
    if (isInitiator) {
      const dataChannel = pc.createDataChannel('inventory', {
        ordered: true
      });
      
      this.setupDataChannel(peer, dataChannel);
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peer, event.channel);
      };
    }

    this.peers.set(deviceId, peer);
    return peer;
  }

  private setupDataChannel(peer: PeerConnection, dataChannel: RTCDataChannel): void {
    peer.dataChannel = dataChannel;
    
    dataChannel.onopen = () => {
      debugService.info('WebRTCService: Data channel opened', { deviceId: peer.deviceId });
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message: P2PMessage = JSON.parse(event.data);
        this.handleP2PMessage(peer.deviceId, message);
      } catch (error) {
        debugService.error('WebRTCService: Failed to parse P2P message', error);
      }
    };
    
    dataChannel.onerror = (error) => {
      debugService.error('WebRTCService: Data channel error', { deviceId: peer.deviceId, error });
    };
    
    dataChannel.onclose = () => {
      debugService.info('WebRTCService: Data channel closed', { deviceId: peer.deviceId });
    };
  }

  private async handleOffer(senderId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const peer = await this.createPeerConnection(senderId, false);
    
    await peer.connection.setRemoteDescription(offer);
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);
    
    this.sendSignalingMessage(senderId, 'answer', answer);
  }

  private async handleAnswer(senderId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(senderId);
    if (!peer) {
      debugService.warning('WebRTCService: Received answer for unknown peer', senderId);
      return;
    }
    
    await peer.connection.setRemoteDescription(answer);
  }

  private async handleIceCandidate(senderId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(senderId);
    if (!peer) {
      debugService.warning('WebRTCService: Received ICE candidate for unknown peer', senderId);
      return;
    }
    
    await peer.connection.addIceCandidate(candidate);
  }

  private async handleDeviceDiscovery(senderId: string, deviceInfo: NetworkDevice): Promise<void> {
    if (!this.localDevice) {
      debugService.error('WebRTCService: Cannot handle device discovery - no local device');
      return;
    }
    
    if (senderId === this.localDevice.id) {
      debugService.info('WebRTCService: Ignoring our own discovery message');
      return; // Ignore our own discovery messages
    }
    
    debugService.info('WebRTCService: Discovered device', {
      senderId,
      deviceName: deviceInfo.name,
      deviceId: deviceInfo.id,
      existingConnection: this.peers.has(senderId)
    });
    
    // Reply with our device info
    debugService.info('WebRTCService: Replying to discovery with our device info');
    this.sendSignalingMessage(senderId, 'device-discovery', this.localDevice);
    
    // Try to establish P2P connection if we don't have one
    if (!this.peers.has(senderId)) {
      debugService.info('WebRTCService: Attempting to connect to discovered device', senderId);
      try {
        await this.connectToPeer(senderId);
      } catch (error) {
        debugService.error('WebRTCService: Failed to connect to discovered device', { senderId, error });
      }
    } else {
      debugService.info('WebRTCService: Already connected to device', senderId);
    }
  }

  private sendSignalingMessage(targetId: string, type: string, data: any): void {
    if (!this.signalingChannel) {
      debugService.error('WebRTCService: Cannot send message - no signaling channel');
      return;
    }
    
    if (!this.localDevice) {
      debugService.error('WebRTCService: Cannot send message - no local device');
      return;
    }
    
    const message = {
      senderId: this.localDevice.id,
      targetId,
      type,
      data,
      timestamp: Date.now()
    };
    
    debugService.info('WebRTCService: Sending signaling message', { type, targetId });
    this.signalingChannel.postMessage(message);
  }

  // Public methods
  async connectToPeer(deviceId: string): Promise<boolean> {
    if (this.peers.has(deviceId)) {
      debugService.info('WebRTCService: Already connected to peer', deviceId);
      return true;
    }
    
    try {
      const peer = await this.createPeerConnection(deviceId, true);
      
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);
      
      this.sendSignalingMessage(deviceId, 'offer', offer);
      
      return true;
    } catch (error) {
      debugService.error('WebRTCService: Failed to connect to peer', { deviceId, error });
      return false;
    }
  }

  sendMessage(deviceId: string, message: P2PMessage): boolean {
    const peer = this.peers.get(deviceId);
    if (!peer || !peer.dataChannel || peer.dataChannel.readyState !== 'open') {
      debugService.warning('WebRTCService: Cannot send message, no open channel', deviceId);
      return false;
    }
    
    try {
      peer.dataChannel.send(JSON.stringify(message));
      return true;
    } catch (error) {
      debugService.error('WebRTCService: Failed to send message', { deviceId, error });
      return false;
    }
  }

  broadcastMessage(message: Omit<P2PMessage, 'senderId' | 'timestamp'>): void {
    if (!this.localDevice) return;
    
    const fullMessage: P2PMessage = {
      ...message,
      senderId: this.localDevice.id,
      timestamp: Date.now()
    };
    
    let sentCount = 0;
    this.peers.forEach((peer, deviceId) => {
      if (this.sendMessage(deviceId, fullMessage)) {
        sentCount++;
      }
    });
    
    debugService.info('WebRTCService: Broadcast message sent', { 
      type: message.type, 
      recipients: sentCount 
    });
  }

  private handleP2PMessage(senderId: string, message: P2PMessage): void {
    debugService.info('WebRTCService: Received P2P message', { 
      senderId, 
      type: message.type 
    });
    
    // Dispatch to appropriate handlers
    switch (message.type) {
      case 'inventory_sync':
        this.onInventorySync(senderId, message.data);
        break;
      case 'warehouse_update':
        this.onWarehouseUpdate(senderId, message.data);
        break;
      case 'user_invite':
        this.onUserInvite(senderId, message.data);
        break;
      case 'ping':
        // Reply with pong
        this.sendMessage(senderId, {
          type: 'ping',
          senderId: this.localDevice!.id,
          timestamp: Date.now(),
          data: { reply: true }
        });
        break;
    }
    
    // Emit custom event for the main app
    document.dispatchEvent(new CustomEvent('p2p-message', {
      detail: { senderId, message }
    }));
  }

  private onPeerConnected(deviceId: string): void {
    debugService.info('WebRTCService: Peer connected', deviceId);
    
    // Trigger automatic sync when a peer connects
    setTimeout(() => {
      const inventorySyncEvent = new CustomEvent('inventory-sync-request', {
        detail: { deviceId, action: 'full_sync' }
      });
      document.dispatchEvent(inventorySyncEvent);
    }, 1000); // Small delay to ensure connection is stable
    
    document.dispatchEvent(new CustomEvent('peer-connected', {
      detail: { deviceId }
    }));
  }

  private onPeerDisconnected(deviceId: string): void {
    debugService.info('WebRTCService: Peer disconnected', deviceId);
    this.peers.delete(deviceId);
    document.dispatchEvent(new CustomEvent('peer-disconnected', {
      detail: { deviceId }
    }));
  }

  private onInventorySync(senderId: string, data: any): void {
    debugService.info('WebRTCService: Received inventory sync', { senderId, items: data.items?.length });
    document.dispatchEvent(new CustomEvent('inventory-sync-received', {
      detail: { senderId, data }
    }));
  }

  private onWarehouseUpdate(senderId: string, data: any): void {
    debugService.info('WebRTCService: Received warehouse update', { senderId, action: data.action });
    document.dispatchEvent(new CustomEvent('warehouse-update-received', {
      detail: { senderId, data }
    }));
  }

  private onUserInvite(senderId: string, data: any): void {
    debugService.info('WebRTCService: Received user invite', { senderId, warehouse: data.warehouseName });
    document.dispatchEvent(new CustomEvent('user-invite-received', {
      detail: { senderId, data }
    }));
  }

  private startDiscovery(): void {
    try {
      debugService.info('WebRTCService: Starting device discovery...');
      
      // Broadcast our presence every 30 seconds
      this.discoveryInterval = window.setInterval(() => {
        if (this.localDevice && this.signalingChannel) {
          const message = {
            senderId: this.localDevice.id,
            targetId: 'broadcast',
            type: 'device-discovery',
            data: this.localDevice,
            timestamp: Date.now()
          };
          
          debugService.info('WebRTCService: Broadcasting discovery message', { deviceId: this.localDevice.id });
          this.signalingChannel.postMessage(message);
        } else {
          debugService.warning('WebRTCService: Cannot broadcast - missing localDevice or signalingChannel');
        }
      }, 30000);
      
      // Send initial discovery message
      if (this.localDevice && this.signalingChannel) {
        const message = {
          senderId: this.localDevice.id,
          targetId: 'broadcast',
          type: 'device-discovery',
          data: this.localDevice,
          timestamp: Date.now()
        };
        
        debugService.info('WebRTCService: Sending initial discovery message', { 
          deviceId: this.localDevice.id,
          deviceName: this.localDevice.name 
        });
        this.signalingChannel.postMessage(message);
      } else {
        debugService.error('WebRTCService: Cannot send initial discovery - missing localDevice or signalingChannel');
      }
      
      debugService.info('WebRTCService: Discovery setup complete');
    } catch (error) {
      debugService.error('WebRTCService: Failed to start discovery', error);
      throw error;
    }
  }

  // Status and utility methods
  getConnectedPeers(): string[] {
    return Array.from(this.peers.keys()).filter(deviceId => {
      const peer = this.peers.get(deviceId);
      return peer?.state === 'connected' && peer.dataChannel?.readyState === 'open';
    });
  }

  getPeerStatus(deviceId: string): string | null {
    const peer = this.peers.get(deviceId);
    return peer ? peer.state : null;
  }

  getStats(): { totalPeers: number; connectedPeers: number; isInitialized: boolean } {
    return {
      totalPeers: this.peers.size,
      connectedPeers: this.getConnectedPeers().length,
      isInitialized: this.isInitialized
    };
  }

  // QR Connection Methods
  async createConnectionOffer(): Promise<{
    deviceId: string;
    deviceName: string;
    offer: RTCSessionDescriptionInit;
  }> {
    if (!this.localDevice) {
      throw new Error('WebRTC not initialized');
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const dataChannel = pc.createDataChannel('inventory', { ordered: true });
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await new Promise<void>((resolve) => {
      pc.onicecandidate = (event) => {
        if (event.candidate === null) {
          resolve();
        }
      };
    });

    const connectionInfo = {
      deviceId: this.localDevice.id,
      deviceName: this.localDevice.name,
      offer: pc.localDescription!.toJSON()
    };

    // Store the pending connection
    this.peers.set(`pending-${this.localDevice.id}`, {
      connection: pc,
      dataChannel,
      deviceId: `pending-${this.localDevice.id}`,
      isInitiator: true,
      state: 'connecting'
    });

    debugService.info('WebRTCService: Created QR connection offer', {
      deviceId: this.localDevice.id,
      hasOffer: !!connectionInfo.offer
    });

    return connectionInfo;
  }

  async acceptConnectionOffer(offerData: {
    deviceId: string;
    deviceName: string;
    offer: RTCSessionDescriptionInit;
  }): Promise<{
    deviceId: string;
    deviceName: string;
    answer: RTCSessionDescriptionInit;
  }> {
    if (!this.localDevice) {
      throw new Error('WebRTC not initialized');
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    
    // Set up data channel handler
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannel({ 
        connection: pc, 
        dataChannel: channel,
        deviceId: offerData.deviceId,
        isInitiator: false,
        state: 'connecting'
      }, channel);
    };

    // Set remote description and create answer
    await pc.setRemoteDescription(offerData.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      pc.onicecandidate = (event) => {
        if (event.candidate === null) {
          resolve();
        }
      };
    });

    // Store the peer connection
    this.peers.set(offerData.deviceId, {
      connection: pc,
      deviceId: offerData.deviceId,
      isInitiator: false,
      state: 'connecting'
    });

    // Set up connection monitoring
    pc.onconnectionstatechange = () => {
      const peer = this.peers.get(offerData.deviceId);
      if (peer) {
        peer.state = pc.connectionState as any;
        debugService.info('WebRTCService: QR connection state changed', { 
          deviceId: offerData.deviceId, 
          state: pc.connectionState 
        });
        
        if (pc.connectionState === 'connected') {
          this.onPeerConnected(offerData.deviceId);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          this.onPeerDisconnected(offerData.deviceId);
        }
      }
    };

    const answerData = {
      deviceId: this.localDevice.id,
      deviceName: this.localDevice.name,
      answer: pc.localDescription!.toJSON()
    };

    debugService.info('WebRTCService: Created QR connection answer', {
      remoteDeviceId: offerData.deviceId,
      localDeviceId: this.localDevice.id
    });

    return answerData;
  }

  async completeConnectionHandshake(answerData: {
    deviceId: string;
    deviceName: string;
    answer: RTCSessionDescriptionInit;
  }): Promise<boolean> {
    const pendingPeer = this.peers.get(`pending-${this.localDevice?.id}`);
    if (!pendingPeer) {
      debugService.error('WebRTCService: No pending connection found for handshake');
      return false;
    }

    try {
      // Set the answer from the remote device
      await pendingPeer.connection.setRemoteDescription(answerData.answer);

      // Move from pending to active connection
      this.peers.delete(`pending-${this.localDevice!.id}`);
      this.peers.set(answerData.deviceId, {
        ...pendingPeer,
        deviceId: answerData.deviceId,
        state: 'connecting'
      });

      // Set up connection monitoring
      pendingPeer.connection.onconnectionstatechange = () => {
        const peer = this.peers.get(answerData.deviceId);
        if (peer) {
          peer.state = pendingPeer.connection.connectionState as any;
          debugService.info('WebRTCService: QR handshake connection state changed', { 
            deviceId: answerData.deviceId, 
            state: pendingPeer.connection.connectionState 
          });
          
          if (pendingPeer.connection.connectionState === 'connected') {
            this.onPeerConnected(answerData.deviceId);
          } else if (pendingPeer.connection.connectionState === 'disconnected' || 
                     pendingPeer.connection.connectionState === 'failed') {
            this.onPeerDisconnected(answerData.deviceId);
          }
        }
      };

      debugService.info('WebRTCService: QR connection handshake completed', {
        remoteDeviceId: answerData.deviceId
      });

      return true;
    } catch (error) {
      debugService.error('WebRTCService: Failed to complete QR handshake', error);
      this.peers.delete(`pending-${this.localDevice!.id}`);
      return false;
    }
  }

  // Cleanup
  disconnect(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }
    
    this.peers.forEach(peer => {
      peer.connection.close();
    });
    this.peers.clear();
    
    if (this.signalingChannel) {
      this.signalingChannel.close();
      this.signalingChannel = null;
    }
    
    this.isInitialized = false;
    debugService.info('WebRTCService: Disconnected and cleaned up');
  }
}

export default new WebRTCService();