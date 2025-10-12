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

// Search related types
export interface SearchFilters {
  category?: string;
  tags?: string[];
  mimeType?: string;
  fileExtension?: string;
  isEncrypted?: boolean;
  dateFrom?: string;
  dateTo?: string;
  minSize?: number;
  maxSize?: number;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'file_size';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  item: VaultItem;
  relevanceScore?: number;
  matchedFields?: string[];
  snippet?: string;
}

export interface SearchResponse {
  success: boolean;
  message: string;
  results: SearchResult[];
  total: number;
  query: string;
  filters?: SearchFilters;
  took?: number; // Search time in milliseconds
}

// Secure viewer types
export interface SecureViewerRequest {
  itemId: string;
  version?: number;
}

export interface SecureViewerResponse {
  success: boolean;
  message: string;
  viewerUrl?: string;
  expiresIn?: number;
  restrictions?: {
    disableCopy: boolean;
    disableSave: boolean;
    disablePrint: boolean;
    watermarkText?: string;
  };
}