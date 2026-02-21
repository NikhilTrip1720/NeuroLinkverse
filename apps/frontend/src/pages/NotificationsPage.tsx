import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useNotificationStore } from '@/stores/notificationStore';
import type { Notification } from '@skillshare-circles/shared';
import { formatRelativeTime, cn } from '@/lib/utils';

export function NotificationsPage() {
  const { setNotifications, markAllAsRead } = useNotificationStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ data: { items: Notification[] } }>('/users/me/notifications');
      return res.data.data.items;
    },
  });

  useEffect(() => {
    if (data) setNotifications(data);
  }, [data, setNotifications]);

  const markRead = useMutation({
    mutationFn: async () => { await api.patch('/users/me/notifications/read'); },
    onSuccess: () => { markAllAsRead(); refetch(); },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary-400" aria-hidden="true" />
          Notifications
        </h1>
        {data?.some((n) => !n.isRead) && (
          <Button variant="secondary" size="sm" onClick={() => markRead.mutate()} leftIcon={<Check className="h-4 w-4" />}>
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.length ? (
        <div className="card p-12 text-center">
          <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-slate-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((notification) => (
            <div key={notification.id} className={cn('card p-4 flex items-start gap-4', !notification.isRead && 'border-primary-700 bg-primary-900/10')}>
              <div className={cn('h-2 w-2 rounded-full mt-2 flex-shrink-0', notification.isRead ? 'bg-slate-600' : 'bg-primary-400')} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-100">{notification.title}</p>
                <p className="text-sm text-slate-400 mt-0.5">{notification.message}</p>
                <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(notification.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
