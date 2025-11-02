import { getAccessToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface CreatePlanRequest {
  name: string;
  description?: string;
  kThreshold: number;
  trustees: Array<{
    email: string;
    name: string;
  }>;
  beneficiaries: Array<{
    email: string;
    name: string;
    relationship: string;
  }>;
  waitingPeriodDays: number;
  vaultItemIds: string[];
  shamirShares?: Array<{
    index: number;
    encryptedShare: string;
    trusteeEmail: string;
  }>;
}

export interface InheritancePlan {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  kThreshold: number;
  nTotal: number;
  waitingPeriodDays: number;
  status: 'active' | 'ready' | 'triggered' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  triggeredAt?: string;
  completedAt?: string;
  // Optional properties for full plan details
  trustees?: Trustee[];
  beneficiaries?: Beneficiary[];
  items?: InheritanceItem[];
}

export interface Trustee {
  id: string;
  planId: string;
  userId?: string;
  email: string;
  name: string;
  shareIndex: number;
  encryptedShare: string;
  hasApproved: boolean;
  approvedAt?: string;
  createdAt: string;
}

export interface Beneficiary {
  id: string;
  planId: string;
  email: string;
  name: string;
  relationship: string;
  createdAt: string;
}

export interface InheritanceItem {
  id: string;
  planId: string;
  vaultItemId: string;
  itemName: string;
  itemType: string;
  createdAt: string;
}

export interface PlanStatus {
  plan: InheritancePlan;
  trustees: Trustee[];
  beneficiaries: Beneficiary[];
  items: InheritanceItem[];
  approvalProgress: {
    approved: number;
    total: number;
    canTrigger: boolean;
  };
}

export interface ApprovePlanRequest {
  trusteeId: string;
  approvalCode?: string;
}

export interface TriggerInheritanceRequest {
  planId: string;
  reason: string;
  emergencyOverride?: boolean;
}

class InheritanceApiService {
  private baseUrl = '/inheritance';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Inheritance API request failed:', error);
      throw error;
    }
  }

  /**
   * Create a new inheritance plan
   */
  async createPlan(request: CreatePlanRequest): Promise<{ success: boolean; plan?: InheritancePlan; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; plan?: InheritancePlan }>(`${this.baseUrl}/plans`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    } catch (error: any) {
      console.error('Error creating inheritance plan:', error);
      return {
        success: false,
        error: error.message || 'Failed to create inheritance plan'
      };
    }
  }

  /**
   * List user's inheritance plans
   */
  async listPlans(): Promise<{ success: boolean; plans?: InheritancePlan[]; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; plans?: InheritancePlan[] }>(`${this.baseUrl}/plans`);
      return response;
    } catch (error: any) {
      console.error('Error listing inheritance plans:', error);
      return {
        success: false,
        error: error.message || 'Failed to list inheritance plans'
      };
    }
  }

  /**
   * Get plan status with all related data
   */
  async getPlanStatus(planId: string): Promise<{ success: boolean; data?: PlanStatus; error?: string }> {
    try {
      const response = await this.request<PlanStatus>(`${this.baseUrl}/plans/${planId}`);
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      console.error('Error getting plan status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get plan status'
      };
    }
  }

  /**
   * Approve a plan as a trustee
   */
  async approvePlan(planId: string, request: ApprovePlanRequest): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; message?: string }>(`${this.baseUrl}/plans/${planId}/approve`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    } catch (error: any) {
      console.error('Error approving plan:', error);
      return {
        success: false,
        error: error.message || 'Failed to approve plan'
      };
    }
  }

  /**
   * Trigger inheritance process
   */
  async triggerInheritance(planId: string, request: TriggerInheritanceRequest): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; message?: string }>(`${this.baseUrl}/plans/${planId}/trigger`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    } catch (error: any) {
      console.error('Error triggering inheritance:', error);
      return {
        success: false,
        error: error.message || 'Failed to trigger inheritance'
      };
    }
  }

  /**
   * Get plans where user is a trustee
   */
  async getTrusteePlans(): Promise<{ success: boolean; plans?: Array<{ plan: InheritancePlan; trustee: Trustee }>; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; plans?: Array<{ plan: InheritancePlan; trustee: Trustee }> }>(`${this.baseUrl}/trustee-plans`);
      return response;
    } catch (error: any) {
      console.error('Error getting trustee plans:', error);
      return {
        success: false,
        error: error.message || 'Failed to get trustee plans'
      };
    }
  }

  /**
   * Update an inheritance plan
   */
  async updatePlan(planId: string, request: CreatePlanRequest): Promise<{ success: boolean; plan?: InheritancePlan; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; plan: InheritancePlan; message?: string }>(`${this.baseUrl}/plans/${planId}`, {
        method: 'PUT',
        body: JSON.stringify(request)
      });
      return response;
    } catch (error: any) {
      console.error('Error updating plan:', error);
      return {
        success: false,
        error: error.message || 'Failed to update plan'
      };
    }
  }

  /**
   * Get trustee shares for a plan (for beneficiaries)
   */
  async getTrusteeShares(planId: string): Promise<{ success: boolean; shares?: any[]; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; shares: any[] }>(`${this.baseUrl}/plans/${planId}/trustee-shares`, {
        method: 'GET'
      });
      return response;
    } catch (error: any) {
      console.error('Error fetching trustee shares:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch trustee shares'
      };
    }
  }

  /**
   * Delete an inheritance plan
   */
  async deletePlan(planId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await this.request<{ success: boolean; message?: string }>(`${this.baseUrl}/plans/${planId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete plan'
      };
    }
  }

}

export const inheritanceApiService = new InheritanceApiService();
