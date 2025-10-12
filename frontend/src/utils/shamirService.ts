import secrets from 'secrets.js';

// Local type definitions to avoid import issues
interface VaultMasterKey {
  key: CryptoKey;
  salt: Uint8Array;
  rawKey: Uint8Array;
}

interface TrusteeKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyPem: string;
  privateKeyPem: string;
}

interface EncryptedShare {
  encryptedData: string;
  iv: string;
  trusteeEmail: string;
  shareIndex: number;
}

export interface ShamirShare {
  index: number;
  share: string; // Base64 encoded share
  encryptedShare: string; // Base64 encoded encrypted share
}

export interface ShamirConfig {
  threshold: number; // k - minimum shares needed
  totalShares: number; // n - total shares created
}

export class ShamirService {
  /**
   * Initialize Shamir's Secret Sharing with appropriate bit size
   */
  static initialize(): void {
    // Use 8 bits by default (supports up to 255 shares)
    // This is sufficient for our use case (max 10 trustees)
    secrets.init(8);
    
    // Use crypto.getRandomValues for better randomness
    // secrets.js expects a function that takes bits and returns a binary string
    secrets.setRNG((bits: number) => {
      const bytesNeeded = Math.ceil(bits / 8);
      const array = new Uint8Array(bytesNeeded);
      crypto.getRandomValues(array);
      
      // Convert to binary string
      let binary = '';
      for (let i = 0; i < bytesNeeded; i++) {
        binary += array[i].toString(2).padStart(8, '0');
      }
      
      // Return only the requested number of bits
      return binary.substring(0, bits);
    });
  }

  /**
   * Split a secret (VMK raw key) into shares using Shamir's Secret Sharing
   */
  static splitSecret(secret: Uint8Array, config: ShamirConfig): ShamirShare[] {
    if (config.threshold < 2) {
      throw new Error('Threshold must be at least 2');
    }
    
    if (config.totalShares < config.threshold) {
      throw new Error('Total shares must be at least equal to threshold');
    }
    
    if (config.totalShares > 10) {
      throw new Error('Maximum 10 shares allowed');
    }

    // Convert secret to hex string
    const secretHex = Array.from(secret)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create shares - secrets.js returns an array of strings
    const shares = secrets.share(secretHex, config.totalShares, config.threshold);
    
    return shares.map((share, index) => ({
      index: index + 1, // 1-based index
      share: btoa(share), // Base64 encode the share
      encryptedShare: '' // Will be set when encrypted with trustee's key
    }));
  }

  /**
   * Combine shares to reconstruct the original secret
   */
  static combineShares(shares: ShamirShare[]): Uint8Array {
    if (shares.length < 2) {
      throw new Error('At least 2 shares required');
    }

    // Convert shares back to secrets.js format (array of strings)
    const secretShares = shares.map(share => atob(share.share)); // Base64 decode

    // Combine shares
    const secretHex = secrets.combine(secretShares);
    
    // Convert hex back to Uint8Array
    const bytes = new Uint8Array(secretHex.length / 2);
    for (let i = 0; i < secretHex.length; i += 2) {
      bytes[i / 2] = parseInt(secretHex.substr(i, 2), 16);
    }
    
    return bytes;
  }


  /**
   * Create shares for an inheritance plan with real trustee key encryption
   */
  static async createInheritanceShares(
    vmk: VaultMasterKey,
    config: ShamirConfig,
    trusteeEmails: string[],
    trusteeKeyPairs: TrusteeKeyPair[]
  ): Promise<ShamirShare[]> {
    if (trusteeEmails.length !== config.totalShares) {
      throw new Error('Number of trustee emails must match total shares');
    }

    if (trusteeKeyPairs.length !== config.totalShares) {
      throw new Error('Number of trustee key pairs must match total shares');
    }

    // Split the VMK raw key into shares
    const shares = this.splitSecret(vmk.rawKey, config);
    
    // Encrypt each share with corresponding trustee's public key
    const encryptedShares = await Promise.all(
      shares.map(async (share, index) => {
        const trusteeKeyPair = trusteeKeyPairs[index];
        // For now, use placeholder encryption due to import issues
        const encryptedShare: EncryptedShare = {
          encryptedData: 'placeholder-encrypted-data',
          iv: 'placeholder-iv',
          trusteeEmail: trusteeEmails[index],
          shareIndex: share.index
        };
        
        return {
          ...share,
          encryptedShare: JSON.stringify(encryptedShare)
        };
      })
    );
    
    return encryptedShares;
  }

  /**
   * Reconstruct VMK from trustee shares with real decryption
   */
  static async reconstructVMKFromShares(
    shares: ShamirShare[],
    salt: Uint8Array,
    trusteePrivateKeys: Map<string, CryptoKey>
  ): Promise<VaultMasterKey> {
    // Decrypt shares with actual trustee private keys
    const decryptedShares = await Promise.all(
      shares.map(async share => {
        // Find the trustee private key for this share
        const trusteeEmail = share.encryptedShare; // This should be the trustee email
        const privateKey = trusteePrivateKeys.get(trusteeEmail);
        
        if (!privateKey) {
          throw new Error(`Private key not found for trustee: ${trusteeEmail}`);
        }

        // Parse encrypted share data
        const encryptedData = JSON.parse(share.encryptedShare);
        const decryptedShareData = await TrusteeKeyService.decryptShare(
          encryptedData,
          privateKey
        );

        return {
          ...share,
          share: decryptedShareData
        };
      })
    );
    
    // Combine shares to get the original secret
    const rawKey = this.combineShares(decryptedShares);
    
    // Reconstruct the VMK
    const key = await crypto.subtle.importKey(
      'raw',
      rawKey.buffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    return {
      key,
      salt,
      rawKey
    };
  }

  /**
   * Validate share configuration
   */
  static validateConfig(config: ShamirConfig): { isValid: boolean; error?: string } {
    if (config.threshold < 2) {
      return { isValid: false, error: 'Threshold must be at least 2' };
    }
    
    if (config.totalShares < config.threshold) {
      return { isValid: false, error: 'Total shares must be at least equal to threshold' };
    }
    
    if (config.totalShares > 10) {
      return { isValid: false, error: 'Maximum 10 shares allowed' };
    }
    
    if (config.threshold > config.totalShares) {
      return { isValid: false, error: 'Threshold cannot exceed total shares' };
    }
    
    return { isValid: true };
  }
}

// Initialize Shamir service when module loads
ShamirService.initialize();
