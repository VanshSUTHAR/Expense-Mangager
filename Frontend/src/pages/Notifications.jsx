import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Notifications.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } finally { setLoading(false); }
  };

  const markAllRead = async () => {
    await api.put('/notifications/mark-read');
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All marked as read ✅');
  };

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications(prev => prev.filter(n => n._id !== id));
    setActiveNotification(prev => (prev?._id === id ? null : prev));
  };

  const typeColors = { budget: 'var(--orange)', goal: 'var(--green)', transaction: 'var(--blue)', system: 'var(--purple)' };

  return (
    <div className="notif-page fade-in">
      <div className="page-header">
        <div>
          <h1>Notifications 🔔</h1>
          <p className="page-sub">{unread} unread</p>
        </div>
        {unread > 0 && <button className="btn btn-secondary" onClick={markAllRead}>✅ Mark All Read</button>}
      </div>

      <div className="card notif-list-card">
        {loading ? (
          <div className="empty-state"><span className="loading" /></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔕</div>
            <div>No notifications yet. Keep tracking your expenses!</div>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map(n => (
              <div
                key={n._id}
                className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => setActiveNotification(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveNotification(n);
                  }
                }}
              >
                <div className="notif-icon" style={{ background: `${typeColors[n.type]}22`, border: `1px solid ${typeColors[n.type]}44` }}>
                  {n.icon}
                </div>
                <div className="notif-content">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-message">{n.message}</div>
                  <div className="notif-time">{timeAgo(n.createdAt)}</div>
                </div>
                <div className="notif-right">
                  {!n.isRead && <span className="unread-dot" />}
                  <button className="action-btn delete-btn" onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeNotification && (
        <div className="notif-modal-backdrop" onClick={() => setActiveNotification(null)}>
          <div className="notif-modal" onClick={(e) => e.stopPropagation()}>
            <button className="notif-modal-close" type="button" onClick={() => setActiveNotification(null)} aria-label="Close notification popup">
              ✕
            </button>
            <div className="notif-modal-icon" style={{ background: `${typeColors[activeNotification.type]}22`, border: `1px solid ${typeColors[activeNotification.type]}44` }}>
              {activeNotification.icon}
            </div>
            <div className="notif-modal-title">{activeNotification.title}</div>
            <div className="notif-modal-message">{activeNotification.message}</div>
            <div className="notif-modal-time">{timeAgo(activeNotification.createdAt)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
