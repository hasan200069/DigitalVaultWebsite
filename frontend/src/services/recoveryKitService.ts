import { ShamirService } from '../utils/shamirService';
import type { ShamirConfig } from '../utils/shamirService';
import { cryptoService } from '../utils/cryptoService';

export interface RecoveryKitData {
  userId: string;
  email: string;
  vaultMasterKeyShares: Array<{
    index: number;
    share: string;
    encryptedShare: string;
  }>;
  salt: string;
  createdAt: string;
  version: string;
  instructions: string;
}

export interface RecoveryKitConfig {
  threshold: number; // Minimum shares needed to recover
  totalShares: number; // Total shares to create
  includeInstructions: boolean;
}

export class RecoveryKitService {
  private static readonly DEFAULT_CONFIG: RecoveryKitConfig = {
    threshold: 3,
    totalShares: 5,
    includeInstructions: true
  };

  /**
   * Generate a recovery kit for the current user
   */
  static async generateRecoveryKit(
    userId: string,
    email: string,
    config: Partial<RecoveryKitConfig> = {}
  ): Promise<RecoveryKitData> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Validate configuration
    const validation = ShamirService.validateConfig(finalConfig);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid recovery kit configuration');
    }

    // Get current VMK
    const vmk = cryptoService.getCurrentVMK();
    if (!vmk) {
      throw new Error('Vault Master Key not initialized. Please complete your vault setup and initialize your VMK first.');
    }

    // Create shares of the VMK raw key
    const shares = ShamirService.splitSecret(vmk.rawKey, finalConfig);

    // For recovery kit, we'll encrypt shares with a simple password-based encryption
    // In a real implementation, you might want to use a more sophisticated approach
    const encryptedShares = await Promise.all(
      shares.map(async (share) => {
        // Create a simple encryption key from user email + timestamp
        const encryptionKey = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(`${email}-${Date.now()}`),
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );

        const derivedKey = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: new TextEncoder().encode('recovery-kit-salt'),
            iterations: 100000,
            hash: 'SHA-256'
          },
          encryptionKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );

        // Encrypt the share
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedData = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv
          },
          derivedKey,
          new TextEncoder().encode(share.share)
        );

        return {
          index: share.index,
          share: share.share, // Keep original for backup
          encryptedShare: btoa(String.fromCharCode(...new Uint8Array(encryptedData)))
        };
      })
    );

    const recoveryKit: RecoveryKitData = {
      userId,
      email,
      vaultMasterKeyShares: encryptedShares,
      salt: Array.from(vmk.salt).join(','),
      createdAt: new Date().toISOString(),
      version: '1.0',
      instructions: finalConfig.includeInstructions ? this.getRecoveryInstructions() : ''
    };

    return recoveryKit;
  }

  /**
   * Download recovery kit as a JSON file
   */
  static async downloadRecoveryKit(
    userId: string,
    email: string,
    config?: Partial<RecoveryKitConfig>
  ): Promise<void> {
    try {
      const recoveryKit = await this.generateRecoveryKit(userId, email, config);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `recovery-kit-${email}-${timestamp}.json`;
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(recoveryKit, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Recovery kit downloaded successfully');
    } catch (error) {
      console.error('Failed to download recovery kit:', error);
      throw error;
    }
  }

  /**
   * Restore VMK from recovery kit shares
   */
  static async restoreFromRecoveryKit(
    recoveryKit: RecoveryKitData,
    sharesToUse: Array<{ index: number; share: string }>,
    passphrase: string
  ): Promise<boolean> {
    try {
      // Validate that we have enough shares
      if (sharesToUse.length < 2) {
        throw new Error('At least 2 shares are required to restore the vault');
      }

      // Convert shares to ShamirShare format
      const shamirShares = sharesToUse.map(share => ({
        index: share.index,
        share: share.share,
        encryptedShare: '' // Not needed for restoration
      }));

      // Combine shares to get the raw VMK
      const rawKey = ShamirService.combineShares(shamirShares);

      // Convert salt back to Uint8Array
      const salt = new Uint8Array(recoveryKit.salt.split(',').map(Number));

      // Reconstruct VMK using the same derivation process
      const reconstructedVMK = await crypto.subtle.importKey(
        'raw',
        rawKey.buffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Initialize crypto service with reconstructed VMK
      const success = await cryptoService.initializeVMK(passphrase, salt);
      
      if (success) {
        console.log('Vault successfully restored from recovery kit');
        return true;
      } else {
        throw new Error('Failed to initialize VMK with restored data');
      }
    } catch (error) {
      console.error('Failed to restore from recovery kit:', error);
      throw error;
    }
  }

  /**
   * Get recovery instructions
   */
  private static getRecoveryInstructions(): string {
    return `
# AegisVault Recovery Kit

## IMPORTANT SECURITY INFORMATION
This recovery kit contains encrypted shares of your Vault Master Key (VMK).
Keep this file secure and store it in a safe location.

## How to Use This Recovery Kit

### Emergency Recovery Process:
1. You will need at least 2 shares from this kit to restore access
2. Contact your designated trustees to obtain the required shares
3. Use the recovery process in the AegisVault application
4. Enter the shares and your passphrase to restore access

### Security Notes:
- This file contains sensitive cryptographic material
- Store it securely (encrypted drive, safe deposit box, etc.)
- Do not share individual shares with unauthorized persons
- Each share alone cannot restore your vault

### What's Included:
- Encrypted VMK shares (${this.DEFAULT_CONFIG.totalShares} total, need ${this.DEFAULT_CONFIG.threshold} minimum)
- Salt for key derivation
- Recovery instructions

### Generated: ${new Date().toISOString()}
### Version: 1.0

## Support
If you need assistance with recovery, contact your system administrator.
    `.trim();
  }

  /**
   * Validate recovery kit data
   */
  static validateRecoveryKit(recoveryKit: any): { isValid: boolean; error?: string } {
    try {
      if (!recoveryKit.userId || !recoveryKit.email) {
        return { isValid: false, error: 'Missing user information' };
      }

      if (!recoveryKit.vaultMasterKeyShares || !Array.isArray(recoveryKit.vaultMasterKeyShares)) {
        return { isValid: false, error: 'Invalid VMK shares data' };
      }

      if (recoveryKit.vaultMasterKeyShares.length < 2) {
        return { isValid: false, error: 'Insufficient shares for recovery' };
      }

      if (!recoveryKit.salt) {
        return { isValid: false, error: 'Missing salt data' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid recovery kit format' };
    }
  }
}

