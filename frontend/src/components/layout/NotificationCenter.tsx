import React, { useState } from 'react';
import { Bell } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Policy Evaluation Hardening',
      message: 'Decision safety rules active: Exclusions strictly override high scores.',
      time: '10m ago',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Research Database Connected',
      message: 'Read-only connection active for 2,107 chest X-ray cases.',
      time: '1h ago',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="anvesh-notification-wrapper">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="notification-trigger-btn"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="dialog" aria-label="System Notifications">
          <div className="notification-header">
            <h3 className="notif-title">System Activity</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAllAsRead} className="notif-mark-read-btn">
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="notif-empty">No new activity.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notif-item ${!n.read ? 'is-unread' : ''}`}>
                  <div className="notif-item-header">
                    <span className="notif-item-title">{n.title}</span>
                    <span className="notif-item-time">{n.time}</span>
                  </div>
                  <p className="notif-item-msg">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  function markAllAllAsRead() {
    markAllAsRead();
  }
};
