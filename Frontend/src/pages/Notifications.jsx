import { useState, useEffect } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import "./Notifications.css";
import { IoNotificationsSharp } from "react-icons/io5";
import { FaCheckDouble } from "react-icons/fa";
import { FaBell } from "react-icons/fa";
export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    await api.put("/notifications/mark-read");
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All marked as read ");
  };

  const deleteNotif = async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  const typeColors = {
    budget: "var(--orange)",
    goal: "var(--green)",
    transaction: "var(--blue)",
    system: "var(--purple)",
  };

  return (
    <div className="notif-page fade-in">
      
      <div className="page-header">
        <div>
          <h1
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <IoNotificationsSharp size={32} />
            Notifications
          </h1>

          <p className="page-sub">{unread} unread</p>
        </div>

        {unread > 0 && (
          <button
            className="btn btn-secondary"
            onClick={markAllRead}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaCheckDouble size={16} />
            Mark All Read
          </button>
        )}
      </div>

      <div className="card notif-list-card">
        {loading ? (
          <div className="empty-state">
            <span className="loading" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}></div>
            <div>No notifications yet. Keep tracking your expenses!</div>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`notif-item ${!n.isRead ? "unread" : ""}`}
              > 
                <div
                  className="notif-icon"
                  style={{
                    background: `${typeColors[n.type]}22`,
                    border: `1px solid ${typeColors[n.type]}44`,
                  }}
                >
                  <FaBell />
                </div>

                <div className="notif-content">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-message">{n.message}</div>
                  <div className="notif-time">{timeAgo(n.createdAt)}</div>
                </div>
                <div className="notif-right">
                  {!n.isRead && <span className="unread-dot" />}
                  <button
                    className="action-btn delete-btn"
                    onClick={() => deleteNotif(n._id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
