// src/components/NotificationDropdown.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FaBell,
  FaCheck,
  FaCheckDouble,
  FaTrash,
  FaExclamationTriangle,
  FaWater,
  FaFire,
  FaBuilding,
  FaWind,
  FaBiohazard,
  FaMapMarkerAlt,
  FaClock,
  FaTimes,
} from "react-icons/fa";
import { useNotifications } from "../context/NotificationContext";
import "./NotificationDropdown.css";

const getDisasterIcon = (type) => {
  const t = (type || "").toLowerCase();
  if (t.includes("flood") || t.includes("tsunami")) return <FaWater />;
  if (t.includes("fire")) return <FaFire />;
  if (t.includes("earthquake") || t.includes("collapse")) return <FaBuilding />;
  if (t.includes("cyclone") || t.includes("storm") || t.includes("wind")) return <FaWind />;
  if (t.includes("chemical") || t.includes("leak") || t.includes("bio")) return <FaBiohazard />;
  return <FaExclamationTriangle />;
};

const formatNotificationTime = (dateStr) => {
  if (!dateStr) return "--:--";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

const NotificationDropdown = ({ onClose }) => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread'
  const dropdownRef = useRef(null);

  // Close when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div
      className="notification-dropdown"
      ref={dropdownRef}
      role="dialog"
      aria-label="Disaster Intelligence Notifications"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-top">
          <div className="notif-title-group">
            <h3 className="notif-heading">Notifications</h3>
            {unreadCount > 0 && (
              <span className="notif-unread-pill">{unreadCount} new</span>
            )}
          </div>

          <div className="notif-header-actions">
            <button
              className="notif-action-btn"
              title="Mark all as read"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <FaCheckDouble />
              <span>Mark all read</span>
            </button>

            <button
              className="notif-action-btn btn-clear"
              title="Clear all notifications"
              onClick={clearAll}
              disabled={notifications.length === 0}
            >
              <FaTrash />
              <span>Clear</span>
            </button>

            <button
              className="notif-action-btn"
              title="Close notifications"
              onClick={onClose}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="notif-tabs">
          <button
            className={`notif-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
            <span className="notif-tab-badge">{notifications.length}</span>
          </button>
          <button
            className={`notif-tab ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread
            <span className="notif-tab-badge">{unreadCount}</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notif-list">
        {loading && notifications.length === 0 ? (
          <div className="notif-loading">
            <div className="notif-spinner" />
            <span>Loading alerts...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">
              <FaBell />
            </div>
            <h4>No notifications</h4>
            <p>
              {activeTab === "unread"
                ? "You have marked all notifications as read."
                : "No disaster alerts or updates at this time."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const sevKey = (item.severity || "medium").toLowerCase();
            const isUnread = !item.read;

            return (
              <div
                key={item._id}
                className={`notif-item severity-${sevKey} ${isUnread ? "unread" : ""}`}
                onClick={() => {
                  if (isUnread) markAsRead(item._id);
                }}
              >
                {/* Disaster Icon */}
                <div className="notif-icon-bubble">
                  {getDisasterIcon(item.disaster_type)}
                </div>

                {/* Notification Details */}
                <div className="notif-body">
                  <div className="notif-title-row">
                    <h4 className="notif-title">{item.title}</h4>
                    <div className="notif-top-meta">
                      {isUnread && (
                        <span
                          className="notif-unread-dot"
                          title="Unread notification"
                        />
                      )}
                      <div
                        className="notif-item-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isUnread && (
                          <button
                            className="notif-btn-icon"
                            title="Mark as read"
                            onClick={() => markAsRead(item._id)}
                          >
                            <FaCheck />
                          </button>
                        )}
                        <button
                          className="notif-btn-icon btn-delete"
                          title="Delete notification"
                          onClick={() => deleteNotification(item._id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="notif-desc">{item.description}</p>

                  <div className="notif-tags-row">
                    {/* Severity Badge */}
                    <span
                      className={`notif-pill severity-tag sev-${sevKey}`}
                    >
                      {item.severity?.toUpperCase() || "ALERT"}
                    </span>

                    {/* Disaster Type Tag */}
                    {item.disaster_type && (
                      <span className="notif-pill disaster-tag">
                        {item.disaster_type}
                      </span>
                    )}

                    {/* Location */}
                    {item.location && (
                      <span
                        className="notif-meta-location"
                        title={item.location}
                      >
                        <FaMapMarkerAlt />
                        {item.location}
                      </span>
                    )}

                    {/* Date and Time */}
                    <span className="notif-meta-time">
                      <FaClock />
                      {formatNotificationTime(item.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="notif-footer">
        <span className="notif-footer-summary">
          <span className="notif-live-indicator" />
          Live Monitoring Active
        </span>
        <span>
          {filteredNotifications.length}{" "}
          {filteredNotifications.length === 1 ? "alert" : "alerts"}
        </span>
      </div>
    </div>
  );
};

export default NotificationDropdown;
