import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../shared/hooks/useToast';
import { subscribeNotificationToast } from './toastBus';

export function NotificationToastBridge() {
  const navigate = useNavigate();
  const { show, ToastLayer } = useToast({ position: 'top-right' });

  useEffect(() => {
    return subscribeNotificationToast((notification) => {
      const openNotificationsPage = () => navigate('/user/notifications');
      show(notification.title, {
        description: notification.body ?? undefined,
        onClick: openNotificationsPage,
        action: {
          label: 'Xem thông báo',
          onClick: openNotificationsPage,
        },
      });
    });
  }, [navigate, show]);

  return <ToastLayer />;
}
