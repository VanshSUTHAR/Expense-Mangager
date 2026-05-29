import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  CreditCard,
  Home,
  LogOut,
  PieChart,
  Settings,
  Target,
  Wallet,
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/transactions', icon: CreditCard, label: 'Transactions' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/reports', icon: PieChart, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const bellButtonRef = useRef(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationOpen) return;
      if (dropdownRef.current?.contains(event.target) || bellButtonRef.current?.contains(event.target)) return;
      setNotificationOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setNotificationOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [notificationOpen]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openNotifications = async () => {
    if (!notificationOpen) {
      setNotificationOpen(true);
    }
    if (notifications.length === 0) {
      await loadNotifications();
    }
  };

  const closeNotifications = () => {
    setNotificationOpen(false);
  };

  const deleteNotification = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications(prev => prev.filter(notification => notification._id !== id));
    setUnreadCount(prev => {
      const next = notifications.find(notification => notification._id === id && !notification.isRead);
      return next ? Math.max(0, prev - 1) : prev;
    });
  };

  return (
    <header className="navbar glass">
      <div className="navbar-logo">
        <span className="brand-mark"><Wallet size={18} /></span>
        <span className="navbar-brand">ExpenseFlow</span>
      </div>

      <nav className="navbar-nav" aria-label="Primary navigation">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon"><Icon size={18} /></span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="navbar-user">
        <div className="notification-wrap" onMouseEnter={openNotifications} onMouseLeave={closeNotifications}>
          <button
            ref={bellButtonRef}
            className="notification-btn"
            type="button"
            onClick={openNotifications}
            aria-label="Open notifications"
            aria-expanded={notificationOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {notificationOpen && (
            <div ref={dropdownRef} className="notification-popover" role="dialog" aria-label="Notifications popup">
              <div className="notification-popover-header">
                <div>
                  <div className="notification-popover-title">NOTIFICATIONS</div>
                  <div className="notification-popover-subtitle">{unreadCount} unread</div>
                </div>
                <button className="notification-popover-close" type="button" onClick={() => setNotificationOpen(false)} aria-label="Close notifications">
                  ✕
                </button>
              </div>

              <div className="notification-popover-body">
                {notificationsLoading ? (
                  <div className="notification-popover-loading"><span className="loading" /></div>
                ) : notifications.length === 0 ? (
                  <div className="notification-popover-empty">No notifications yet.</div>
                ) : (
                  notifications.slice(0, 5).map(notification => (
                    <div key={notification._id} className={`notification-popover-item ${!notification.isRead ? 'unread' : ''}`}>
                      <div
                        className="notification-popover-icon"
                        style={{ background: `${({ budget: 'var(--orange)', goal: 'var(--green)', transaction: 'var(--blue)', system: 'var(--purple)' }[notification.type] || 'var(--blue)')}22` }}
                      >
                        {notification.icon}
                      </div>
                      <div className="notification-popover-content">
                        <div className="notification-popover-text">{notification.message}</div>
                        <div className="notification-popover-time">{timeAgo(notification.createdAt)}</div>
                      </div>
                      <button
                        className="notification-popover-item-close"
                        type="button"
                        onClick={() => deleteNotification(notification._id)}
                        aria-label="Remove notification"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button className="notification-popover-footer" type="button" onClick={() => {
                closeNotifications();
                navigate('/notifications');
              }}>
                View all notifications
              </button>
            </div>
          )}
        </div>

        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} aria-label="Logout">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
