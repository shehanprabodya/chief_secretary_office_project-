import { api } from '../lib/axios';
import type { AdminStats, UserStats, ActivityItem, AdminUser,CreateUserPayload, PaginatedUsers, Role, UpcomingMeeting,Organization} from '../types/admin';

export interface UserFilters {
  search?: string;
  role_id?: string;
  status?: string;
  page?: number;
  per_page?: number;
}

export const adminService = {
  // Dashboard
  async getStats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>('/admin/stats');
    return data;
  },

  async getUpcomingMeetings(): Promise<UpcomingMeeting[]> {
    const { data } = await api.get<{ meetings: UpcomingMeeting[] }>('/admin/upcoming-meetings');
    return data.meetings;
  },

  async getRecentActivity(): Promise<ActivityItem[]> {
    const { data } = await api.get<{ activities: ActivityItem[] }>('/admin/recent-activity');
    return data.activities;
  },

  // User Management
  async getUserStats(): Promise<UserStats> {
    const { data } = await api.get<UserStats>('/admin/users/stats');
    return data;
  },

  async getUsers(filters: UserFilters = {}): Promise<PaginatedUsers> {
    const { data } = await api.get<PaginatedUsers>('/admin/users', { params: filters });
    return data;
  },

  async getUser(id: number): Promise<AdminUser> {
    const { data } = await api.get<{ user: AdminUser }>(`/admin/users/${id}`);
    return data.user;
  },

  async createUser(payload: CreateUserPayload): Promise<AdminUser> {
    const { data } = await api.post<{ user: AdminUser }>('/admin/users', payload);
    return data.user;
  },

  async updateUser(id: number, payload: Partial<CreateUserPayload>): Promise<AdminUser> {
    const { data } = await api.put<{ user: AdminUser }>(`/admin/users/${id}`, payload);
    return data.user;
  },

  async resetPassword(id: number, new_password: string): Promise<void> {
    await api.post(`/admin/users/${id}/reset-password`, { new_password });
  },

  async toggleStatus(id: number): Promise<{ status: 'ACTIVE' | 'INACTIVE' }> {
    const { data } = await api.patch(`/admin/users/${id}/toggle-status`);
    return data;
  },

  async getRoles(): Promise<Role[]> {
    const { data } = await api.get<{ roles: Role[] }>('/admin/roles');
    return data.roles;
  },

  async getOrganizations(): Promise<Organization[]> {
  const { data } = await api.get<{organizations: Organization[];}>('/admin/organizations');

  return data.organizations;
  },
};