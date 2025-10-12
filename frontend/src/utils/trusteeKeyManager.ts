// Local type definition to avoid cache issues
interface VaultMasterKey {
  key: CryptoKey;
  salt: Uint8Array;
  rawKey: Uint8Array;
}

export interface TrusteeKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface EncryptedShare {
  encryptedData: string;
  iv: string;
  trusteeEmail: string;
  shareIndex: number;
}

export class TrusteeKeyService {
  /**
   * Generate RSA key pair for a trustee
   */
  static async generateKeyPair(): Promise<TrusteeKeyPair> {
    try {
      // Generate RSA key pair
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      // Export keys to PEM format
      const publicKeyPem = await this.exportPublicKey(keyPair.publicKey);
      const privateKeyPem = await this.exportPrivateKey(keyPair.privateKey);

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        publicKeyPem,
        privateKeyPem
      };
    } catch (error) {
      console.error('Error generating trustee key pair:', error);
      throw new Error('Failed to generate trustee key pair');
    }
  }

  /**
   * Import public key from PEM format
   */
  static async importPublicKey(publicKeyPem: string): Promise<CryptoKey> {
    try {
      // Remove PEM headers and decode base64
      const pemContents = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '');

      const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

      return await crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );
    } catch (error) {
      console.error('Error importing public key:', error);
      throw new Error('Failed to import public key');
    }
  }

  /**
   * Import private key from PEM format
   */
  static async importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
    try {
      // Remove PEM headers and decode base64
      const pemContents = privateKeyPem
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s/g, '');

      const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

      return await crypto.subtle.importKey(
        'pkcs8',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['decrypt']
      );
    } catch (error) {
      console.error('Error importing private key:', error);
      throw new Error('Failed to import private key');
    }
  }

  /**
   * Encrypt a share with trustee's public key
   */
  static async encryptShare(
    share: string,
    trusteePublicKey: CryptoKey
  ): Promise<{ encryptedData: string; iv: string }> {
    try {
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Convert share to bytes
      const shareData = new TextEncoder().encode(share);
      
      // Encrypt with RSA-OAEP
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        trusteePublicKey,
        shareData
      );

      return {
        encryptedData: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv))
      };
    } catch (error) {
      console.error('Error encrypting share:', error);
      throw new Error('Failed to encrypt share');
    }
  }

  /**
   * Decrypt a share with trustee's private key
   */
  static async decryptShare(
    encryptedShare: { encryptedData: string; iv: string },
    trusteePrivateKey: CryptoKey
  ): Promise<string> {
    try {
      // Decode base64 data
      const encryptedData = Uint8Array.from(atob(encryptedShare.encryptedData), c => c.charCodeAt(0));
      
      // Decrypt with RSA-OAEP
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        trusteePrivateKey,
        encryptedData
      );

      // Convert back to string
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Error decrypting share:', error);
      throw new Error('Failed to decrypt share with trustee private key');
    }
  }

  /**
   * Export public key to PEM format
   */
  private static async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    const exportedAsString = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return `-----BEGIN PUBLIC KEY-----\n${exportedAsString}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Export private key to PEM format
   */
  private static async exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
    const exportedAsString = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return `-----BEGIN PRIVATE KEY-----\n${exportedAsString}\n-----END PRIVATE KEY-----`;
  }

  /**
   * Store trustee private key securely (encrypted with user's VMK)
   */
  static async storeTrusteePrivateKey(
    privateKeyPem: string,
    trusteeEmail: string,
    vmk: VaultMasterKey
  ): Promise<void> {
    try {
      // Encrypt the private key with VMK
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const keyData = new TextEncoder().encode(privateKeyPem);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        vmk.key,
        keyData
      );

      const encryptedData = new Uint8Array(encrypted);
      
      // Store in localStorage with trustee email as key
      const storageKey = `trustee_private_key_${trusteeEmail}`;
      const storageData = {
        encryptedData: btoa(String.fromCharCode(...encryptedData)),
        iv: btoa(String.fromCharCode(...iv)),
        timestamp: Date.now()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(storageData));
    } catch (error) {
      console.error('Error storing trustee private key:', error);
      throw new Error('Failed to store trustee private key');
    }
  }

  /**
   * Retrieve and decrypt trustee private key
   */
  static async retrieveTrusteePrivateKey(
    trusteeEmail: string,
    vmk: VaultMasterKey
  ): Promise<string> {
    try {
      const storageKey = `trustee_private_key_${trusteeEmail}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        throw new Error(`No private key found for trustee: ${trusteeEmail}`);
      }

      const storageData = JSON.parse(stored);
      
      // Decode base64 data
      const encryptedData = Uint8Array.from(atob(storageData.encryptedData), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(storageData.iv), c => c.charCodeAt(0));
      
      // Decrypt with VMK
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        vmk.key,
        encryptedData
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Error retrieving trustee private key:', error);
      throw new Error('Failed to retrieve trustee private key');
    }
  }
}
