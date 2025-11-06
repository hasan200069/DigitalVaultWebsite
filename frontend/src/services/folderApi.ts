// Folder API service for frontend-backend communication
import { getAccessToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface Folder {
  id: string;
  userId: string;
  tenantId: string;
  taxonomyId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderRequest {
  taxonomyId: string;
  name: string;
}

export interface CreateFolderResponse {
  success: boolean;
  message: string;
  folder?: Folder;
}

export interface ListFoldersResponse {
  success: boolean;
  message: string;
  folders?: Folder[];
}

export interface UpdateFolderRequest {
  name: string;
}

export interface UpdateFolderResponse {
  success: boolean;
  message: string;
  folder?: Folder;
}

export interface DeleteFolderResponse {
  success: boolean;
  message: string;
}

class FolderApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
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
    const token = getAccessToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication errors
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Folder API request failed:', error);
      throw error;
    }
  }

  // Create a new folder
  async createFolder(folderData: CreateFolderRequest): Promise<CreateFolderResponse> {
    return this.request<CreateFolderResponse>('/folders', {
      method: 'POST',
      body: JSON.stringify(folderData),
    });
  }

  // List folders (optionally filtered by taxonomy)
  async listFolders(taxonomyId?: string): Promise<ListFoldersResponse> {
    const queryString = taxonomyId ? `?taxonomyId=${encodeURIComponent(taxonomyId)}` : '';
    return this.request<ListFoldersResponse>(`/folders${queryString}`);
  }

  // Update a folder
  async updateFolder(folderId: string, folderData: UpdateFolderRequest): Promise<UpdateFolderResponse> {
    return this.request<UpdateFolderResponse>(`/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify(folderData),
    });
  }

  // Delete a folder
  async deleteFolder(folderId: string): Promise<DeleteFolderResponse> {
    return this.request<DeleteFolderResponse>(`/folders/${folderId}`, {
      method: 'DELETE',
    });
  }
}

// Create and export singleton instance
export const folderApiService = new FolderApiService(API_BASE_URL);
export default folderApiService;

