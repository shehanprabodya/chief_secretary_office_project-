import type { UserRole } from '../types/auth';

export const ROLE_DASHBOARD_PATH: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  officer: '/dashboard/officer',
  dept_head: '/dashboard/dept-head',
  deputy: '/dashboard/deputy',
  chief_secretary: '/dashboard/chief-secretary',
};

export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATH[role] ?? '/dashboard/officer';
}