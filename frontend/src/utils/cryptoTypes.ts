// Crypto types and interfaces for client-side encryption

export interface VaultMasterKey {
  key: CryptoKey;
  salt: Uint8Array;
  rawKey: Uint8Array;
}

export interface ContentEncryptionKey {
  key: CryptoKey;
  rawKey: Uint8Array;
}

export interface EncryptedData {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
}

export interface EncryptionResult {
  encryptedData: EncryptedData;
  checksum: string;
}

export interface FullEncryptionResult {
  encryptedData: EncryptedData;
  encryptedCek: EncryptedData;
  checksum: string;
}

export interface DecryptionResult {
  decryptedData: ArrayBuffer;
}

export interface FileEncryptionOptions {
  onProgress?: (progress: number) => void;
}

export interface FileDecryptionOptions {
  onProgress?: (progress: number) => void;
}
