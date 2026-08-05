import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, FileSearch, RefreshCw } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import PreviewModal from '../components/Letters/PreviewModal';
import RecordFilters from '../components/DepartmentHead/RecordFilters';
import { emptyRecordFilters } from '../components/DepartmentHead/recordFilterValues';
import RecordPagination from '../components/DepartmentHead/RecordPagination';
import { departmentHeadRecordService } from '../services/departmentHeadRecordService';
import type { LetterStatus } from '../types/letter';
import type { DepartmentHeadLetter, DepartmentOfficer } from '../types/departmentHeadRecords';

const STATUS_STYLES: Record<LetterStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  dispatched: 'bg-blue-50 text-blue-700',
};

const initialFilters = emptyRecordFilters;

export default function DeptHeadLettersPage() {
  const [letters, setLetters] = useState<DepartmentHeadLetter[]>([]);
  const [officers, setOfficers] = useState<DepartmentOfficer[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ letterId: number; html: string } | null>(null);
  const [previewingId, setPreviewingId] = useState<number | null>(null);

  const loadLetters = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await departmentHeadRecordService.getLetters({
        search: appliedFilters.search.trim() || undefined,
        officer_id: appliedFilters.officerId ? Number(appliedFilters.officerId) : undefined,
        status: appliedFilters.status || undefined,
        date_from: appliedFilters.dateFrom || undefined,
        date_to: appliedFilters.dateTo || undefined,
        page,
        per_page: 10,
      });
      setLetters(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : null;
      setError(message || 'Unable to load meeting letters. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, page]);

  useEffect(() => {
    departmentHeadRecordService.getOfficers()
      .then(setOfficers)
      .catch(() => setError('Unable to load the officer filter.'));
  }, []);

  useEffect(() => {
    // The request updates loading and result state after the route/filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLetters();
  }, [loadLetters]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(1);
  };

  const openPreview = async (letterId: number) => {
    setPreviewingId(letterId);
    setError('');
    try {
      const html = await departmentHeadRecordService.previewLetter(letterId);
      setPreview({ letterId, html });
    } catch {
      setError('Unable to open the meeting letter preview.');
    } finally {
      setPreviewingId(null);
    }
  };

  return (
    <DashboardLayout pageTitle="Meeting Letters">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meeting Letters</h1>
          <p className="mt-1 text-sm text-slate-500">View all meeting letters or narrow the list to a particular officer.</p>
        </div>

        <RecordFilters values={filters} officers={officers} statuses={[{ value: 'draft', label: 'Draft' }, { value: 'pending_approval', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'dispatched', label: 'Dispatched' }]} searchPlaceholder="Title, subject, or meeting code" onChange={setFilters} onApply={applyFilters} onReset={resetFilters} />

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <p className="text-sm font-semibold text-slate-800">{total} letter{total === 1 ? '' : 's'}</p>
            <button onClick={loadLetters} disabled={isLoading} className="flex items-center gap-2 text-sm font-medium text-blue-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Subject Code</th><th className="px-5 py-3">Meeting</th><th className="px-5 py-3">Officer</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading meeting letters...</td></tr> : letters.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><FileSearch className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-slate-500">No meeting letters match these filters.</p></td></tr> : letters.map((letter) => (
                  <tr key={letter.letter_id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><span className="rounded-md bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-800">{letter.subject?.code || letter.meeting_code || '—'}</span></td>
                    <td className="px-5 py-4 text-slate-600">{letter.meeting?.title || 'Not linked'}</td>
                    <td className="px-5 py-4"><p className="font-medium text-slate-700">{letter.creator?.full_name || 'Unknown'}</p><p className="text-xs text-slate-400">{letter.creator?.organization?.organization_name || letter.creator?.designation || '—'}</p></td>
                    <td className="px-5 py-4 text-slate-600">{letter.created_at ? new Date(letter.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[letter.status]}`}>{letter.status.replace('_', ' ')}</span></td>
                    <td className="px-5 py-4 text-right"><button onClick={() => openPreview(letter.letter_id)} disabled={previewingId === letter.letter_id} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Eye className="h-3.5 w-3.5" />{previewingId === letter.letter_id ? 'Opening...' : 'View'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <RecordPagination page={page} lastPage={lastPage} disabled={isLoading} onPageChange={setPage} />
        </section>
      </div>

      {preview && <PreviewModal html={preview.html} letterId={preview.letterId} onDownloadPdf={() => departmentHeadRecordService.downloadLetterPdf(preview.letterId)} onDownloadDocx={() => departmentHeadRecordService.downloadLetterDocx(preview.letterId)} onClose={() => setPreview(null)} />}
    </DashboardLayout>
  );
}
