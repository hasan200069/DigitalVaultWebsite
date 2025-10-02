// Vault service types and interfaces

export interface VaultItem {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  isEncrypted: boolean;
  encryptionKeyId?: string;
  fileSize?: number;
  mimeType?: string;
  fileExtension?: string;
  currentVersion: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultItemVersion {
  id: string;
  itemId: string;
  versionNumber: number;
  filePath: string;
  fileSize: number;
  mimeType: string;
  checksum?: string;
  isEncrypted: boolean;
  encryptionKeyId?: string;
  uploadedBy: string;
  uploadIp?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CreateItemRequest {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  fileSize: number;
  mimeType: string;
  fileExtension?: string;
  isEncrypted?: boolean;
  encryptedCek?: string; // Base64 encoded encrypted CEK
}

export interface CreateItemResponse {
  success: boolean;
  message: string;
  item?: VaultItem;
  uploadUrl?: string;
  expiresIn?: number;
}

export interface GetItemResponse {
  success: boolean;
  message: string;
  item?: VaultItem;
  versions?: VaultItemVersion[];
}

export interface CreateVersionRequest {
  fileSize: number;
  mimeType: string;
  fileExtension?: string;
  isEncrypted?: boolean;
}

export interface CreateVersionResponse {
  success: boolean;
  message: string;
  version?: VaultItemVersion;
  uploadUrl?: string;
  expiresIn?: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  expiresIn: number;
  fields?: Record<string, string>;
}

export interface MinIOConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucketName: string;
}
