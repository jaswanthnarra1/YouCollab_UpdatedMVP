import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, BellOff } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDate } from '../../utils';
import { Button } from '../ui/Button';
import Skeleton from '../ui/Skeleton';

export const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const { useNotificationsList, markRead, markAllAsRead } = useNotifications();
  
  const { data, isLoading } = useNotificationsList();
  const notifications = data?.data || [];

  const handleNotificationClick = (notif) => {
    // Mark as read
    if (!notif.isRead) {
      markRead(notif.id);
    }
    onClose();

    // Navigate to related gig details if metadata is present
    const meta = notif.metadata;
    if (meta && meta.gigId) {
      navigate(`/gigs/${meta.gigId}`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="w-[320px] rounded-3xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-dark-border dark:bg-dark-surface animate-fade-in text-left">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-dark-border mb-2 select-none">
        <h4 className="text-sm font-bold text-neutral-900 dark:text-dark-text tracking-tight">
          Recent Notifications alert
        </h4>
        {notifications.length > 0 && notifications.some((n) => !n.isRead) && (
          <button
            onClick={() => markAllAsRead()}
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[300px] overflow-y-auto space-y-1.5 scrollbar-none py-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2.5 p-2 rounded-xl">
              <Skeleton variant="avatar" className="w-8 h-8" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-neutral-400 select-none">
            <BellOff size={24} className="mb-2" />
            <span className="text-xs font-medium text-neutral-500">Nothing here yet 👀</span>
          </div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`w-full flex gap-3 p-2.5 rounded-2xl text-left transition-all relative ${
                notif.isRead
                  ? 'hover:bg-neutral-50 dark:hover:bg-dark-bg/60 text-neutral-600 dark:text-dark-muted'
                  : 'bg-primary-light/30 hover:bg-primary-light/50 text-neutral-900 dark:bg-primary/10 dark:hover:bg-primary/15 dark:text-dark-text'
              }`}
            >
              {/* Unread Indicator dot */}
              {!notif.isRead && (
                <span className="absolute top-3.5 right-3.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              
              <div className="flex-1 space-y-0.5">
                <div className="text-[13px] font-bold leading-tight pr-2.5">{notif.title}</div>
                <div className="text-xs leading-normal opacity-90">{notif.message}</div>
                <div className="text-[10px] opacity-60 font-semibold pt-0.5">
                  {formatDate(notif.createdAt)}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
