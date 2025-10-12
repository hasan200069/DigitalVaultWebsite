export interface InheritancePlan {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  kThreshold: number; // Minimum number of trustees needed
  nTotal: number; // Total number of trustees
  waitingPeriodDays: number; // Days to wait before inheritance can be triggered
  status: 'active' | 'triggered' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  triggeredAt?: Date;
  completedAt?: Date;
}

export interface Trustee {
  id: string;
  planId: string;
  userId: string;
  email: string;
  name: string;
  shareIndex: number; // Which share this trustee holds (1-based)
  encryptedShare: string; // Base64 encoded encrypted share
  hasApproved: boolean;
  approvedAt?: Date;
  createdAt: Date;
}

export interface Beneficiary {
  id: string;
  planId: string;
  email: string;
  name: string;
  relationship: string;
  createdAt: Date;
}

export interface InheritanceItem {
  id: string;
  planId: string;
  vaultItemId: string;
  itemName: string;
  itemType: string;
  createdAt: Date;
}

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

export interface ApprovePlanRequest {
  trusteeId: string;
  approvalCode?: string; // Optional 2FA code
}

export interface TriggerInheritanceRequest {
  planId: string;
  reason: string;
  emergencyOverride?: boolean; // Skip waiting period in emergencies
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
