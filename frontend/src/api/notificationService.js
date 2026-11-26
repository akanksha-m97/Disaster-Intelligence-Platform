// src/api/notificationService.js
const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:8000/api/v1";

export const notificationService = {
  getNotifications: async (limit = 50, unreadOnly = false) => {
    const res = await fetch(
      `${API_BASE_URL}/notifications?limit=${limit}&unread_only=${unreadOnly}`
    );
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return await res.json();
  },

  getUnreadCount: async () => {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count`);
    if (!res.ok) throw new Error("Failed to fetch unread count");
    return await res.json();
  },

  markAsRead: async (id) => {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to mark notification as read");
    return await res.json();
  },

  markAllAsRead: async () => {
    const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to mark all as read");
    return await res.json();
  },

  clearAll: async () => {
    const res = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to clear notifications");
    return await res.json();
  },

  deleteNotification: async (id) => {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete notification");
    return await res.json();
  },

  createNotification: async (data) => {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create notification");
    return await res.json();
  },
};

export default notificationService;
