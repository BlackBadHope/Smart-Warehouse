import debugService from './debugService';

class EncryptionService {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  // Generate a key for AES-GCM encryption
  async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  // Export key to store or share
  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  // Import key from string
  async importKey(keyData: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt data
  async encrypt(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
      const encodedData = this.encoder.encode(data);

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encodedData
      );

      return {
        encrypted: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv)
      };
    } catch (error) {
      debugService.error('EncryptionService: Encryption failed', error);
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data
  async decrypt(encryptedData: string, iv: string, key: CryptoKey): Promise<string> {
    try {
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
      const ivBuffer = this.base64ToArrayBuffer(iv);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer
        },
        key,
        encryptedBuffer
      );

      return this.decoder.decode(decrypted);
    } catch (error) {
      debugService.error('EncryptionService: Decryption failed', error);
      throw new Error('Decryption failed');
    }
  }

  // Encrypt object (serialize + encrypt)
  async encryptObject(obj: any, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const jsonString = JSON.stringify(obj);
    return await this.encrypt(jsonString, key);
  }

  // Decrypt object (decrypt + deserialize)
  async decryptObject(encryptedData: string, iv: string, key: CryptoKey): Promise<any> {
    const decryptedString = await this.decrypt(encryptedData, iv, key);
    return JSON.parse(decryptedString);
  }

  // Generate password-based key (for user passwords)
  async deriveKeyFromPassword(password: string, salt: string): Promise<CryptoKey> {
    const passwordBuffer = this.encoder.encode(password);
    const saltBuffer = this.base64ToArrayBuffer(salt);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate random salt
  generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return this.arrayBufferToBase64(salt);
  }

  // Hash data (for integrity checking)
  async hash(data: string): Promise<string> {
    const encodedData = this.encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
    return this.arrayBufferToBase64(hashBuffer);
  }

  // Generate digital signature (for message authenticity)
  async generateKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
    return await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );
  }

  // Sign data
  async sign(data: string, privateKey: CryptoKey): Promise<string> {
    const encodedData = this.encoder.encode(data);
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      privateKey,
      encodedData
    );
    return this.arrayBufferToBase64(signature);
  }

  // Verify signature
  async verify(data: string, signature: string, publicKey: CryptoKey): Promise<boolean> {
    try {
      const encodedData = this.encoder.encode(data);
      const signatureBuffer = this.base64ToArrayBuffer(signature);
      
      return await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        publicKey,
        signatureBuffer,
        encodedData
      );
    } catch (error) {
      debugService.error('EncryptionService: Signature verification failed', error);
      return false;
    }
  }

  // Export public key for sharing
  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return this.arrayBufferToBase64(exported);
  }

  // Import public key
  async importPublicKey(keyData: string): Promise<CryptoKey> {
    const keyBuffer = this.base64ToArrayBuffer(keyData);
    return await crypto.subtle.importKey(
      'spki',
      keyBuffer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['verify']
    );
  }

  // Utility functions
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Simple obfuscation for non-critical data (faster than encryption)
  obfuscate(data: string): string {
    return btoa(data);
  }

  deobfuscate(data: string): string {
    try {
      return atob(data);
    } catch {
      return data; // Return as-is if not obfuscated
    }
  }

  // Check if encryption is supported
  isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues !== 'undefined';
  }
}

// Singleton instance
const encryptionService = new EncryptionService();
export default encryptionService;