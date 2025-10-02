import type {
  VaultMasterKey,
  ContentEncryptionKey,
  EncryptedData,
  EncryptionResult,
  DecryptionResult
} from './cryptoTypes';

// PBKDF2 configuration for VMK derivation (simpler alternative to Argon2)
const PBKDF2_CONFIG = {
  iterations: 100000, // High iteration count for security
  hashLength: 32 // 256 bits
};

// AES-GCM configuration
const AES_GCM_CONFIG = {
  name: 'AES-GCM',
  length: 256
};

/**
 * Derive Vault Master Key (VMK) from passphrase using PBKDF2
 */
export const deriveVaultMasterKey = async (
  passphrase: string,
  salt?: Uint8Array
): Promise<VaultMasterKey> => {
  try {
    // Generate random salt if not provided
    const keySalt = salt || crypto.getRandomValues(new Uint8Array(16));

    // Convert passphrase to ArrayBuffer
    const passphraseBuffer = new TextEncoder().encode(passphrase);

    // Derive key using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passphraseBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: keySalt,
        iterations: PBKDF2_CONFIG.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      PBKDF2_CONFIG.hashLength * 8 // Convert bytes to bits
    );

    // Import the derived key material as a CryptoKey
    const key = await crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: AES_GCM_CONFIG.name, length: AES_GCM_CONFIG.length },
      false,
      ['encrypt', 'decrypt']
    );

    return {
      key,
      salt: keySalt,
      rawKey: new Uint8Array(derivedBits)
    };
  } catch (error) {
    console.error('VMK derivation failed:', error);
    throw new Error('Failed to derive vault master key');
  }
};

/**
 * Generate a random Content Encryption Key (CEK)
 */
export const generateContentEncryptionKey = async (): Promise<ContentEncryptionKey> => {
  try {
    // Generate random key material
    const keyMaterial = crypto.getRandomValues(new Uint8Array(32)); // 256 bits

    // Import as CryptoKey
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: AES_GCM_CONFIG.name, length: AES_GCM_CONFIG.length },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    return {
      key,
      rawKey: keyMaterial
    };
  } catch (error) {
    console.error('CEK generation failed:', error);
    throw new Error('Failed to generate content encryption key');
  }
};

/**
 * Encrypt Content Encryption Key (CEK) with Vault Master Key (VMK)
 */
export const encryptContentEncryptionKey = async (
  cek: ContentEncryptionKey,
  vmk: VaultMasterKey
): Promise<EncryptedData> => {
  try {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

    // Encrypt the CEK with VMK
    const encrypted = await crypto.subtle.encrypt(
      { name: AES_GCM_CONFIG.name, iv },
      vmk.key,
      cek.rawKey
    );

    return {
      ciphertext: new Uint8Array(encrypted),
      iv,
      tag: new Uint8Array(0) // GCM includes tag in ciphertext
    };
  } catch (error) {
    console.error('CEK encryption failed:', error);
    throw new Error('Failed to encrypt content encryption key');
  }
};

/**
 * Decrypt Content Encryption Key (CEK) with Vault Master Key (VMK)
 */
export const decryptContentEncryptionKey = async (
  encryptedCek: EncryptedData,
  vmk: VaultMasterKey
): Promise<ContentEncryptionKey> => {
  try {
    // Decrypt the CEK with VMK
    const decrypted = await crypto.subtle.decrypt(
      { name: AES_GCM_CONFIG.name, iv: encryptedCek.iv },
      vmk.key,
      encryptedCek.ciphertext
    );

    const rawKey = new Uint8Array(decrypted);

    // Import as CryptoKey
    const key = await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: AES_GCM_CONFIG.name, length: AES_GCM_CONFIG.length },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    return {
      key,
      rawKey
    };
  } catch (error) {
    console.error('CEK decryption failed:', error);
    throw new Error('Failed to decrypt content encryption key');
  }
};

/**
 * Encrypt file data with Content Encryption Key (CEK)
 */
export const encryptFileData = async (
  fileData: ArrayBuffer,
  cek: ContentEncryptionKey
): Promise<EncryptionResult> => {
  try {
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

    // Encrypt the file data
    const encrypted = await crypto.subtle.encrypt(
      { name: AES_GCM_CONFIG.name, iv },
      cek.key,
      fileData
    );

    const ciphertext = new Uint8Array(encrypted);

    // Calculate checksum of encrypted data
    const checksum = await crypto.subtle.digest('SHA-256', ciphertext);
    const checksumHex = Array.from(new Uint8Array(checksum))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      encryptedData: {
        ciphertext,
        iv,
        tag: new Uint8Array(0) // GCM includes tag in ciphertext
      },
      checksum: checksumHex
    };
  } catch (error) {
    console.error('File encryption failed:', error);
    throw new Error('Failed to encrypt file data');
  }
};

/**
 * Decrypt file data with Content Encryption Key (CEK)
 */
export const decryptFileData = async (
  encryptedData: EncryptedData,
  cek: ContentEncryptionKey
): Promise<DecryptionResult> => {
  try {
    // Decrypt the file data
    const decrypted = await crypto.subtle.decrypt(
      { name: AES_GCM_CONFIG.name, iv: encryptedData.iv },
      cek.key,
      encryptedData.ciphertext
    );

    return {
      decryptedData: decrypted
    };
  } catch (error) {
    console.error('File decryption failed:', error);
    throw new Error('Failed to decrypt file data');
  }
};

/**
 * Calculate SHA-256 checksum of data
 */
export const calculateChecksum = async (data: ArrayBuffer | Uint8Array): Promise<string> => {
  try {
    const buffer = data instanceof ArrayBuffer ? data : data.buffer;
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('Checksum calculation failed:', error);
    throw new Error('Failed to calculate checksum');
  }
};

/**
 * Validate passphrase strength
 */
export const validatePassphraseStrength = (passphrase: string): {
  score: number;
  feedback: string[];
  isValid: boolean;
} => {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (passphrase.length >= 8) {
    score += 20;
  } else {
    feedback.push('Must be at least 8 characters long');
  }

  // Character variety checks
  if (/[a-z]/.test(passphrase)) {
    score += 15;
  } else {
    feedback.push('Must contain lowercase letters');
  }

  if (/[A-Z]/.test(passphrase)) {
    score += 15;
  } else {
    feedback.push('Must contain uppercase letters');
  }

  if (/\d/.test(passphrase)) {
    score += 15;
  } else {
    feedback.push('Must contain numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase)) {
    score += 20;
  } else {
    feedback.push('Must contain special characters');
  }

  // Length bonus
  if (passphrase.length >= 12) {
    score += 15;
  }

  // Common password check
  const commonPasswords = ['password', '123456', '123456789', 'qwerty', 'abc123'];
  if (commonPasswords.includes(passphrase.toLowerCase())) {
    score = 0;
    feedback.push('Avoid common passwords');
  }

  return {
    score: Math.min(100, score),
    feedback: feedback.length > 0 ? feedback : ['Strong password!'],
    isValid: score >= 70
  };
};

/**
 * Securely clear sensitive data from memory
 */
export const clearSensitiveData = (data: Uint8Array): void => {
  crypto.getRandomValues(data);
};