import { api } from '../lib/axios';
import type { AdminStats, UserStats, ActivityItem, AdminUser,CreateUserPayload, PaginatedUsers, Role, UpcomingMeeting,Organization, PaginatedSubjects, SubjectPayload, SubjectRecord, PaginatedAccessLogs} from '../types/admin';

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
    const { data } = await api.get<{ roles: Role[] }>('/admin/lookups/roles');
    return data.roles;
  },

  async getOrganizations(): Promise<Organization[]> {
  const { data } = await api.get<{organizations: Organization[];}>('/admin/lookups/organizations');

  return data.organizations;
  },

  async getSubjects(search = '', page = 1): Promise<PaginatedSubjects> {
    const { data } = await api.get<PaginatedSubjects>('/admin/subjects', {
      params: { search: search || undefined, page },
    });
    return data;
  },

  async createSubject(payload: SubjectPayload): Promise<SubjectRecord> {
    const { data } = await api.post<{ subject: SubjectRecord }>('/admin/subjects', payload);
    return data.subject;
  },

  async updateSubject(id: number, payload: SubjectPayload): Promise<SubjectRecord> {
    const { data } = await api.put<{ subject: SubjectRecord }>(`/admin/subjects/${id}`, payload);
    return data.subject;
  },

  async deleteSubject(id: number): Promise<void> {
    await api.delete(`/admin/subjects/${id}`);
  },

  async getAccessLogs(search = '', page = 1): Promise<PaginatedAccessLogs> {
    const { data } = await api.get<PaginatedAccessLogs>('/admin/access-logs', {
      params: { search: search || undefined, page },
    });
    return data;
  },
};
