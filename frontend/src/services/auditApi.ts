// Audit API service for frontend

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  vaultId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: string;
  previousHash?: string;
  currentHash: string;
  signature?: string;
  createdAt: string;
  // User info from join
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface GetAuditLogsRequest {
  vaultId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface GetAuditLogsResponse {
  success: boolean;
  message: string;
  logs: AuditLog[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ExportAuditLogsRequest {
  format: 'csv' | 'pdf';
  vaultId?: string;
  dateFrom?: string;
  dateTo?: string;
  filters?: {
    action?: string;
    resourceType?: string;
    userId?: string;
  };
}

class AuditApiService {
  private baseUrl = 'http://localhost:3001/audit';

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

  async getAuditLogs(request: GetAuditLogsRequest): Promise<GetAuditLogsResponse> {
    const params = new URLSearchParams();
    
    if (request.vaultId) params.append('vaultId', request.vaultId);
    if (request.userId) params.append('userId', request.userId);
    if (request.action) params.append('action', request.action);
    if (request.resourceType) params.append('resourceType', request.resourceType);
    if (request.dateFrom) params.append('dateFrom', request.dateFrom);
    if (request.dateTo) params.append('dateTo', request.dateTo);
    if (request.limit) params.append('limit', request.limit.toString());
    if (request.offset) params.append('offset', request.offset.toString());

    const endpoint = request.vaultId 
      ? `/logs/${request.vaultId}?${params.toString()}`
      : `/logs?${params.toString()}`;

    return this.makeRequest<GetAuditLogsResponse>(endpoint);
  }

  async exportAuditLogs(request: ExportAuditLogsRequest): Promise<void> {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Export failed');
    }

    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'audit-logs.csv';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Helper method to get available actions for filtering
  async getAvailableActions(): Promise<string[]> {
    return [
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'VAULT_ITEM_CREATED',
      'VAULT_ITEM_UPDATED',
      'VAULT_ITEM_DELETED',
      'VAULT_ITEM_VIEWED',
      'VAULT_ITEM_DOWNLOADED',
      'VAULT_ITEM_SEARCHED',
      'INHERITANCE_PLAN_CREATED',
      'INHERITANCE_PLAN_UPDATED',
      'INHERITANCE_PLAN_DELETED',
      'INHERITANCE_TRIGGERED',
      'ENCRYPTION_KEY_ROTATED',
      'PERMISSIONS_CHANGED',
      'SECURITY_SETTINGS_UPDATED',
      'AUDIT_LOG_EXPORTED',
      'SYSTEM_BACKUP',
      'SYSTEM_RESTORE'
    ];
  }

  // Helper method to get available resource types for filtering
  async getAvailableResourceTypes(): Promise<string[]> {
    return [
      'VAULT_ITEM',
      'INHERITANCE_PLAN',
      'USER',
      'TENANT',
      'SYSTEM'
    ];
  }
}

export const auditApiService = new AuditApiService();
