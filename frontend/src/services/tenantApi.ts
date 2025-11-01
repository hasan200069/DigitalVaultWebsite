import { getAccessToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface TenantBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
  favicon?: string;
  customCSS?: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  branding: TenantBranding;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTenantRequest {
  name?: string;
  domain?: string;
  branding?: Partial<TenantBranding>;
  isActive?: boolean;
}

export interface GetTenantResponse {
  success: boolean;
  message: string;
  tenant?: Tenant;
}

export interface UpdateTenantResponse {
  success: boolean;
  message: string;
  tenant?: Tenant;
}

class TenantApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getAccessToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getTenant(tenantId: string): Promise<GetTenantResponse> {
    return this.request<GetTenantResponse>(`/api/tenants/${tenantId}`);
  }

  async updateTenant(tenantId: string, data: UpdateTenantRequest): Promise<UpdateTenantResponse> {
    return this.request<UpdateTenantResponse>(`/api/tenants/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const tenantApiService = new TenantApiService();

