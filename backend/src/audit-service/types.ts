// Audit service types for immutable audit logging

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

export interface CreateAuditLogRequest {
  vaultId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface CreateAuditLogResponse {
  success: boolean;
  message: string;
  log?: AuditLog;
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

export interface AuditExportRequest {
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

export interface AuditExportResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
  expiresIn?: number;
}

// Audit actions enum for type safety
export enum AuditAction {
  // Authentication actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  
  // Vault actions
  VAULT_ITEM_CREATED = 'VAULT_ITEM_CREATED',
  VAULT_ITEM_UPDATED = 'VAULT_ITEM_UPDATED',
  VAULT_ITEM_DELETED = 'VAULT_ITEM_DELETED',
  VAULT_ITEM_VIEWED = 'VAULT_ITEM_VIEWED',
  VAULT_ITEM_DOWNLOADED = 'VAULT_ITEM_DOWNLOADED',
  VAULT_ITEM_SEARCHED = 'VAULT_ITEM_SEARCHED',
  
  // Inheritance actions
  INHERITANCE_PLAN_CREATED = 'INHERITANCE_PLAN_CREATED',
  INHERITANCE_PLAN_UPDATED = 'INHERITANCE_PLAN_UPDATED',
  INHERITANCE_PLAN_DELETED = 'INHERITANCE_PLAN_DELETED',
  INHERITANCE_TRIGGERED = 'INHERITANCE_TRIGGERED',
  
  // Security actions
  ENCRYPTION_KEY_ROTATED = 'ENCRYPTION_KEY_ROTATED',
  PERMISSIONS_CHANGED = 'PERMISSIONS_CHANGED',
  SECURITY_SETTINGS_UPDATED = 'SECURITY_SETTINGS_UPDATED',
  
  // System actions
  AUDIT_LOG_EXPORTED = 'AUDIT_LOG_EXPORTED',
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
}

export enum ResourceType {
  VAULT_ITEM = 'VAULT_ITEM',
  INHERITANCE_PLAN = 'INHERITANCE_PLAN',
  USER = 'USER',
  TENANT = 'TENANT',
  SYSTEM = 'SYSTEM',
}
