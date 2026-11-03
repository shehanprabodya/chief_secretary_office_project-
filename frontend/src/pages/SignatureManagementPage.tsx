import { useEffect, useState } from 'react';
import { ImageUp, UploadCloud, UserCircle2, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { adminService } from '../services/adminService';
import type { AdminUser } from '../types/admin';

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };

function errorMessage(error: unknown, fallback: string) {
  const data = (error as ApiError).response?.data;
  const validationMessage = data?.errors ? Object.values(data.errors).flat()[0] : null;
  return validationMessage || data?.message || fallback;
}

export default function SignatureManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [signatureRecords, setSignatureRecords] = useState<Array<{
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
  }>>([]);
  const [signatureToDelete, setSignatureToDelete] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadRecords = async () => {
    try {
      const records = await adminService.getSignatures();
      setSignatureRecords(records);
    } catch {
      setMessage({ type: 'error', text: 'Unable to load uploaded signatures.' });
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const result = await adminService.getUsers({ page: 1, per_page: 200 });
        const validSignatoryUsers = result.data.filter((user) =>
          ['chief_secretary', 'deputy'].includes(user.role?.role_name ?? ''),
        );

        setUsers(validSignatoryUsers);
        if (validSignatoryUsers.length > 0) {
          setSelectedUserId(validSignatoryUsers[0].user_id);
        }
      } catch {
        setMessage({ type: 'error', text: 'Unable to load users for signature setup.' });
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
    void loadRecords();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedUserId || !file) {
      setMessage({ type: 'error', text: 'Please select a user and choose a signature image.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      await adminService.uploadSignature(Number(selectedUserId), file, true);
      setMessage({ type: 'success', text: 'Signature uploaded successfully.' });
      setFile(null);
      const input = document.getElementById('signature-upload') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadRecords();
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Unable to upload the official signature.') });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (signatureToDelete === null) return;

    setIsDeleting(true);
    try {
      await adminService.deleteSignature(signatureToDelete);
      setMessage({ type: 'success', text: 'Signature deleted successfully.' });
      setSignatureToDelete(null);
      await loadRecords();
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Unable to delete the signature.') });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Signature Upload">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Official Signature Upload</h1>
          <p className="text-sm text-slate-500">Upload the valid signature image for an official signatory. This is used for approved document signing and PDF output.</p>
        </div>

        {message && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <ImageUp className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upload Signature</h2>
                <p className="text-sm text-slate-500">PNG, JPG, or WEBP only</p>
              </div>
            </div>

            <div className="space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Select staff member
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={isLoading || users.length === 0}
                >
                  {users.length === 0 ? (
                    <option value="">No users available</option>
                  ) : (
                    users.map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.full_name} — {user.role.role_name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Signature image
                <div className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50">
                  <input
                    id="signature-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                  <label htmlFor="signature-upload" className="flex cursor-pointer flex-col items-center gap-2 text-sm text-slate-600">
                    <UploadCloud className="h-8 w-8 text-blue-600" />
                    <span>{file ? file.name : 'Choose a signature file'}</span>
                  </label>
                </div>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isUploading || isLoading || !selectedUserId || !file}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Signature'}
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-slate-200 p-3 text-slate-700">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Policy</h3>
            </div>

            <ul className="space-y-3 text-sm text-slate-600">
              <li>• Only administrators may upload official signatures.</li>
              <li>• The uploaded signature is stored securely and linked to the selected employee.</li>
              <li>• Only the actual signer’s registered signature is used in generated PDFs.</li>
              <li>• Deputies may sign only when the Chief Secretary has granted a valid delegation.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Uploaded Signature Records</h2>
              <p className="text-sm text-slate-500">View, manage, and remove stored signature images.</p>
            </div>
          </div>

          {signatureRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No signature records have been uploaded yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {signatureRecords.map((record) => (
                <div key={record.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{record.user_name ?? 'Unknown user'}</p>
                      <p className="text-xs text-slate-500">{record.role_name ?? 'Role not set'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${record.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>
                      {record.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {record.preview_data_uri ? (
                    <img src={record.preview_data_uri} alt={`${record.user_name ?? 'Signature'} preview`} className="h-24 w-full rounded-lg border border-slate-200 bg-white object-contain p-2" />
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">
                      No image preview
                    </div>
                  )}

                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <p>Uploaded: {record.uploaded_at ? new Date(record.uploaded_at).toLocaleString() : '—'}</p>
                    <p>File size: {record.file_size ? `${Math.max(1, Math.round(record.file_size / 1024))} KB` : '—'}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSignatureToDelete(record.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={signatureToDelete !== null}
        title="Delete signature?"
        message="This will remove the uploaded signature image from storage and the admin record list."
        confirmLabel="Delete Signature"
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setSignatureToDelete(null)}
      />
    </DashboardLayout>
  );
}
