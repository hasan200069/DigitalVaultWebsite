import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { notificationApi, type Notification } from '../services/notificationApi';
import { useAuth } from '../contexts/AuthContext';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationRead?: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, onNotificationRead }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationApi.getNotifications({ limit: 20 });
      setNotifications(response.notifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await notificationApi.markAsRead({ notification_ids: notificationIds });
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead([notificationId]);
    // Notify parent component to refresh unread count
    if (onNotificationRead) {
      onNotificationRead();
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
      // Notify parent component to refresh unread count
      if (onNotificationRead) {
        onNotificationRead();
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'INHERITANCE_PLAN_CREATED':
      case 'INHERITANCE_PLAN_UPDATED':
      case 'INHERITANCE_PLAN_APPROVED':
      case 'INHERITANCE_PLAN_TRIGGERED':
      case 'INHERITANCE_PLAN_DELETED':
        return '🏛️';
      case 'TRUSTEE_INVITATION':
      case 'TRUSTEE_APPROVAL_REQUIRED':
        return '👥';
      case 'BENEFICIARY_NOTIFICATION':
        return '🎁';
      case 'VAULT_ITEM_SHARED':
      case 'VAULT_ITEM_ACCESSED':
        return '📁';
      case 'SYSTEM_ALERT':
        return '⚠️';
      case 'SECURITY_ALERT':
        return '🔒';
      default:
        return '🔔';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <div className="flex items-center space-x-2">
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            Loading notifications...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-lg">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>
                  {notification.is_read && (
                    <div className="flex-shrink-0">
                      <CheckIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
};
