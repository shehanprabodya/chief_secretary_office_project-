import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, Bell, BarChart3, TrendingUp,
  Plus, UserPlus, History
} from 'lucide-react';
import AdminLayout from '../components/layouts/AdminLayout';
import { adminService } from '../services/adminService';
import type { AdminStats, ActivityItem, UpcomingMeeting } from '../types/admin';
import { useAuth } from '../context/AuthContext';

// KPI card color config matching screenshot exactly
type KPICard = {
  key: keyof AdminStats;
  label: string;
  icon: React.ComponentType<any>;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  sub: (stats: AdminStats) => JSX.Element;
};

const KPI_CARDS: KPICard[] = [
  {
    key: 'total_users',
    label: 'Total Users',
    icon: Users,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-t-blue-500',
    sub: (stats: AdminStats) => (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <TrendingUp className="h-3 w-3" />
        +{stats.user_growth_percent}% this month
      </span>
    ),
  },
  {
    key: 'total_meetings',
    label: 'Total Meetings',
    icon: Calendar,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    borderColor: 'border-t-orange-400',
    sub: () => <span className="text-xs text-slate-400">Scheduled for Oct '24</span>,
  },
  {
    key: 'pending_approvals',
    label: 'Pending Approvals',
    icon: Bell,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    borderColor: 'border-t-red-500',
    sub: () => <span className="text-xs text-red-500">Urgent attention required</span>,
  },
  {
    key: 'avg_attendance',
    label: 'Avg Attendance',
    icon: BarChart3,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-500',
    borderColor: 'border-t-teal-500',
    sub: () => <span className="text-xs text-teal-600">✓ Stability: High</span>,
  },
];

const MEETING_STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  draft: 'bg-slate-100 text-slate-600',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

const ACTIVITY_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  red: 'bg-red-100 text-red-700',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    adminService.getStats().then(setStats);
    adminService.getUpcomingMeetings().then(setMeetings);
    adminService.getRecentActivity().then(setActivity);
  }, []);

  return (
    <AdminLayout pageTitle="Admin Dashboard">
      <div className="flex flex-col gap-6">
        {/* Welcome header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome, <span className="text-[var(--color-primary)]">{user?.full_name ?? 'Admin'}</span>
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/meetings')}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New Meeting
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 rounded-lg border-2 border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-blue-50"
            >
              <UserPlus className="h-4 w-4" /> Add User
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CARDS.map((card) => {
            const Icon = card.icon;
            const value = stats ? stats[card.key] : '—';

            return (
              <div
                key={card.key}
                className={`rounded-xl border border-t-4 bg-white p-5 shadow-sm ${card.borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.label}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      {card.key === 'avg_attendance' ? `${value}%` : (value?.toLocaleString() ?? '—')}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2 ${card.iconBg}`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
                <div className="mt-3">{stats && card.sub(stats)}</div>
              </div>
            );
          })}
        </div>

        {/* Meetings + Activity */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Upcoming Meetings Calendar */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Upcoming Meetings Calendar</h2>
              <button
                onClick={() => navigate('/meetings')}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View All
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Meeting Title</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meetings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                      No upcoming meetings
                    </td>
                  </tr>
                ) : (
                  meetings.map((m) => (
                    <tr key={m.meeting_id} className="hover:bg-slate-50">
                      <td className="py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(m.meeting_date).toLocaleDateString('en-US', {
                            month: 'short', day: '2-digit', year: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-slate-400">{m.start_time?.slice(0, 5)} AM</p>
                      </td>
                      <td className="py-4 text-sm font-medium text-slate-800">{m.title}</td>
                      <td className="py-4 text-sm text-slate-500">
                        {m.location ?? (m.location_type === 'virtual' ? 'Online (Zoom)' : 'Not assigned')}
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${MEETING_STATUS_BADGE[m.status]}`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
              <History className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              {activity.length === 0 ? (
                <p className="text-sm text-slate-400">No recent activity</p>
              ) : (
                activity.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm ${ACTIVITY_COLORS[item.color]}`}>
                      {item.type === 'user_registered' ? '👤'
                        : item.type === 'approval' ? '💬'
                        : item.type === 'meeting' ? '📧'
                        : '⚠️'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{timeAgo(item.time)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}