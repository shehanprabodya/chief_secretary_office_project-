import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { Organization, OrganizationPayload } from '../../types/admin';

interface OrganizationModalProps {
  organization?: Organization | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function OrganizationModal({ organization, onClose, onSaved }: OrganizationModalProps) {
  const [form, setForm] = useState<OrganizationPayload>({
    organization_name: organization?.organization_name ?? '',
    abbreviation: organization?.abbreviation ?? '',
    address: organization?.address ?? '',
    telephone: organization?.telephone ?? '',
    email: organization?.email ?? '',
    status: organization?.status ?? 'ACTIVE',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof OrganizationPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.organization_name.trim()) {
      setError('Organization name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: OrganizationPayload = {
        ...form,
        organization_name: form.organization_name.trim(),
        abbreviation: form.abbreviation?.trim() || null,
        address: form.address?.trim() || null,
        telephone: form.telephone?.trim() || null,
        email: form.email?.trim() || null,
        status: form.status ?? 'ACTIVE',
      };

      if (organization) {
        await adminService.updateOrganization(organization.organization_id, payload);
      } else {
        await adminService.createOrganization(payload);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save organization.';
      const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(apiMessage ?? message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 hover:bg-slate-100">
          <X className="h-5 w-5 text-slate-500" />
        </button>

        <h2 className="text-xl font-bold text-slate-900">
          {organization ? 'Edit Organization' : 'Add New Organization'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {organization ? 'Update the selected organization details.' : 'Create a new organization in the system.'}
        </p>

        {error && (
          <div className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Organization Name *</label>
              <input
                type="text"
                value={form.organization_name}
                onChange={(event) => handleChange('organization_name', event.target.value)}
                placeholder="Ministry of Education"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Abbreviation</label>
              <input
                type="text"
                value={form.abbreviation ?? ''}
                onChange={(event) => handleChange('abbreviation', event.target.value)}
                placeholder="MOE"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.status ?? 'ACTIVE'}
                onChange={(event) => handleChange('status', event.target.value as 'ACTIVE' | 'INACTIVE')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
              <input
                type="text"
                value={form.address ?? ''}
                onChange={(event) => handleChange('address', event.target.value)}
                placeholder="No. 10, Colombo 07"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Telephone</label>
              <input
                type="text"
                value={form.telephone ?? ''}
                onChange={(event) => handleChange('telephone', event.target.value)}
                placeholder="0112345678"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(event) => handleChange('email', event.target.value)}
                placeholder="info@organization.gov.lk"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
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
              {isSaving ? 'Saving...' : organization ? 'Update Organization' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
