import { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, Download, Users, Shield,
  Building2, UserX, Pencil, RotateCcw, UserMinus, UserCheck, UserPlus
} from 'lucide-react';

import AddUserModal from '../components/Admin/AddUserModal';
import ResetPasswordModal from '../components/Admin/ResetPasswordModal';
import { adminService } from '../services/adminService';
import type { AdminUser, UserStats } from '../types/admin';
import DashboardLayout from '../components/layouts/DashboardLayout';

type Tab = 'users' | 'roles' | 'logs';

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-800',
  officer: 'bg-slate-100 text-slate-700',
  dept_head: 'bg-purple-100 text-purple-800',
  deputy: 'bg-teal-100 text-teal-800',
  chief_secretary: 'bg-orange-100 text-orange-800',
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-orange-500', 'bg-slate-500',
  'bg-purple-500', 'bg-teal-500', 'bg-red-500',
];

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);

  const fetchStats = () => adminService.getUserStats().then(setStats);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await adminService.getUsers({ search: search || undefined, page });
      setUsers(result.data);
      setTotal(result.total);
      setLastPage(result.last_page);
    } finally {
      setIsLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    fetchUsers();
  }, [search, page, fetchUsers]);

  const handleToggleStatus = async (user: AdminUser) => {
    const action = user.status === 'ACTIVE' ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.full_name}?`)) return;
    await adminService.toggleStatus(user.user_id);
    fetchUsers();
    fetchStats();
  };

  const handleSaved = () => {
    fetchUsers();
    fetchStats();
    setEditUser(null);
  };

  return (
    <DashboardLayout pageTitle="User & Role Management">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User & Role Management</h1>
            <p className="mt-1 text-sm text-slate-500">Manage system access and permissions</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" /> Add New User
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-200">
          {(['users', 'roles', 'logs'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'users' ? 'Users List' : tab === 'roles' ? 'Role Management' : 'Access Logs'}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <>
            {/* Stat Pills */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Total Users', value: stats?.total_users, icon: Users, color: 'text-blue-600 bg-blue-50' },
                { label: 'Admins', value: stats?.admins, icon: Shield, color: 'text-orange-600 bg-orange-50' },
                { label: 'Organizations', value: stats?.organizations, icon: Building2, color: 'text-slate-600 bg-slate-100' },
                { label: 'Inactive', value: stats?.inactive, icon: UserX, color: 'text-red-600 bg-red-50' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{s.value ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + Filter */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by name, username, email, organization or role..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Filter className="h-4 w-4" /> Filter
                </button>
                <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Download className="h-4 w-4" /> Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Organization</th>
                    <th className="px-6 py-3">Designation</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No users found</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.user_id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(u.user_id)}`}>
                              {getInitials(u.full_name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{u.full_name}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${ROLE_BADGE[u.role.role_name] ?? 'bg-slate-100 text-slate-700'}`}>
                            {u.role.role_name.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {u.organization?.organization_name ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {u.designation ?? '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex w-fit items-center gap-1.5 text-sm font-medium ${u.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`} />
                            {u.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* Edit */}
                            <button
                              onClick={() => setEditUser(u)}
                              className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50"
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {/* Reset password */}
                            <button
                              onClick={() => setResetUser(u)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                              title="Reset password"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            {/* Toggle active/inactive */}
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`rounded-lg p-1.5 ${u.status === 'ACTIVE' ? 'text-red-400 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                              title={u.status === 'ACTIVE' ? 'Deactivate user' : 'Activate user'}
                            >
                              {u.status === 'ACTIVE' ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
                <p className="text-sm text-slate-500">Showing {users.length} of {total} users</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40">‹</button>
                  {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)} className={`h-8 w-8 rounded text-sm font-medium ${p === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{p}</button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page === lastPage} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40">›</button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'roles' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Role management — view and describe system roles.</p>
            <div className="mt-4 space-y-3">
              {['admin', 'officer', 'dept_head', 'deputy', 'chief_secretary'].map((role) => (
                <div key={role} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${ROLE_BADGE[role]}`}>
                    {role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="text-sm text-slate-500">
                    {users.filter((u) => u.role.role_name === role).length} users
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-400">Select a user from the Users List tab to view their access logs.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showAddModal || editUser) && (
        <AddUserModal
          editUser={editUser}
          onClose={() => { setShowAddModal(false); setEditUser(null); }}
          onSaved={handleSaved}
        />
      )}
      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      )}
    </DashboardLayout>
  );
}