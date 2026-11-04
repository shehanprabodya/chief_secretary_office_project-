import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ClipboardList, Download, Eye, RefreshCw, X } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import RecordFilters from '../components/DepartmentHead/RecordFilters';
import { emptyRecordFilters } from '../components/DepartmentHead/recordFilterValues';
import RecordPagination from '../components/DepartmentHead/RecordPagination';
import { departmentHeadRecordService } from '../services/departmentHeadRecordService';
import { minuteService } from '../services/minuteService';
import type { DepartmentHeadMinute, DepartmentOfficer } from '../types/departmentHeadRecords';

const initialFilters = emptyRecordFilters;
const statusStyle: Record<DepartmentHeadMinute['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
};
export default function DeptHeadMinutesPage() {
  const [minutes, setMinutes] = useState<DepartmentHeadMinute[]>([]);
  const [officers, setOfficers] = useState<DepartmentOfficer[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewTitle, setPreviewTitle] = useState('Meeting Minutes Preview');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewMinuteId, setPreviewMinuteId] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const loadMinutes = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await departmentHeadRecordService.getMinutes({
        search: applied.search.trim() || undefined,
        officer_id: applied.officerId ? Number(applied.officerId) : undefined,
        status: applied.status || undefined,
        date_from: applied.dateFrom || undefined,
        date_to: applied.dateTo || undefined,
        page,
        per_page: 10,
      });
      setMinutes(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (requestError) {
      setError(axios.isAxiosError(requestError) ? requestError.response?.data?.message || 'Unable to load meeting minutes.' : 'Unable to load meeting minutes.');
    } finally {
      setIsLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    departmentHeadRecordService.getOfficers().then(setOfficers).catch(() => setError('Unable to load the officer filter.'));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMinutes();
  }, [loadMinutes]);

  const openDetail = async (minuteId: number, title?: string | null) => {
    setOpeningId(minuteId);
    setError('');
    try {
      const blob = await minuteService.downloadPdf(minuteId);
      const url = URL.createObjectURL(blob);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
      setPreviewMinuteId(minuteId);
      setPreviewTitle(title?.trim() || 'Meeting Minutes Preview');
    } catch {
      setError('Unable to open these meeting minutes.');
    } finally {
      setOpeningId(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewMinuteId(null);
  };

  return (
    <DashboardLayout pageTitle="Meeting Minutes">
      <div className="space-y-8">
        <div><h1 className="text-2xl font-bold text-slate-900">Meeting Minutes</h1><p className="mt-1 text-sm text-slate-500">Review discussion summaries, decisions, and action items recorded by all officers.</p></div>

        <RecordFilters values={filters} officers={officers} statuses={[{ value: 'draft', label: 'Draft' }, { value: 'pending_approval', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }]} searchPlaceholder="Meeting, code, or discussion" onChange={setFilters} onApply={() => { setPage(1); setApplied(filters); }} onReset={() => { setFilters(initialFilters); setApplied(initialFilters); setPage(1); }} />

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><p className="text-sm font-semibold text-slate-800">{total} minute record{total === 1 ? '' : 's'}</p><button onClick={loadMinutes} disabled={isLoading} className="flex items-center gap-2 text-sm font-medium text-blue-700"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</button></div>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Meeting</th><th className="px-5 py-3">Officer</th><th className="px-5 py-3">Welcome and purpose</th><th className="px-5 py-3">Contents</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{isLoading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading meeting minutes...</td></tr> : minutes.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-slate-500">No meeting minutes match these filters.</p></td></tr> : minutes.map((minute) => <tr key={minute.minute_id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4"><p className="font-semibold text-slate-900">{minute.meeting?.title || 'Unknown meeting'}</p><p className="mt-1 text-xs text-slate-400">{minute.meeting?.meeting_code || `Meeting #${minute.meeting_id}`} {minute.meeting?.meeting_date ? `· ${new Date(minute.meeting.meeting_date).toLocaleDateString()}` : ''}</p></td>
              <td className="px-5 py-4"><p className="font-medium text-slate-700">{minute.creator?.full_name || 'Unknown'}</p><p className="text-xs text-slate-400">{minute.creator?.organization?.organization_name || '—'}</p></td>
              <td className="max-w-sm px-5 py-4 text-slate-600"><p className="line-clamp-2">{minute.discussion_summary || 'No discussion summary provided.'}</p></td>
              <td className="px-5 py-4 text-xs text-slate-600">{minute.decisions_count} decision{minute.decisions_count === 1 ? '' : 's'}</td>
              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[minute.status]}`}>{minute.status.replace('_', ' ')}</span></td>
              <td className="px-5 py-4 text-right"><button onClick={() => openDetail(minute.minute_id, minute.meeting?.title)} disabled={openingId === minute.minute_id} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40"><Eye className="h-3.5 w-3.5" />{openingId === minute.minute_id ? 'Opening...' : 'View'}</button></td>
            </tr>)}</tbody></table></div>
          <RecordPagination page={page} lastPage={lastPage} disabled={isLoading} onPageChange={setPage} />
        </section>
      </div>

      {previewUrl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 className="text-lg font-bold text-slate-900">{previewTitle}</h2><p className="text-sm text-slate-500">Officer minute document preview</p></div><button type="button" onClick={closePreview} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" />Close</button></div><div className="flex-1 overflow-hidden bg-slate-100 p-2"><iframe src={previewUrl} title="Meeting Minutes Preview" className="h-full w-full rounded-xl border-0 bg-white" /></div><div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3"><button type="button" onClick={() => { if (!previewUrl || !previewMinuteId) return; const link = document.createElement('a'); link.href = previewUrl; link.download = `minutes-${previewMinuteId}.pdf`; document.body.appendChild(link); link.click(); link.remove(); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"><Download className="h-4 w-4" />Download</button></div></div></div>}
    </DashboardLayout>
  );
}
