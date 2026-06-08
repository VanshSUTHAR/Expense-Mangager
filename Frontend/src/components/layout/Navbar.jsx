import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Bell, CreditCard, Home, PieChart, Settings,
  Target, Wallet, Landmark, Sun, Moon,
} from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import "./Navbar.css";
import { FaSignOutAlt } from "react-icons/fa";

const navItems = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/transactions", icon: CreditCard, label: "Transactions" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/loans", icon: Landmark, label: "Loans" },
  { to: "/reports", icon: PieChart, label: "Reports" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const bellButtonRef = useRef(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationOpen && !userMenuOpen) return;
      if (
        dropdownRef.current?.contains(event.target) ||
        bellButtonRef.current?.contains(event.target) ||
        userDropdownRef.current?.contains(event.target)
      )
        return;
      setNotificationOpen(false);
      setUserMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setNotificationOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationOpen]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const openNotifications = async () => {
    if (!notificationOpen) setNotificationOpen(true);
    if (notifications.length === 0) await loadNotifications();
  };

  const closeNotifications = () => setNotificationOpen(false);

  const openUserMenu = () => setUserMenuOpen(true);

  const closeUserMenu = () => setUserMenuOpen(false);

  const deleteNotification = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    setUnreadCount((prev) => {
      const isUnread = notifications.find((n) => n._id === id && !n.isRead);
      return isUnread ? Math.max(0, prev - 1) : prev;
    });
  };

  return (
    <header className="navbar glass">
      <Link
        to="/"
        className="navbar-logo"
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
        }}
      >
        <span className="brand-mark">
          <Wallet size={18} />
        </span>
        <span className="navbar-brand">ExpenseFlow</span>
      </Link>

      <nav className="navbar-nav" aria-label="Primary navigation">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">
              <Icon size={18} />
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="navbar-user">
        {/* Dark mode toggle */}
        <button className="theme-toggle-btn" onClick={toggle} title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div
          className="notification-wrap"
          onMouseEnter={openNotifications}
          onMouseLeave={closeNotifications}
        >
          <button
            ref={bellButtonRef}
            className="notification-btn"
            type="button"
            onClick={openNotifications}
            aria-label="Open notifications"
            aria-expanded={notificationOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div
              ref={dropdownRef}
              className="notification-popover"
              role="dialog"
              aria-label="Notifications popup"
            >
              <div className="notification-popover-header">
                <div>
                  <div className="notification-popover-title">
                    NOTIFICATIONS
                  </div>
                  <div className="notification-popover-subtitle">
                    {unreadCount} unread
                  </div>
                </div>
                <button
                  className="notification-popover-close"
                  type="button"
                  onClick={() => setNotificationOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="notification-popover-body">
                {notificationsLoading ? (
                  <div className="notification-popover-loading">
                    <span className="loading" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-popover-empty">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification._id}
                      className={`notification-popover-item ${!notification.isRead ? "unread" : ""}`}
                    >
                      <div className="notification-popover-icon">
                        {notification.icon}
                      </div>
                      <div className="notification-popover-content">
                        <div className="notification-popover-text">
                          {notification.message}
                        </div>
                        <div className="notification-popover-time">
                          {timeAgo(notification.createdAt)}
                        </div>
                      </div>
                      <button
                        className="notification-popover-item-close"
                        type="button"
                        onClick={() => deleteNotification(notification._id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                className="notification-popover-footer"
                type="button"
                onClick={() => {
                  closeNotifications();
                  navigate("/notifications");
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>

        <div className="user-wrap">
          <button
            ref={userDropdownRef}
            className="user-info user-info-button"
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            aria-label="Open user info"
            aria-expanded={userMenuOpen}
          >
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </button>

          {userMenuOpen && (
            <div className="user-popover" role="dialog" aria-label="User info popup">
              <div className="user-popover-header">
                <div className="user-popover-avatar">{user?.name?.[0]?.toUpperCase()}</div>
                <button
                  className="notification-popover-close"
                  type="button"
                  onClick={closeUserMenu}
                >
                  ✕
                </button>
              </div>

              <div className="user-popover-body">
                <div className="user-popover-name">{user?.name}</div>
                <div className="user-popover-email">{user?.email}</div>
                <div className="user-popover-meta">
                  <span>{user?.currency || "INR"}</span>
                  <span>{user?.monthlyBudget ? `Budget: ${user.monthlyBudget}` : "No budget set"}</span>
                </div>
              </div>

              <button
                className="user-popover-footer"
                type="button"
                onClick={() => {
                  closeUserMenu();
                  navigate("/settings");
                }}
              >
                Open Settings
              </button>
            </div>
          )}
        </div>

        <button
          className="logout-btn"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <FaSignOutAlt size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
