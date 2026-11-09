import { api } from '../lib/axios';
import type { AdminStats, UserStats, ActivityItem, AdminUser,CreateUserPayload, PaginatedUsers, Role, UpcomingMeeting,Organization, PaginatedSubjects, SubjectPayload, SubjectRecord, PaginatedAccessLogs, PaginatedOrganizations, OrganizationPayload, PaginatedBackups} from '../types/admin';

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

  async resetPassword(id: number, new_password?: string): Promise<{ message: string; email_status: 'sent' | 'failed' }> {
    const { data } = await api.post(`/admin/users/${id}/reset-password`, new_password ? {
      new_password,
      new_password_confirmation: new_password,
    } : {});
    return data;
  },

  async resendCredentials(id: number): Promise<void> {
    await api.post(`/admin/users/${id}/resend-credentials`);
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

  async getAdminOrganizations(filters: { search?: string; status?: string; page?: number; per_page?: number } = {}): Promise<PaginatedOrganizations> {
    const { data } = await api.get<PaginatedOrganizations>('/admin/organizations', { params: filters });
    return data;
  },

  async createOrganization(payload: OrganizationPayload): Promise<Organization> {
    const { data } = await api.post<{ organization: Organization }>('/admin/organizations', payload);
    return data.organization;
  },

  async updateOrganization(id: number, payload: Partial<OrganizationPayload>): Promise<Organization> {
    const { data } = await api.put<{ organization: Organization }>(`/admin/organizations/${id}`, payload);
    return data.organization;
  },

  async deleteOrganization(id: number): Promise<void> {
    await api.delete(`/admin/organizations/${id}`);
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

  async uploadSignature(userId: number, file: File, isActive = true): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('user_id', String(userId));
    formData.append('signature', file);
    formData.append('is_active', isActive ? '1' : '0');

    const { data } = await api.post<{ message: string }>('/admin/signatures', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
  },

  async getSignatures(): Promise<Array<{
    id: number;
    user_id: number;
    user_name: string | null;
    role_name: string | null;
    mime_type: string;
    file_size: number;
    is_active: boolean;
    uploaded_at: string | null;
    uploaded_by_name: string | null;
    preview_data_uri: string | null;
  }>> {
    const { data } = await api.get<{ data: Array<{
      id: number;
      user_id: number;
      user_name: string | null;
      role_name: string | null;
      mime_type: string;
      file_size: number;
      is_active: boolean;
      uploaded_at: string | null;
      uploaded_by_name: string | null;
      preview_data_uri: string | null;
    }> }>('/admin/signatures');

    return data.data;
  },

  async deleteSignature(signatureId: number): Promise<void> {
    await api.delete(`/admin/signatures/${signatureId}`);
  },

  async getBackups(page = 1): Promise<PaginatedBackups> {
    const { data } = await api.get<PaginatedBackups>('/admin/backups', { params: { page } });
    return data;
  },

  async createBackup(type: 'database' | 'files' | 'full' = 'full', retention_days?: number): Promise<void> {
    await api.post('/admin/backups', { type, retention_days });
  },

  async downloadBackup(backupId: number): Promise<Blob> {
    const { data } = await api.get(`/admin/backups/${backupId}/download`, {
      responseType: 'blob',
    });

    return data;
  },

  async deleteBackup(backupId: number): Promise<void> {
    await api.delete(`/admin/backups/${backupId}`);
  },

  async restoreBackup(backupId: number, password: string): Promise<void> {
    await api.post(`/admin/backups/${backupId}/restore`, {
      confirmation: 'RESTORE',
      password,
    });
  },
};
