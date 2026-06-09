import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notifApi from '../services/notifications.service';
import useUiStore from '../stores/uiStore';

/**
 * React Query hooks for managing In-App Notifications.
 */
export const useNotifications = () => {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  // Fetch notifications
  const useNotificationsList = (filters = {}) => {
    return useQuery({
      queryKey: ['notifications', 'list', filters],
      queryFn: () => notifApi.list(filters),
      staleTime: 15 * 1000, // 15 seconds
    });
  };

  // Poll for unread notification count
  const useUnreadCount = (enabled = false) => {
    return useQuery({
      queryKey: ['notifications', 'unreadCount'],
      queryFn: notifApi.count,
      enabled,
      refetchInterval: 30 * 1000, // poll every 30 seconds
      staleTime: 10 * 1000,
    });
  };

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: notifApi.read,
    onMutate: async (id) => {
      // Optimistic Update: instantly decrease count and update list
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      
      const previousList = queryClient.getQueryData(['notifications', 'list', {}]);
      const previousCount = queryClient.getQueryData(['notifications', 'unreadCount']);

      // Update count
      if (previousCount) {
        queryClient.setQueryData(['notifications', 'unreadCount'], {
          data: { count: Math.max(0, previousCount.data.count - 1) },
        });
      }

      // Update list
      if (previousList) {
        queryClient.setQueryData(['notifications', 'list', {}], {
          ...previousList,
          data: previousList.data.map((item) =>
            item.id === id ? { ...item, isRead: true } : item
          ),
        });
      }

      return { previousList, previousCount };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(['notifications', 'list', {}], context.previousList);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['notifications', 'unreadCount'], context.previousCount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: notifApi.readAll,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const previousList = queryClient.getQueryData(['notifications', 'list', {}]);
      const previousCount = queryClient.getQueryData(['notifications', 'unreadCount']);

      // Reset count to zero
      queryClient.setQueryData(['notifications', 'unreadCount'], {
        data: { count: 0 },
      });

      // Update list
      if (previousList) {
        queryClient.setQueryData(['notifications', 'list', {}], {
          ...previousList,
          data: previousList.data.map((item) => ({ ...item, isRead: true })),
        });
      }

      return { previousList, previousCount };
    },
    onError: (err, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(['notifications', 'list', {}], context.previousList);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['notifications', 'unreadCount'], context.previousCount);
      }
      addToast('Failed to mark notifications as read.', 'error');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    useNotificationsList,
    useUnreadCount,
    markRead: markReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
};
