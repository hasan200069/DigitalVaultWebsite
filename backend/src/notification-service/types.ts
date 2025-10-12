export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: Date;
  read_at?: Date;
}

export enum NotificationType {
  INHERITANCE_PLAN_CREATED = 'INHERITANCE_PLAN_CREATED',
  INHERITANCE_PLAN_UPDATED = 'INHERITANCE_PLAN_UPDATED',
  INHERITANCE_PLAN_APPROVED = 'INHERITANCE_PLAN_APPROVED',
  INHERITANCE_PLAN_TRIGGERED = 'INHERITANCE_PLAN_TRIGGERED',
  INHERITANCE_PLAN_DELETED = 'INHERITANCE_PLAN_DELETED',
  TRUSTEE_INVITATION = 'TRUSTEE_INVITATION',
  TRUSTEE_APPROVAL_REQUIRED = 'TRUSTEE_APPROVAL_REQUIRED',
  BENEFICIARY_NOTIFICATION = 'BENEFICIARY_NOTIFICATION',
  VAULT_ITEM_SHARED = 'VAULT_ITEM_SHARED',
  VAULT_ITEM_ACCESSED = 'VAULT_ITEM_ACCESSED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SECURITY_ALERT = 'SECURITY_ALERT'
}

export interface CreateNotificationRequest {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface GetNotificationsRequest {
  limit?: number;
  offset?: number;
  type?: NotificationType;
  is_read?: boolean;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface MarkAsReadRequest {
  notification_ids: string[];
}

export interface MarkAsReadResponse {
  success: boolean;
  updated_count: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
}
