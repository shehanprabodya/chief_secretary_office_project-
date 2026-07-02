export interface AdminStats {
  total_users: number;
  user_growth_percent: number;
  total_meetings: number;
  pending_approvals: number;
  avg_attendance: number;
}

export interface UserStats {
  total_users: number;
  admins: number;
  departments: number;
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
  department: { department_id: number; department_name: string } | null;
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
  department_id?: number | null;
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