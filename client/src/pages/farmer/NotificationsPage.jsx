import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationService } from '../../services';
import { extractError } from '../../utils/constants';
import FarmerLayout from '../../layouts/FarmerLayout';
import { Spinner } from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

import {
  FaCheckCircle,
  FaBell,
  FaClock,
  FaBullhorn,
  FaSeedling,
  FaLandmark,
  FaCoins,
  FaTimesCircle,
  FaClipboardList,
  FaIdCard,
  FaShieldAlt,
  FaExclamationCircle,
} from 'react-icons/fa';

const notifIcons = {
  booking_confirmed: <FaCheckCircle className="text-emerald-600 w-5 h-5" />,
  slot_reminder: <FaBell className="text-amber-600 w-5 h-5" />,
  queue_approaching: <FaClock className="text-purple-600 w-5 h-5" />,
  token_called: <FaBullhorn className="text-blue-600 w-5 h-5 animate-pulse" />,
  procurement_completed: <FaSeedling className="text-emerald-600 w-5 h-5" />,
  payment_processing: <FaLandmark className="text-sky-600 w-5 h-5" />,
  payment_completed: <FaCoins className="text-green-600 w-5 h-5" />,
  booking_cancelled: <FaTimesCircle className="text-red-600 w-5 h-5" />,
  kyc_submitted: <FaIdCard className="text-blue-600 w-5 h-5" />,
  kyc_approved: <FaShieldAlt className="text-emerald-600 w-5 h-5" />,
  kyc_rejected: <FaExclamationCircle className="text-red-600 w-5 h-5" />,
  general: <FaClipboardList className="text-gray-600 w-5 h-5" />,
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getNotifications({ limit: 50 });
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, []);

  const handleRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <FarmerLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            loading={markingAll}
            leftIcon={<CheckCheck className="w-4 h-4" />}
          >
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! Notifications about your bookings, queue, and payments will appear here."
          className="card"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.isRead && handleRead(n._id)}
              className={`card p-4 flex gap-4 cursor-pointer transition-all
                ${!n.isRead ? 'bg-primary-50 border-primary-100 hover:bg-primary-100' : 'hover:bg-gray-50'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0
                ${!n.isRead ? 'bg-primary-100' : 'bg-gray-100'}`}>
                {notifIcons[n.type] || notifIcons.general}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${!n.isRead ? 'text-primary-800' : 'text-gray-900'}`}>
                    {n.title}
                  </p>
                  {!n.isRead && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {new Date(n.createdAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </FarmerLayout>
  );
};

export default NotificationsPage;
