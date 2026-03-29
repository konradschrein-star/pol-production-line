'use client';

/**
 * Notification Bell Component
 *
 * Displays unread notification count and dropdown list
 * Polls for new notifications every 10 seconds
 */

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';

interface Notification {
  id: string;
  job_id: string;
  scene_id?: string;
  severity: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  details?: any;
  created_at: string;
  read: boolean;
}

interface NotificationCounts {
  total: number;
  unread: number;
  error: number;
  warning: number;
  info: number;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    total: 0,
    unread: 0,
    error: 0,
    warning: 0,
    info: 0,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?unread=true&limit=10');
      const data = await response.json();

      setNotifications(data.notifications || []);
      setCounts(data.counts || {
        total: 0,
        unread: 0,
        error: 0,
        warning: 0,
        info: 0,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Mark notifications as read
  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds }),
      });

      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (notifications.length === 0) return;

    setIsLoading(true);
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    await markAsRead(unreadIds);
    setIsLoading(false);
  };

  // Poll for notifications every 10 seconds
  useEffect(() => {
    fetchNotifications(); // Initial load

    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const severityColors = {
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  const severityIcons = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-surface_container transition-colors"
        aria-label={`Notifications (${counts.unread} unread)`}
      >
        <svg
          className="w-6 h-6 text-on_surface"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {counts.unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {counts.unread > 99 ? '99+' : counts.unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-surface_container rounded-xl shadow-xl border border-outline z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-outline flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-on_surface">Notifications</h3>
              <p className="text-xs text-on_surface_variant mt-0.5">
                {counts.unread} unread
                {counts.error > 0 && (
                  <span className="ml-2 text-red-400">
                    • {counts.error} error{counts.error !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>

            {counts.unread > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isLoading}
                className="text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-on_surface_variant text-sm">No new notifications</p>
                <p className="text-on_surface_variant text-xs mt-1">
                  You're all caught up! ✅
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-outline hover:bg-surface_container_high transition-colors cursor-pointer ${
                    !notification.read ? 'bg-surface_container_low' : ''
                  }`}
                  onClick={() => markAsRead([notification.id])}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity Icon */}
                    <div className="flex-shrink-0 text-xl">
                      {severityIcons[notification.severity]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={severityColors[notification.severity]}>
                          {notification.severity}
                        </Badge>
                        <span className="text-xs text-on_surface_variant">
                          {notification.category.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="text-sm text-on_surface leading-snug">
                        {notification.message}
                      </p>

                      {notification.details?.sceneOrder !== undefined && (
                        <p className="text-xs text-on_surface_variant mt-1">
                          Scene {notification.details.sceneOrder}
                          {notification.details.retryCount && (
                            <span> • {notification.details.retryCount} attempts</span>
                          )}
                        </p>
                      )}

                      <p className="text-xs text-on_surface_variant mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-outline bg-surface_container_low">
              <a
                href="/analytics"
                className="text-xs text-primary hover:text-primary/80 transition-colors block text-center"
              >
                View all notifications →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
