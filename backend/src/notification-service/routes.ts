import { Router, Request, Response } from 'express';
import { notificationService } from './notificationService';
import { authenticateToken } from '../auth-service/middleware';
import { 
  CreateNotificationRequest, 
  GetNotificationsRequest, 
  MarkAsReadRequest 
} from './types';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /notify - Create a new notification
 */
router.post('/notify', async (req: Request, res: Response) => {
  try {
    console.log('=== NOTIFICATION ROUTE: Creating notification ===');
    const tenantId = (req as any).user.tenantId;
    const request: CreateNotificationRequest = req.body;

    // Validate required fields
    if (!request.user_id || !request.type || !request.title || !request.message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, type, title, message'
      });
    }

    const notification = await notificationService.createNotification(tenantId, request);
    
    res.status(201).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification'
    });
  }
});

/**
 * GET / - Get user's notifications
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('=== NOTIFICATION ROUTE: Getting notifications ===');
    const tenantId = (req as any).user.tenantId;
    const userId = (req as any).user.id;
    
    const request: GetNotificationsRequest = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      type: req.query.type as any,
      is_read: req.query.is_read ? req.query.is_read === 'true' : undefined
    };

    const response = await notificationService.getNotifications(tenantId, userId, request);
    
    res.json({
      success: true,
      notifications: response.notifications,
      total: response.total,
      unread_count: response.unread_count
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications'
    });
  }
});

/**
 * PUT /read - Mark notifications as read
 */
router.put('/read', async (req: Request, res: Response) => {
  try {
    console.log('=== NOTIFICATION ROUTE: Marking notifications as read ===');
    const tenantId = (req as any).user.tenantId;
    const userId = (req as any).user.id;
    const request: MarkAsReadRequest = req.body;

    if (!request.notification_ids || !Array.isArray(request.notification_ids)) {
      return res.status(400).json({
        success: false,
        error: 'notification_ids must be an array'
      });
    }

    const response = await notificationService.markAsRead(tenantId, userId, request);
    
    res.json(response);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
});

/**
 * GET /stats - Get notification statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    console.log('=== NOTIFICATION ROUTE: Getting notification stats ===');
    const tenantId = (req as any).user.tenantId;
    const userId = (req as any).user.id;

    const stats = await notificationService.getNotificationStats(tenantId, userId);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification stats'
    });
  }
});

/**
 * DELETE /cleanup - Delete old notifications (admin only)
 */
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    console.log('=== NOTIFICATION ROUTE: Cleaning up old notifications ===');
    const tenantId = (req as any).user.tenantId;
    const daysOld = req.query.days ? parseInt(req.query.days as string) : 90;

    const deletedCount = await notificationService.deleteOldNotifications(tenantId, daysOld);
    
    res.json({
      success: true,
      deleted_count: deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup notifications'
    });
  }
});

export default router;
