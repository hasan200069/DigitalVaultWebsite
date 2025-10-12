import type {
  VaultMasterKey,
  EncryptedData,
  FullEncryptionResult,
  DecryptionResult
} from './cryptoTypes';
import {
  deriveVaultMasterKey,
  generateContentEncryptionKey,
  encryptContentEncryptionKey,
  decryptContentEncryptionKey,
  encryptFileData,
  decryptFileData,
  calculateChecksum,
  validatePassphraseStrength,
  clearSensitiveData
} from './cryptoUtils';

/**
 * Crypto Service - High-level interface for encryption operations
 */
export class CryptoService {
  private vmk: VaultMasterKey | null = null;
  private restorationAttempted: boolean = false;

  constructor() {
    // Try to restore VMK from localStorage on service creation
    this.tryRestoreVMK();
  }

  /**
   * Try to restore VMK from localStorage
   */
  private tryRestoreVMK(): void {
    if (this.restorationAttempted) return;
    this.restorationAttempted = true;

    const isInitialized = localStorage.getItem('vmkInitialized') === 'true';
    const saltString = localStorage.getItem('vmkSalt');
    
    if (isInitialized && saltString) {
      console.log('CryptoService: VMK restoration data found in localStorage');
      // VMK will be restored when user provides passphrase
    }
  }

  /**
   * Initialize VMK from passphrase
   */
  async initializeVMK(passphrase: string, salt?: Uint8Array): Promise<boolean> {
    try {
      this.vmk = await deriveVaultMasterKey(passphrase, salt);
      
      // Store VMK initialization flag
      localStorage.setItem('vmkInitialized', 'true');
      
      // Store the salt for restoration
      if (this.vmk.salt) {
        const saltString = Array.from(this.vmk.salt).join(',');
        localStorage.setItem('vmkSalt', saltString);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize VMK:', error);
      return false;
    }
  }

  /**
   * Check if VMK is initialized
   */
  isVMKInitialized(): boolean {
    return this.vmk !== null;
  }

  /**
   * Get VMK salt (for persistence)
   */
  getVMKSalt(): Uint8Array | null {
    return this.vmk?.salt || null;
  }

  /**
   * Get current VMK (for inheritance sharing)
   */
  getCurrentVMK(): VaultMasterKey | null {
    return this.vmk;
  }

  /**
   * Clear VMK from memory and localStorage
   */
  clearVMK(): void {
    if (this.vmk?.rawKey) {
      clearSensitiveData(this.vmk.rawKey);
    }
    this.vmk = null;
    
    // Clear localStorage
    localStorage.removeItem('vmkInitialized');
    localStorage.removeItem('vmkSalt');
    localStorage.removeItem('vmkProof');
  }

  /**
   * Validate passphrase strength
   */
  validatePassphrase(passphrase: string): {
    score: number;
    feedback: string[];
    isValid: boolean;
  } {
    return validatePassphraseStrength(passphrase);
  }

  /**
   * Encrypt file with VMK
   */
  async encryptFile(
    file: File
  ): Promise<FullEncryptionResult> {
    if (!this.vmk) {
      throw new Error('VMK not initialized');
    }

    try {
      // Read file data
      const fileData = await file.arrayBuffer();

      // Generate CEK
      const cek = await generateContentEncryptionKey();

      // Encrypt file data with CEK
      const encryptionResult = await encryptFileData(fileData, cek);

      // Encrypt CEK with VMK
      const encryptedCek = await encryptContentEncryptionKey(cek, this.vmk);

      // Clear CEK from memory
      clearSensitiveData(cek.rawKey);

      return {
        encryptedData: encryptionResult.encryptedData,
        checksum: encryptionResult.checksum,
        encryptedCek: encryptedCek
      };
    } catch (error) {
      console.error('File encryption failed:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  /**
   * Decrypt file with VMK
   */
  async decryptFile(
    encryptedData: EncryptedData,
    encryptedCek: EncryptedData
  ): Promise<DecryptionResult> {
    if (!this.vmk) {
      throw new Error('VMK not initialized');
    }

    try {
      // Decrypt CEK with VMK
      const cek = await decryptContentEncryptionKey(encryptedCek, this.vmk);

      // Decrypt file data with CEK
      const decryptionResult = await decryptFileData(encryptedData, cek);

      // Clear CEK from memory
      clearSensitiveData(cek.rawKey);

      return decryptionResult;
    } catch (error) {
      console.error('File decryption failed:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  /**
   * Calculate file checksum
   */
  async calculateFileChecksum(file: File): Promise<string> {
    try {
      const fileData = await file.arrayBuffer();
      return await calculateChecksum(fileData);
    } catch (error) {
      console.error('Checksum calculation failed:', error);
      throw new Error('Failed to calculate file checksum');
    }
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();