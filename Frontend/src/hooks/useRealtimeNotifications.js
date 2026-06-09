/**
 * YouCollab — Real-time Notifications Hook
 * ===========================================
 * Subscribes to Supabase Postgres Changes on the notifications table
 * for the authenticated user. Automatically receives new notifications
 * as they are inserted (no polling needed!).
 *
 * Usage:
 *   import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
 *
 *   function NotificationBell() {
 *     const { newNotification, unreadCount } = useRealtimeNotifications(userId);
 *     // newNotification updates on each real-time INSERT
 *   }
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase.service';
import { useAuthStore } from '../stores/authStore';

/**
 * Hook to subscribe to real-time notification updates for the authenticated user.
 *
 * @param {object} [options] - Configuration options
 * @param {function} [options.onNewNotification] - Callback when a new notification arrives
 * @returns {{ newNotification: object|null, unreadCount: number, isConnected: boolean }}
 */
export const useRealtimeNotifications = (options = {}) => {
  const { onNewNotification } = options;
  const user = useAuthStore((state) => state.user);
  const [newNotification, setNewNotification] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('isRead', false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch unread notification count:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Fetch initial count
    fetchUnreadCount();

    // Subscribe to real-time notification inserts
    const channelName = `notifications:${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new;

          // Parse metadata if it's a JSON string
          if (notification.metadata && typeof notification.metadata === 'string') {
            try {
              notification.metadata = JSON.parse(notification.metadata);
            } catch (e) {
              // Keep as string
            }
          }

          setNewNotification(notification);
          setUnreadCount((prev) => prev + 1);

          // Call user-provided callback
          if (onNewNotification) {
            onNewNotification(notification);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          console.log('🔔 Real-time notifications connected');
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or user change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user?.id, onNewNotification, fetchUnreadCount]);

  /**
   * Reset the unread count (e.g. after user views notifications).
   */
  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  /**
   * Manually decrement the unread count (e.g. after marking one as read).
   */
  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    newNotification,
    unreadCount,
    isConnected,
    resetUnreadCount,
    decrementUnreadCount,
    refetchCount: fetchUnreadCount,
  };
};

export default useRealtimeNotifications;
