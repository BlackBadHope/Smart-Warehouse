import debugService from './debugService';

interface QROfferData {
  deviceId: string;
  deviceName: string;
  localIP?: string;
  offer: RTCSessionDescriptionInit;
  timestamp: number;
}

interface QRAnswerData {
  deviceId: string;
  deviceName: string;
  answer: RTCSessionDescriptionInit;
  timestamp: number;
}

/**
 * ПРОСТОЙ QR P2P СЕРВИС
 * 
 * Работает БЕЗ:
 * - STUN серверов (только локальная сеть)
 * - Сложных сетевых сервисов
 * - Внешних зависимостей
 * 
 * Использует QR коды для обмена WebRTC offer/answer
 */
class SimpleQRP2PService {
  private connections = new Map<string, RTCPeerConnection>();
  private deviceId: string;
  private deviceName: string;

  constructor() {
    this.deviceId = localStorage.getItem('simple-qr-device-id') || this.generateDeviceId();
    localStorage.setItem('simple-qr-device-id', this.deviceId);
    
    this.deviceName = localStorage.getItem('simple-qr-device-name') || 
                      `Device-${this.deviceId.slice(0, 8)}`;
  }

  private generateDeviceId(): string {
    return 'device-' + Math.random().toString(36).substr(2, 9);
  }

  private getLocalIP(): Promise<string> {
    return new Promise((resolve) => {
      // Создаем пустое WebRTC соединение для получения локального IP
      const pc = new RTCPeerConnection();
      pc.createDataChannel('test');
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch && ipMatch[1] !== '127.0.0.1') {
            pc.close();
            resolve(ipMatch[1]);
            return;
          }
        }
      };
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      // Fallback через 3 секунды
      setTimeout(() => {
        pc.close();
        resolve('unknown');
      }, 3000);
    });
  }

  async createQRConnectionOffer(): Promise<string> {
    try {
      debugService.info('SimpleQRP2P: Creating connection offer...');
      
      // Создаем WebRTC соединение БЕЗ STUN серверов
      const pc = new RTCPeerConnection({
        iceServers: [] // Локальная сеть - STUN не нужен!
      });

      // Создаем data channel
      const dataChannel = pc.createDataChannel('inventory-sync', {
        ordered: true
      });

      // Обработчики для data channel
      dataChannel.onopen = () => {
        debugService.info('SimpleQRP2P: Data channel opened');
      };

      dataChannel.onmessage = (event) => {
        debugService.info('SimpleQRP2P: Received data', event.data);
        // TODO: обработка синхронизации данных
      };

      // Создаем offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Ждем сбора ICE candidates (только локальные)
      await new Promise<void>((resolve) => {
        let candidatesGathered = 0;
        const maxWait = 3000; // 3 секунды максимум
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            candidatesGathered++;
            debugService.info('SimpleQRP2P: ICE candidate gathered', event.candidate.candidate);
          } else {
            // Сбор завершен
            resolve();
          }
        };

        // Fallback таймер
        setTimeout(resolve, maxWait);
      });

      // Получаем локальный IP
      const localIP = await this.getLocalIP();

      // Формируем данные для QR кода с очисткой SDP
      const cleanOffer = pc.localDescription!.toJSON();
      // Очищаем управляющие символы из SDP
      if (cleanOffer.sdp) {
        cleanOffer.sdp = cleanOffer.sdp.replace(/\r\n/g, '\\n').replace(/\r/g, '\\n');
      }
      
      const qrData: QROfferData = {
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        localIP,
        offer: cleanOffer,
        timestamp: Date.now()
      };

      // Сохраняем соединение
      this.connections.set(this.deviceId, pc);

      // Кодируем в JSON
      const jsonString = JSON.stringify(qrData);
      debugService.info('SimpleQRP2P: QR offer created', {
        deviceId: this.deviceId,
        dataSize: jsonString.length,
        localIP
      });

      return jsonString;

    } catch (error) {
      debugService.error('SimpleQRP2P: Failed to create offer', error);
      throw error;
    }
  }

  async acceptQRConnectionOffer(qrDataString: string): Promise<string> {
    try {
      debugService.info('SimpleQRP2P: Accepting connection offer...');
      
      const offerData: QROfferData = JSON.parse(qrDataString);
      
      // Восстанавливаем управляющие символы в SDP
      if (offerData.offer.sdp) {
        offerData.offer.sdp = offerData.offer.sdp.replace(/\\n/g, '\r\n');
      }
      
      // Создаем WebRTC соединение БЕЗ STUN серверов
      const pc = new RTCPeerConnection({
        iceServers: [] // Локальная сеть - STUN не нужен!
      });

      // Обработчик для входящего data channel
      pc.ondatachannel = (event) => {
        const dataChannel = event.channel;
        
        dataChannel.onopen = () => {
          debugService.info('SimpleQRP2P: Incoming data channel opened');
        };

        dataChannel.onmessage = (event) => {
          debugService.info('SimpleQRP2P: Received data', event.data);
          // TODO: обработка синхронизации данных
        };
      };

      // Устанавливаем remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offerData.offer));

      // Создаем answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Ждем сбора ICE candidates
      await new Promise<void>((resolve) => {
        pc.onicecandidate = (event) => {
          if (event.candidate === null) {
            resolve();
          }
        };
        
        // Fallback через 3 секунды
        setTimeout(resolve, 3000);
      });

      // Формируем answer для QR кода с очисткой SDP
      const cleanAnswer = pc.localDescription!.toJSON();
      // Очищаем управляющие символы из SDP
      if (cleanAnswer.sdp) {
        cleanAnswer.sdp = cleanAnswer.sdp.replace(/\r\n/g, '\\n').replace(/\r/g, '\\n');
      }

      const answerData: QRAnswerData = {
        deviceId: this.deviceId,
        deviceName: this.deviceName,
        answer: cleanAnswer,
        timestamp: Date.now()
      };

      // Сохраняем соединение
      this.connections.set(offerData.deviceId, pc);

      const jsonString = JSON.stringify(answerData);
      debugService.info('SimpleQRP2P: QR answer created', {
        forDevice: offerData.deviceId,
        dataSize: jsonString.length
      });

      return jsonString;

    } catch (error) {
      debugService.error('SimpleQRP2P: Failed to accept offer', error);
      throw error;
    }
  }

  async completeQRConnection(answerDataString: string): Promise<void> {
    try {
      debugService.info('SimpleQRP2P: Completing connection...');
      
      const answerData: QRAnswerData = JSON.parse(answerDataString);
      
      // Восстанавливаем управляющие символы в SDP answer
      if (answerData.answer.sdp) {
        answerData.answer.sdp = answerData.answer.sdp.replace(/\\n/g, '\r\n');
      }
      
      const pc = this.connections.get(this.deviceId);
      
      if (!pc) {
        throw new Error('No pending connection found');
      }

      // Устанавливаем remote description с answer
      await pc.setRemoteDescription(new RTCSessionDescription(answerData.answer));

      // Обновляем ID соединения
      this.connections.delete(this.deviceId);
      this.connections.set(answerData.deviceId, pc);

      debugService.info('SimpleQRP2P: Connection completed successfully', {
        remoteDevice: answerData.deviceId,
        connectionState: pc.connectionState
      });

    } catch (error) {
      debugService.error('SimpleQRP2P: Failed to complete connection', error);
      throw error;
    }
  }

  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  sendData(deviceId: string, data: any): void {
    const pc = this.connections.get(deviceId);
    if (pc) {
      const dataChannel = pc.getDataChannels()[0];
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(data));
        debugService.info('SimpleQRP2P: Data sent to', deviceId);
      }
    }
  }

  broadcastData(data: any): void {
    this.connections.forEach((pc, deviceId) => {
      this.sendData(deviceId, data);
    });
  }

  getDeviceInfo() {
    return {
      id: this.deviceId,
      name: this.deviceName
    };
  }

  setDeviceName(name: string): void {
    this.deviceName = name;
    localStorage.setItem('simple-qr-device-name', name);
  }

  closeConnection(deviceId: string): void {
    const pc = this.connections.get(deviceId);
    if (pc) {
      pc.close();
      this.connections.delete(deviceId);
      debugService.info('SimpleQRP2P: Connection closed', deviceId);
    }
  }

  closeAllConnections(): void {
    this.connections.forEach((pc, deviceId) => {
      pc.close();
    });
    this.connections.clear();
    debugService.info('SimpleQRP2P: All connections closed');
  }
}

// Singleton instance
const simpleQRP2PService = new SimpleQRP2PService();
export default simpleQRP2PService;