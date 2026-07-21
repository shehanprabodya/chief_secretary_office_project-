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
  email: string;
  username: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: { role_id: number; role_name: string };
  designation: string | null;
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
  email: string;
  username: string;
  password: string;
  role_id: number;
  designation?: string;
  organization_id?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface PaginatedUsers {
  data: AdminUser[];
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
