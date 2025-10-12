// Search API service for vault items

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
  took?: number;
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

class SearchApiService {
  private baseUrl = 'http://localhost:3001/vault';

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }

    return response.json();
  }

  async searchItems(request: SearchRequest): Promise<SearchResponse> {
    return this.makeRequest<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSecureViewer(itemId: string, version?: number): Promise<SecureViewerResponse> {
    const url = version 
      ? `/items/${itemId}/secure-viewer?version=${version}`
      : `/items/${itemId}/secure-viewer`;
    
    return this.makeRequest<SecureViewerResponse>(url);
  }

  async downloadFile(itemId: string, version: number, fileName: string): Promise<void> {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${this.baseUrl}/items/${itemId}/versions/${version}/download-file`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to download file');
    }

    // Get the file blob
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async getDownloadUrl(itemId: string, version: number): Promise<{ downloadUrl: string; expiresIn: number }> {
    const response = await this.makeRequest<{
      success: boolean;
      downloadUrl: string;
      expiresIn: number;
    }>(`/items/${itemId}/versions/${version}/download`);
    
    return {
      downloadUrl: response.downloadUrl,
      expiresIn: response.expiresIn
    };
  }

  // Helper method to get available categories
  async getCategories(): Promise<string[]> {
    // This would typically come from a separate API endpoint
    // For now, return common categories
    return [
      'Documents',
      'Images',
      'Videos',
      'Audio',
      'Archives',
      'Spreadsheets',
      'Presentations',
      'Code',
      'Other'
    ];
  }

  // Helper method to get available tags
  async getPopularTags(): Promise<string[]> {
    // This would typically come from a separate API endpoint
    // For now, return common tags
    return [
      'important',
      'confidential',
      'personal',
      'work',
      'financial',
      'legal',
      'medical',
      'tax',
      'contract',
      'receipt'
    ];
  }

  // Helper method to parse search query for advanced features
  parseSearchQuery(query: string): { 
    text: string; 
    filters: Partial<SearchFilters>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } {
    const filters: Partial<SearchFilters> = {};
    let text = query;
    let sortBy: string | undefined;
    let sortOrder: 'asc' | 'desc' = 'desc';

    // Parse advanced search syntax
    const patterns = [
      // File type: type:pdf
      { regex: /type:(\w+)/gi, handler: (match: string) => {
        filters.mimeType = match.toLowerCase();
      }},
      
      // Category: cat:documents
      { regex: /cat:(\w+)/gi, handler: (match: string) => {
        filters.category = match;
      }},
      
      // Tag: tag:important
      { regex: /tag:(\w+)/gi, handler: (match: string) => {
        if (!filters.tags) filters.tags = [];
        filters.tags.push(match);
      }},
      
      // Date: date:2024-01-01
      { regex: /date:(\d{4}-\d{2}-\d{2})/gi, handler: (match: string) => {
        filters.dateFrom = match;
        filters.dateTo = match;
      }},
      
      // Date range: date:2024-01-01..2024-12-31
      { regex: /date:(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})/gi, handler: (match: string, match2: string) => {
        filters.dateFrom = match;
        filters.dateTo = match2;
      }},
      
      // Size: size:>1MB
      { regex: /size:>(\d+)([kmg]b?)?/gi, handler: (match: string, unit: string = 'b') => {
        const multiplier = unit.toLowerCase().startsWith('k') ? 1024 : 
                          unit.toLowerCase().startsWith('m') ? 1024 * 1024 : 
                          unit.toLowerCase().startsWith('g') ? 1024 * 1024 * 1024 : 1;
        filters.minSize = parseInt(match) * multiplier;
      }},
      
      // Size: size:<10MB
      { regex: /size:<(\d+)([kmg]b?)?/gi, handler: (match: string, unit: string = 'b') => {
        const multiplier = unit.toLowerCase().startsWith('k') ? 1024 : 
                          unit.toLowerCase().startsWith('m') ? 1024 * 1024 : 
                          unit.toLowerCase().startsWith('g') ? 1024 * 1024 * 1024 : 1;
        filters.maxSize = parseInt(match) * multiplier;
      }},
      
      // Sort: sort:name:asc
      { regex: /sort:(\w+):(asc|desc)/gi, handler: (match: string, order: string) => {
        sortBy = match;
        sortOrder = order as 'asc' | 'desc';
      }}
    ];

    // Apply patterns
    patterns.forEach(({ regex, handler }) => {
      const matches = [...text.matchAll(regex)];
      matches.forEach(match => {
        handler(match[1], match[2]);
        text = text.replace(match[0], '').trim();
      });
    });

    return { text: text.trim(), filters, sortBy, sortOrder };
  }
}

export const searchApiService = new SearchApiService();