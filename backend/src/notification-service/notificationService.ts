import { query } from '../auth-service/database';
import { 
  Notification, 
  NotificationType, 
  CreateNotificationRequest, 
  GetNotificationsRequest, 
  GetNotificationsResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  NotificationStats
} from './types';

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(
    tenantId: string,
    request: CreateNotificationRequest
  ): Promise<Notification> {
    console.log('Creating notification:', { tenantId, request });
    
    const notificationId = crypto.randomUUID();
    const now = new Date();
    
    const result = await query(
      `INSERT INTO notifications (
        id, tenant_id, user_id, type, title, message, data, is_read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        notificationId,
        tenantId,
        request.user_id,
        request.type,
        request.title,
        request.message,
        request.data ? JSON.stringify(request.data) : null,
        false,
        now
      ]
    );

    const notification = result.rows[0];
    console.log('Notification created successfully:', notification.id);
    
    return {
      id: notification.id,
      tenant_id: notification.tenant_id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      is_read: notification.is_read,
      created_at: notification.created_at,
      read_at: notification.read_at
    };
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    tenantId: string,
    userId: string,
    request: GetNotificationsRequest = {}
  ): Promise<GetNotificationsResponse> {
    console.log('Getting notifications:', { tenantId, userId, request });
    
    const {
      limit = 50,
      offset = 0,
      type,
      is_read
    } = request;

    let whereClause = 'WHERE tenant_id = $1 AND user_id = $2';
    const params: any[] = [tenantId, userId];
    let paramIndex = 3;

    if (type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (is_read !== undefined) {
      whereClause += ` AND is_read = $${paramIndex}`;
      params.push(is_read);
      paramIndex++;
    }

    // Get notifications
    const notificationsResult = await query(
      `SELECT * FROM notifications 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    );

    // Get unread count
    const unreadResult = await query(
      `SELECT COUNT(*) as unread FROM notifications 
       WHERE tenant_id = $1 AND user_id = $2 AND is_read = false`,
      [tenantId, userId]
    );

    const notifications = notificationsResult.rows.map((row: any) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data,
      is_read: row.is_read,
      created_at: row.created_at,
      read_at: row.read_at
    }));

    console.log(`Retrieved ${notifications.length} notifications for user ${userId}`);

    return {
      notifications,
      total: parseInt(countResult.rows[0].total),
      unread_count: parseInt(unreadResult.rows[0].unread)
    };
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(
    tenantId: string,
    userId: string,
    request: MarkAsReadRequest
  ): Promise<MarkAsReadResponse> {
    console.log('Marking notifications as read:', { tenantId, userId, request });
    
    if (request.notification_ids.length === 0) {
      return { success: true, updated_count: 0 };
    }

    const placeholders = request.notification_ids.map((_, index) => `$${index + 4}`).join(',');
    
    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = $1
       WHERE tenant_id = $2 AND user_id = $3 AND id IN (${placeholders})
       RETURNING id`,
      [new Date(), tenantId, userId, ...request.notification_ids]
    );

    console.log(`Marked ${result.rows.length} notifications as read`);

    return {
      success: true,
      updated_count: result.rows.length
    };
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(
    tenantId: string,
    userId: string
  ): Promise<NotificationStats> {
    console.log('Getting notification stats:', { tenantId, userId });
    
    // Get total and unread counts
    const statsResult = await query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN is_read = false THEN 1 END) as unread
       FROM notifications 
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId]
    );

    // Get counts by type
    const typeStatsResult = await query(
      `SELECT type, COUNT(*) as count
       FROM notifications 
       WHERE tenant_id = $1 AND user_id = $2
       GROUP BY type`,
      [tenantId, userId]
    );

    const by_type = {} as Record<NotificationType, number>;
    typeStatsResult.rows.forEach((row: any) => {
      by_type[row.type as NotificationType] = parseInt(row.count);
    });

    const stats = {
      total: parseInt(statsResult.rows[0].total),
      unread: parseInt(statsResult.rows[0].unread),
      by_type
    };

    console.log('Notification stats:', stats);
    return stats;
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(
    tenantId: string,
    daysOld: number = 90
  ): Promise<number> {
    console.log('Deleting old notifications:', { tenantId, daysOld });
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await query(
      `DELETE FROM notifications 
       WHERE tenant_id = $1 AND created_at < $2`,
      [tenantId, cutoffDate]
    );

    console.log(`Deleted ${result.rowCount} old notifications`);
    return result.rowCount || 0;
  }

  /**
   * Notify multiple users
   */
  async notifyMultipleUsers(
    tenantId: string,
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<Notification[]> {
    console.log('Notifying multiple users:', { tenantId, userIds, type, title });
    
    const notifications: Notification[] = [];
    
    for (const userId of userIds) {
      try {
        const notification = await this.createNotification(tenantId, {
          user_id: userId,
          type,
          title,
          message,
          data
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to notify user ${userId}:`, error);
      }
    }

    console.log(`Successfully notified ${notifications.length} users`);
    return notifications;
  }
}

export const notificationService = new NotificationService();
