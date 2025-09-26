// Request/Response types for tenant endpoints

export interface CreateTenantRequest {
  name: string;
  domain: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
    favicon?: string;
    customCSS?: string;
  };
}

export interface CreateTenantResponse {
  success: boolean;
  message: string;
  tenant?: {
    id: string;
    name: string;
    domain: string;
    branding: any;
    isActive: boolean;
    createdAt: string;
  };
}

export interface GetTenantResponse {
  success: boolean;
  message: string;
  tenant?: {
    id: string;
    name: string;
    domain: string;
    branding: any;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UpdateTenantRequest {
  name?: string;
  domain?: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
    favicon?: string;
    customCSS?: string;
  };
  isActive?: boolean;
}

export interface UpdateTenantResponse {
  success: boolean;
  message: string;
  tenant?: {
    id: string;
    name: string;
    domain: string;
    branding: any;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ListTenantsResponse {
  success: boolean;
  message: string;
  tenants?: Array<{
    id: string;
    name: string;
    domain: string;
    branding: any;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
