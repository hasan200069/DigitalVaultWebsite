// Vault API service for frontend-backend communication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
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

export interface ListItemsResponse {
  success: boolean;
  message: string;
  items?: VaultItem[];
  total?: number;
}

export interface DownloadUrlResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  expiresIn?: number;
}

class VaultApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Get stats for dashboard
  async getStats(): Promise<{ success: boolean; message: string; totalFiles: number; encryptedFiles: number; totalBytes: number; }> {
    return this.request('/vault/stats');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    const token = localStorage.getItem('accessToken');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
      console.log('API Request - Token being sent:', {
        hasToken: !!token,
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + '...',
        endpoint: endpoint
      });
    } else {
      console.log('API Request - No token found for endpoint:', endpoint);
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      console.log('Making API request to:', url, 'with config:', {
        method: config.method || 'GET',
        headers: config.headers
      });
      
      const response = await fetch(url, config);
      
      console.log('API response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('API error response:', errorData);
        
        // Handle authentication errors
        if (response.status === 401) {
          // Clear expired token and redirect to login
          console.log('401 Authentication error detected, clearing tokens');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          console.log('About to redirect to login...');
          // Redirect to login for authentication error
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('API success response:', responseData);
      return responseData;
    } catch (error) {
      console.error('Vault API request failed:', error);
      throw error;
    }
  }

  // Create a new vault item
  async createItem(itemData: CreateItemRequest): Promise<CreateItemResponse> {
    return this.request<CreateItemResponse>('/vault/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  // Get vault item by ID
  async getItem(itemId: string): Promise<GetItemResponse> {
    return this.request<GetItemResponse>(`/vault/items/${itemId}`);
  }

  // List user's vault items
  async listItems(params?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListItemsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/vault/items?${queryString}` : '/vault/items';
    
    return this.request<ListItemsResponse>(endpoint);
  }

  // Create new version of vault item
  async createVersion(
    itemId: string, 
    versionData: CreateVersionRequest
  ): Promise<CreateVersionResponse> {
    return this.request<CreateVersionResponse>(`/vault/items/${itemId}/versions`, {
      method: 'POST',
      body: JSON.stringify(versionData),
    });
  }

  // Get download URL for a specific version
  async getDownloadUrl(
    itemId: string, 
    version: number
  ): Promise<DownloadUrlResponse> {
    return this.request<DownloadUrlResponse>(
      `/vault/items/${itemId}/versions/${version}/download`
    );
  }

  // Upload file to presigned URL
  async uploadFile(
    uploadUrl: string, 
    file: ArrayBuffer, 
    contentType: string
  ): Promise<void> {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Download file from URL
  async downloadFile(downloadUrl: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  }

  // Delete vault item
  async deleteItem(itemId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/vault/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on MIME type
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
    if (mimeType.includes('text/')) return '📄';
    return '📁';
  }

  // Get category color
  getCategoryColor(category?: string): string {
    const colors: Record<string, string> = {
      'documents': 'bg-blue-100 text-blue-800',
      'images': 'bg-green-100 text-green-800',
      'videos': 'bg-purple-100 text-purple-800',
      'audio': 'bg-yellow-100 text-yellow-800',
      'archives': 'bg-gray-100 text-gray-800',
      'other': 'bg-gray-100 text-gray-800',
    };
    
    return colors[category || 'other'] || colors.other;
  }
}

// Create and export singleton instance
export const vaultApiService = new VaultApiService(API_BASE_URL);
export default vaultApiService;
