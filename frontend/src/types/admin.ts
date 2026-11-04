export interface AdminStats {
  total_users: number;
  user_growth_percent: number;
  total_meetings: number;
  pending_approvals: number;
  avg_attendance: number;
}
export interface Organization {
  organization_id: number;
  organization_name: string;
  abbreviation: string | null;
  address: string | null;
  telephone: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}
export interface UserStats {
  total_users: number;
  admins: number;
  organizations: number;
  inactive: number;
}

export interface ActivityItem {
  type: string;
  title: string;
  description: string;
  time: string;
  color: 'blue' | 'yellow' | 'indigo' | 'red';
}

export interface AdminUser {
  user_id: number;
  full_name: string;
  full_name_si?: string | null;
  email: string;
  username: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: { role_id: number; role_name: string };
  designation: string | null;
  designation_si?: string | null;
  organization: {organization_id: number;organization_name: string;abbreviation: string | null;} | null;
  created_at: string;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string | null;
  users_count?: number;
}

export interface CreateUserPayload {
  full_name: string;
  full_name_si?: string;
  email: string;
  username: string;
  password?: string;
  send_invitation?: boolean;
  locale?: 'en' | 'si';
  role_id: number;
  designation?: string;
  designation_si?: string;
  organization_id?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface BackupArchiveRecord {
  backup_id: number;
  type: 'database' | 'files' | 'full';
  storage_disk: string;
  storage_path: string;
  size_bytes: number | null;
  sha256_checksum: string;
  status: 'available' | 'restored' | 'deleted' | 'failed';
  retention_until: string | null;
  restored_at: string | null;
  created_at: string;
}

export interface PaginatedBackups {
  data: BackupArchiveRecord[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface PaginatedUsers {
  data: AdminUser[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface OrganizationPayload {
  organization_name: string;
  abbreviation?: string | null;
  address?: string | null;
  telephone?: string | null;
  email?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface PaginatedOrganizations {
  data: Organization[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface UpcomingMeeting {
  meeting_id: number;
  title: string;
  meeting_date: string;
  start_time: string | null;
  location: string | null;
  location_type: string;
  status: string;
}

export interface SubjectRecord {
  id: number;
  code: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectPayload {
  code: string;
  title: string;
  description?: string | null;
}

export interface PaginatedSubjects {
  data: SubjectRecord[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface AccessLog {
  id: number;
  token_name: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  status: 'active' | 'expired';
  user: {
    user_id: number;
    full_name: string;
    email: string;
    username: string;
    role: string | null;
    organization: string | null;
  } | null;
}

export interface PaginatedAccessLogs {
  data: AccessLog[];
  current_page: number;
  last_page: number;
  total: number;
}
