import { useState, useCallback, useEffect } from 'react';
import { cryptoService } from './cryptoService';
import { vaultApiService } from '../services/vaultApi';
import type { EncryptedData, FullEncryptionResult } from './cryptoTypes';

export interface UseCryptoState {
  isVMKInitialized: boolean;
  isEncrypting: boolean;
  isDecrypting: boolean;
  encryptionProgress: number;
  decryptionProgress: number;
  error: string | null;
}

export interface UseCryptoActions {
  initializeVMK: (passphrase: string, salt?: Uint8Array) => Promise<void>;
  restoreVMK: (passphrase: string) => Promise<boolean>;
  clearVMK: () => void;
  encryptFile: (file: File) => Promise<FullEncryptionResult>;
  decryptFile: (encryptedData: EncryptedData, encryptedCek: EncryptedData) => Promise<ArrayBuffer>;
  downloadAndDecryptFile: (itemId: string, version?: number, hint?: { isEncrypted?: boolean; encryptionKeyId?: string; mimeType?: string }) => Promise<ArrayBuffer>;
  validatePassphrase: (passphrase: string) => {
    isValid: boolean;
    score: number;
    feedback: string[];
  };
  calculateFileChecksum: (file: File) => Promise<string>;
  getVMKSalt: () => Uint8Array | null;
  getCurrentVMK: () => VaultMasterKey | null;
  getEncryptionInfo: () => {
    algorithm: string;
    keySize: number;
    mode: string;
    keyDerivation: string;
  };
}

export const useCrypto = (): UseCryptoState & UseCryptoActions => {
  const [isVMKInitialized, setIsVMKInitialized] = useState(() => {
    // Check if VMK was previously initialized
    return cryptoService.isVMKInitialized() || localStorage.getItem('vmkInitialized') === 'true';
  });
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [decryptionProgress, setDecryptionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Sync VMK state when component mounts
  useEffect(() => {
    const checkVMKState = () => {
      const serviceInitialized = cryptoService.isVMKInitialized();
      const localStorageInitialized = localStorage.getItem('vmkInitialized') === 'true';
      
      // If localStorage says VMK is initialized but service doesn't have it,
      // we need to restore it (this happens on page refresh)
      if (localStorageInitialized && !serviceInitialized) {
        console.log('VMK state mismatch detected - localStorage has flag but service is not initialized');
        console.log('This means VMK needs to be restored with passphrase');
        
        // Try to restore VMK if we have the salt stored
        const saltString = localStorage.getItem('vmkSalt');
        if (saltString) {
          console.log('VMK salt found in localStorage, but passphrase needed for restoration');
          // We have the salt but need the passphrase to restore
          // Set state to false so user can re-enter passphrase
          setIsVMKInitialized(false);
        } else {
          console.log('No VMK salt found, clearing localStorage flag');
          localStorage.removeItem('vmkInitialized');
          setIsVMKInitialized(false);
        }
        return;
      }
      
      // Only consider VMK initialized if BOTH the service has it AND localStorage flag is set
      const isInitialized = serviceInitialized && localStorageInitialized;
      
      // Debug logging
      console.log('VMK State Check:', {
        serviceInitialized,
        localStorageInitialized,
        finalResult: isInitialized,
        component: 'useCrypto'
      });
      
      setIsVMKInitialized(isInitialized);
    };
    
    checkVMKState();
    
    // Listen for VMK state changes
    const handleVMKChange = () => {
      console.log('VMK state change event received');
      checkVMKState();
    };
    
    window.addEventListener('vmkStateChanged', handleVMKChange);
    
    return () => {
      window.removeEventListener('vmkStateChanged', handleVMKChange);
    };
  }, []);

  const initializeVMK = useCallback(async (passphrase: string, salt?: Uint8Array) => {
    try {
      setError(null);
      console.log('Initializing VMK...');
      const success = await cryptoService.initializeVMK(passphrase, salt);
      console.log('VMK initialization result:', success);
      setIsVMKInitialized(success);
      if (success) {
        // cryptoService now handles localStorage automatically
        // Create a validation proof bound to this VMK so restores can be verified
        try {
          const proofPlain = new TextEncoder().encode('vmk-proof-v1');
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, (cryptoService as any).vmk!.key, proofPlain);
          const ct = new Uint8Array(ctBuf);
          const toB64 = (u8: Uint8Array) => btoa(String.fromCharCode(...Array.from(u8)));
          localStorage.setItem('vmkProof', JSON.stringify({ iv: toB64(iv), ct: toB64(ct) }));
        } catch (e) {
          console.warn('Failed to store VMK proof for later validation', e);
        }
        console.log('VMK initialized successfully, dispatching event');
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('vmkStateChanged'));
      } else {
        setError('Failed to initialize VMK');
      }
    } catch (err) {
      console.error('VMK initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsVMKInitialized(false);
    }
  }, []);

  const clearVMK = useCallback(() => {
    cryptoService.clearVMK(); // This now handles localStorage cleanup
    setIsVMKInitialized(false);
    setError(null);
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('vmkStateChanged'));
  }, []);

  const restoreVMK = useCallback(async (passphrase: string): Promise<boolean> => {
    try {
      const saltString = localStorage.getItem('vmkSalt');
      console.log('Restore VMK - Salt from localStorage:', saltString);
      
      if (!saltString) {
        console.log('No salt found in localStorage');
        return false;
      }
      
      const salt = new Uint8Array(saltString.split(',').map(Number));
      console.log('Restore VMK - Parsed salt:', salt);
      
      const success = await cryptoService.initializeVMK(passphrase, salt);
      console.log('Restore VMK - cryptoService.initializeVMK result:', success);
      console.log('Restore VMK - cryptoService.isVMKInitialized():', cryptoService.isVMKInitialized());
      
      if (success) {
        // Validate against stored proof if present
        try {
          const proofJson = localStorage.getItem('vmkProof');
          if (proofJson) {
            const proof = JSON.parse(proofJson);
            const fromB64 = (b64: string) => new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
            const iv = fromB64(proof.iv);
            const ct = fromB64(proof.ct);
            const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, (cryptoService as any).vmk!.key, ct);
            const text = new TextDecoder().decode(ptBuf);
            if (text !== 'vmk-proof-v1') {
              console.warn('VMK proof mismatch - wrong passphrase');
              setIsVMKInitialized(false);
              return false;
            }
          }
        } catch (e) {
          console.warn('VMK proof validation failed', e);
          setIsVMKInitialized(false);
          return false;
        }
        setIsVMKInitialized(true);
        localStorage.setItem('vmkInitialized', 'true');
        window.dispatchEvent(new CustomEvent('vmkStateChanged'));
        console.log('Restore VMK - VMK restored successfully');
        
        // Check if authentication tokens are still present after VMK restoration
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        console.log('Post-VMK restoration token check:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length || 0
        });
      }
      
      return success;
    } catch (err) {
      console.error('VMK restoration error:', err);
      return false;
    }
  }, []);

  const encryptFile = useCallback(async (file: File) => {
    if (!isVMKInitialized) {
      throw new Error('VMK not initialized');
    }

    try {
      setIsEncrypting(true);
      setEncryptionProgress(0);
      setError(null);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setEncryptionProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await cryptoService.encryptFile(file);

      clearInterval(progressInterval);
      setEncryptionProgress(100);
      setIsEncrypting(false);

      return result;
    } catch (err) {
      setIsEncrypting(false);
      setEncryptionProgress(0);
      setError(err instanceof Error ? err.message : 'Encryption failed');
      throw err;
    }
  }, [isVMKInitialized]);

  const decryptFile = useCallback(async (encryptedData: EncryptedData, encryptedCek: EncryptedData) => {
    if (!isVMKInitialized) {
      throw new Error('VMK not initialized');
    }

    try {
      setIsDecrypting(true);
      setDecryptionProgress(0);
      setError(null);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setDecryptionProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await cryptoService.decryptFile(encryptedData, encryptedCek);

      clearInterval(progressInterval);
      setDecryptionProgress(100);
      setIsDecrypting(false);

      return result.decryptedData;
    } catch (err) {
      setIsDecrypting(false);
      setDecryptionProgress(0);
      setError(err instanceof Error ? err.message : 'Decryption failed');
      throw err;
    }
  }, [isVMKInitialized]);

  const downloadAndDecryptFile = useCallback(async (itemId: string, version: number = 1, hint?: { isEncrypted?: boolean; encryptionKeyId?: string; mimeType?: string }) => {
    // Check both hook state and service state
    const serviceInitialized = cryptoService.isVMKInitialized();
    const localStorageInitialized = localStorage.getItem('vmkInitialized') === 'true';
    
    console.log('downloadAndDecryptFile VMK Check:', {
      isVMKInitialized,
      serviceInitialized,
      localStorageInitialized,
      itemId,
      version
    });
    
    if (!isVMKInitialized && !(serviceInitialized && localStorageInitialized)) {
      console.log('downloadAndDecryptFile: VMK not initialized, throwing error');
      throw new Error('VMK not initialized');
    }
    
    console.log('downloadAndDecryptFile: VMK check passed, proceeding with download');
    try {
      setIsDecrypting(true);
      setDecryptionProgress(0);
      setError(null);
      
      // Step 1: Get item details to retrieve encrypted CEK
      setDecryptionProgress(10);
      const itemResponse = await vaultApiService.getItem(itemId);
      if (!itemResponse.success || !itemResponse.item) {
        throw new Error('Failed to get item details');
      }
      
      const item = {
        ...itemResponse.item,
        // Fill gaps with hint when API lacks fields
        isEncrypted: itemResponse.item.isEncrypted ?? hint?.isEncrypted ?? false,
        encryptionKeyId: itemResponse.item.encryptionKeyId ?? hint?.encryptionKeyId ?? null,
        mimeType: itemResponse.item.mimeType ?? hint?.mimeType
      } as any;
      
      // Step 2: Get download URL
      setDecryptionProgress(20);
      const downloadResponse = await vaultApiService.getDownloadUrl(itemId, version);
      if (!downloadResponse.success || !downloadResponse.downloadUrl) {
        throw new Error('Failed to get download URL');
      }
      
      // Step 3: Download file data
      setDecryptionProgress(40);
      const encryptedFileData = await vaultApiService.downloadFile(downloadResponse.downloadUrl);

      // If encrypted but no CEK present, we cannot decrypt this legacy upload
      if (item.isEncrypted && !item.encryptionKeyId) {
        setIsDecrypting(false);
        setDecryptionProgress(0);
        throw new Error('This file is encrypted but missing its encryption key. Please re-upload the file to enable decryption.');
      }
      
      // Step 4: Check if this is a properly encrypted file with CEK
      setDecryptionProgress(60);
      if (item.encryptionKeyId) {
        try {
          // encryptionKeyId is a JSON string with { cek: { ct, iv }, fileIv }
          const meta = JSON.parse(item.encryptionKeyId);
          const fromB64 = (b64: string) => new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
          const encryptedCek = {
            ciphertext: fromB64(meta.cek.ct),
            iv: fromB64(meta.cek.iv),
            tag: new Uint8Array(0)
          } as EncryptedData;

          const encryptedFile: EncryptedData = {
            ciphertext: new Uint8Array(encryptedFileData),
            iv: fromB64(meta.fileIv),
            tag: new Uint8Array(0)
          };

          // Step 5: Decrypt the file using the CEK
          setDecryptionProgress(80);
          const decryptedData = await decryptFile(encryptedFile, encryptedCek);
          // Heuristic: if original is a PDF but decrypted does not start with %PDF, fallback to raw
          if (item.mimeType && item.mimeType.includes('pdf')) {
            const view = new Uint8Array(decryptedData.slice(0, 4));
            const header = String.fromCharCode(...view);
            if (!header.startsWith('%PDF')) {
              console.warn('Decryption result did not look like PDF, falling back to raw bytes');
              setDecryptionProgress(100);
              setIsDecrypting(false);
              return encryptedFileData;
            }
          }
          setDecryptionProgress(100);
          setIsDecrypting(false);
          return decryptedData;
        } catch (cekError) {
          console.warn('Failed to decrypt with stored CEK, metadata parse/decrypt error:', cekError);
          throw new Error('Decryption failed. Please re-upload the file.');
        }
      }

      // If backend flag says not encrypted but a key exists (inconsistent data), try to decrypt using the key
      if (!item.isEncrypted && item.encryptionKeyId) {
        try {
          console.warn('downloadAndDecryptFile: Inconsistent item flags; attempting decrypt because key exists');
          const meta = JSON.parse(item.encryptionKeyId);
          const fromB64 = (b64: string) => new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0)));
          const encryptedCek = {
            ciphertext: fromB64(meta.cek.ct),
            iv: fromB64(meta.cek.iv),
            tag: new Uint8Array(0)
          } as EncryptedData;
          const encryptedFile: EncryptedData = {
            ciphertext: new Uint8Array(encryptedFileData),
            iv: fromB64(meta.fileIv),
            tag: new Uint8Array(0)
          };
          setDecryptionProgress(80);
          const decryptedData = await decryptFile(encryptedFile, encryptedCek);
          setDecryptionProgress(100);
          setIsDecrypting(false);
          return decryptedData;
        } catch (_) {
          // If decryption fails, fall back to raw bytes
          console.warn('downloadAndDecryptFile: Decrypt attempt failed; returning raw file data');
          setDecryptionProgress(100);
          setIsDecrypting(false);
          return encryptedFileData;
        }
      }

      // Otherwise treat as plain file
      console.warn('downloadAndDecryptFile: Item is not encrypted, returning raw file data');
      setDecryptionProgress(100);
      setIsDecrypting(false);
      return encryptedFileData;
      
      // For files without proper CEK storage, show an error message
      setDecryptionProgress(100);
      setIsDecrypting(false);
      throw new Error('This file was uploaded before proper encryption was implemented. Please re-upload the file to enable download and decryption.');
    } catch (err) {
      setIsDecrypting(false);
      setDecryptionProgress(0);
      setError(err instanceof Error ? err.message : 'Download and decryption failed');
      throw err;
    }
  }, [isVMKInitialized, decryptFile]);

  const validatePassphrase = useCallback((passphrase: string) => {
    return cryptoService.validatePassphrase(passphrase);
  }, []);

  const calculateFileChecksum = useCallback(async (file: File) => {
    try {
      setError(null);
      return await cryptoService.calculateFileChecksum(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checksum calculation failed');
      throw err;
    }
  }, []);

  const getVMKSalt = useCallback(() => {
    return cryptoService.getVMKSalt();
  }, []);

  const getCurrentVMK = useCallback(() => {
    return cryptoService.getCurrentVMK();
  }, []);

  const getEncryptionInfo = useCallback(() => {
    return {
      algorithm: 'AES-GCM',
      keySize: 256,
      mode: 'GCM',
      keyDerivation: 'PBKDF2'
    };
  }, []);

  return {
    // State
    isVMKInitialized,
    isEncrypting,
    isDecrypting,
    encryptionProgress,
    decryptionProgress,
    error,
    // Actions
    initializeVMK,
    restoreVMK,
    clearVMK,
    encryptFile,
    decryptFile,
    downloadAndDecryptFile,
    validatePassphrase,
    calculateFileChecksum,
    getVMKSalt,
    getCurrentVMK,
    getEncryptionInfo
  };
};