import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { AdminUser, CreateUserPayload, Role,Organization } from '../../types/admin';

interface AddUserModalProps {
  editUser?: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}



export default function AddUserModal({ editUser, onClose, onSaved }: AddUserModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  
 

  const [form, setForm] = useState<CreateUserPayload>({
    full_name: editUser?.full_name ?? '',
    email: editUser?.email ?? '',
    username: editUser?.username ?? '',
    password: '',
    role_id: editUser?.role.role_id ?? 0,
    designation: editUser?.designation ?? '',
    organization_id: editUser?.organization?.organization_id ?? null,
    status: editUser?.status ?? 'ACTIVE',
  });

  useEffect(() => {
    adminService.getRoles().then(setRoles);
    adminService.getOrganizations().then(setOrganizations);
}, []);

  const handleChange = (field: keyof CreateUserPayload, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.username || !form.role_id ||  !form.organization_id) {
      setError('Please fill in all required fields');
      return;
    }
    if (!editUser && !form.password) {
      setError('Password is required for new users');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editUser) {
        const updatePayload = { ...form } as any;
        delete updatePayload.password;
        await adminService.updateUser(editUser.user_id, updatePayload);
      } else {
        await adminService.createUser(form);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const errWithResponse = err as { response?: { data?: { message?: string } } };
      const messageFromResponse = errWithResponse?.response?.data?.message;
      const fallbackMessage = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(messageFromResponse ?? fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 hover:bg-slate-100">
          <X className="h-5 w-5 text-slate-500" />
        </button>

        <h2 className="text-xl font-bold text-slate-900">
          {editUser ? 'Edit User' : 'Add New User'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {editUser ? 'Update user details and permissions.' : 'Create a new system user account.'}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="Enter full name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="user@southern.gov.lk"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Username *</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="user.name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {!editUser && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Role *</label>
              <select
                value={form.role_id}
                onChange={(e) => handleChange('role_id', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value={0} disabled>Select role...</option>
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>
                    {r.role_name.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Designation </label>

                <input
                type="text"
                value={form.designation ?? ''}
                onChange={(e)=>handleChange('designation',e.target.value)}
                placeholder="Assistant Secretary"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                />
            </div>   
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Organization</label>

              <select
                value={form.organization_id ?? ''}
                onChange={(e)=>
                  handleChange(
                    'organization_id',
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">
                  Select Organization
                </option>

                {organizations.map((org)=>(
                  <option
                    key={org.organization_id}
                    value={org.organization_id}
                  >
                    {org.organization_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}