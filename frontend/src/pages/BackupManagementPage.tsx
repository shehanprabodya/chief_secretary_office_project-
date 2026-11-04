import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { adminService } from '../services/adminService';
import type { BackupArchiveRecord } from '../types/admin';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';

export default function BackupManagementPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<BackupArchiveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getBackups(1);
      setItems(data.data);
    } catch {
      setError(t('backup.unableLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const createBackup = async () => {
    setError(null);
    try {
      await adminService.createBackup('full');
      await load();
    } catch (cause) {
      const message = isAxiosError(cause)
        ? (cause.response?.data?.message ?? t('backup.unableCreate'))
        : t('backup.unableCreate');
      setError(message);
    }
  };

  const downloadBackup = async (backup: BackupArchiveRecord) => {
    const blob = await adminService.downloadBackup(backup.backup_id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backup.storage_path.split('/').pop() ?? `backup-${backup.backup_id}.enc`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const deleteBackup = async (backupId: number) => {
    setError(null);
    try {
      await adminService.deleteBackup(backupId);
      await load();
    } catch (cause) {
      const message = isAxiosError(cause)
        ? (cause.response?.data?.message ?? t('backup.unableDelete'))
        : t('backup.unableDelete');
      setError(message);
    }
  };

  const restoreBackup = async (backupId: number) => {
    const password = window.prompt(t('backup.restorePrompt'));
    if (!password) {
      return;
    }

    setError(null);
    try {
      await adminService.restoreBackup(backupId, password);
      await load();
    } catch (cause) {
      const message = isAxiosError(cause)
        ? (cause.response?.data?.message ?? t('backup.unableRestore'))
        : t('backup.unableRestore');
      setError(message);
    }
  };

  const backupTypeLabel = (type: string) => {
    if (type === 'database') return t('backup.typeDatabase');
    if (type === 'files') return t('backup.typeFiles');
    return t('backup.typeFull');
  };

  const backupStatusLabel = (status: string) => {
    if (status === 'restored') return t('backup.statusRestored');
    if (status === 'deleted') return t('backup.statusDeleted');
    return t('backup.statusAvailable');
  };

  return (
    <DashboardLayout pageTitle={t('backup.title')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('backup.title')}</h1>
            <p className="text-sm text-slate-500">{t('backup.description')}</p>
          </div>
          <button onClick={() => void createBackup()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            {t('backup.create')}
          </button>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('backup.id')}</th>
                <th className="px-4 py-3">{t('backup.type')}</th>
                <th className="px-4 py-3">{t('backup.created')}</th>
                <th className="px-4 py-3">{t('backup.status')}</th>
                <th className="px-4 py-3">{t('backup.retention')}</th>
                <th className="px-4 py-3 text-right">{t('backup.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={6}>{t('backup.loading')}</td></tr>
              ) : items.length === 0 ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={6}>{t('backup.noneAvailable')}</td></tr>
              ) : (
                items.map((backup) => (
                  <tr key={backup.backup_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">#{backup.backup_id}</td>
                    <td className="px-4 py-3">{backupTypeLabel(backup.type)}</td>
                    <td className="px-4 py-3">{new Date(backup.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{backupStatusLabel(backup.status)}</td>
                    <td className="px-4 py-3">{backup.retention_until ? new Date(backup.retention_until).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => void downloadBackup(backup)} className="rounded border px-2 py-1">{t('backup.download')}</button>
                        <button onClick={() => void restoreBackup(backup.backup_id)} className="rounded border px-2 py-1">{t('backup.restore')}</button>
                        <button onClick={() => void deleteBackup(backup.backup_id)} className="rounded border border-red-200 px-2 py-1 text-red-600">{t('backup.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
