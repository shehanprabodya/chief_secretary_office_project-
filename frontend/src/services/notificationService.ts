import { api } from '../lib/axios';
import type { AppNotification } from '../types/notification';

export const notificationService = {
  async list(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const { data } = await api.get<{ notifications: AppNotification[]; unread_count: number }>('/notifications');
    return { notifications: data.notifications, unreadCount: data.unread_count };
  },

  async markRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },
};
