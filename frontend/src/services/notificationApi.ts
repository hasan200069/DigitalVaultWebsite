import { apiService } from './api';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface GetNotificationsRequest {
  limit?: number;
  offset?: number;
  type?: string;
  is_read?: boolean;
}

export interface GetNotificationsResponse {
  success: boolean;
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
  success: boolean;
  stats: {
    total: number;
    unread: number;
    by_type: Record<string, number>;
  };
}

export const notificationApi = {
  /**
   * Get user's notifications
   */
  async getNotifications(request: GetNotificationsRequest = {}): Promise<GetNotificationsResponse> {
    const params = new URLSearchParams();
    if (request.limit) params.append('limit', request.limit.toString());
    if (request.offset) params.append('offset', request.offset.toString());
    if (request.type) params.append('type', request.type);
    if (request.is_read !== undefined) params.append('is_read', request.is_read.toString());

    const response = await apiService.request(`/notifications?${params.toString()}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Mark notifications as read
   */
  async markAsRead(request: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    const response = await apiService.request('/notifications/read', {
      method: 'PUT',
      body: JSON.stringify(request)
    });
    return response;
  },

  /**
   * Get notification statistics
   */
  async getStats(): Promise<NotificationStats> {
    const response = await apiService.request('/notifications/stats', {
      method: 'GET'
    });
    return response;
  },

  /**
   * Create a notification (for testing)
   */
  async createNotification(request: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<{ success: boolean; notification: Notification }> {
    const response = await apiService.request('/notify', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response;
  }
};
