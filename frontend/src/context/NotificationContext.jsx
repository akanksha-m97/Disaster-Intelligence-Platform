// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { notificationService } from "../api/notificationService";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Poll timer reference
  const pollTimerRef = useRef(null);

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await notificationService.getNotifications(50);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count ?? (data.notifications?.filter((n) => !n.read).length || 0));
      setError(null);
    } catch (err) {
      console.warn("Could not fetch notifications:", err.message);
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial fetch and automatic polling every 12 seconds
  useEffect(() => {
    fetchNotifications();

    pollTimerRef.current = setInterval(() => {
      fetchNotifications(true);
    }, 12000);

    const handleFocus = () => {
      fetchNotifications(true);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await notificationService.markAsRead(id);
      if (typeof res.unread_count === "number") {
        setUnreadCount(res.unread_count);
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      // Re-fetch to sync
      fetchNotifications(true);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      fetchNotifications(true);
    }
  };

  const clearAll = async () => {
    // Optimistic UI update
    setNotifications([]);
    setUnreadCount(0);

    try {
      await notificationService.clearAll();
    } catch (err) {
      console.error("Failed to clear notifications:", err);
      fetchNotifications(true);
    }
  };

  const deleteNotification = async (id) => {
    const target = notifications.find((n) => n._id === id);
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (target && !target.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const res = await notificationService.deleteNotification(id);
      if (typeof res.unread_count === "number") {
        setUnreadCount(res.unread_count);
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
      fetchNotifications(true);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
