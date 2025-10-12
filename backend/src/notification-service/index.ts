export { notificationService } from './notificationService';
export { NotificationType } from './types';
export type { 
  Notification, 
  CreateNotificationRequest, 
  GetNotificationsRequest, 
  GetNotificationsResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  NotificationStats
} from './types';
export { default as notificationRoutes } from './routes';
