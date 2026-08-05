import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CheckCircle2, ClipboardList, Eye, RefreshCw, X } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import RecordFilters from '../components/DepartmentHead/RecordFilters';
import { emptyRecordFilters } from '../components/DepartmentHead/recordFilterValues';
import RecordPagination from '../components/DepartmentHead/RecordPagination';
import { departmentHeadRecordService } from '../services/departmentHeadRecordService';
import type { MeetingMinute } from '../types/minute';
import type { Meeting } from '../types/meeting';
import type { DepartmentHeadMinute, DepartmentOfficer } from '../types/departmentHeadRecords';

const initialFilters = emptyRecordFilters;
const statusStyle: Record<DepartmentHeadMinute['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
};
type MinuteDetail = MeetingMinute & { meeting: Meeting };

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
  const [detail, setDetail] = useState<MinuteDetail | null>(null);
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

  const openDetail = async (minuteId: number) => {
    setOpeningId(minuteId);
    setError('');
    try {
      setDetail(await departmentHeadRecordService.getMinute(minuteId));
    } catch {
      setError('Unable to open these meeting minutes.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <DashboardLayout pageTitle="Meeting Minutes">
      <div className="space-y-8">
        <div><h1 className="text-2xl font-bold text-slate-900">Meeting Minutes</h1><p className="mt-1 text-sm text-slate-500">Review discussion summaries, decisions, and action items recorded by all officers.</p></div>

        <RecordFilters values={filters} officers={officers} statuses={[{ value: 'draft', label: 'Draft' }, { value: 'pending_approval', label: 'Pending approval' }, { value: 'approved', label: 'Approved' }]} searchPlaceholder="Meeting, code, or discussion" onChange={setFilters} onApply={() => { setPage(1); setApplied(filters); }} onReset={() => { setFilters(initialFilters); setApplied(initialFilters); setPage(1); }} />

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6"><p className="text-sm font-semibold text-slate-800">{total} minute record{total === 1 ? '' : 's'}</p><button onClick={loadMinutes} disabled={isLoading} className="flex items-center gap-2 text-sm font-medium text-blue-700"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</button></div>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Meeting</th><th className="px-5 py-3">Officer</th><th className="px-5 py-3">Summary</th><th className="px-5 py-3">Contents</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{isLoading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading meeting minutes...</td></tr> : minutes.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-slate-500">No meeting minutes match these filters.</p></td></tr> : minutes.map((minute) => <tr key={minute.minute_id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4"><p className="font-semibold text-slate-900">{minute.meeting?.title || 'Unknown meeting'}</p><p className="mt-1 text-xs text-slate-400">{minute.meeting?.meeting_code || `Meeting #${minute.meeting_id}`} {minute.meeting?.meeting_date ? `· ${new Date(minute.meeting.meeting_date).toLocaleDateString()}` : ''}</p></td>
              <td className="px-5 py-4"><p className="font-medium text-slate-700">{minute.creator?.full_name || 'Unknown'}</p><p className="text-xs text-slate-400">{minute.creator?.organization?.organization_name || '—'}</p></td>
              <td className="max-w-sm px-5 py-4 text-slate-600"><p className="line-clamp-2">{minute.discussion_summary || 'No discussion summary provided.'}</p></td>
              <td className="px-5 py-4 text-xs text-slate-600">{minute.decisions_count} decision{minute.decisions_count === 1 ? '' : 's'} · {minute.action_items_count} action item{minute.action_items_count === 1 ? '' : 's'}</td>
              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[minute.status]}`}>{minute.status.replace('_', ' ')}</span></td>
              <td className="px-5 py-4 text-right"><button onClick={() => openDetail(minute.minute_id)} disabled={openingId === minute.minute_id} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40"><Eye className="h-3.5 w-3.5" />{openingId === minute.minute_id ? 'Opening...' : 'View'}</button></td>
            </tr>)}</tbody></table></div>
          <RecordPagination page={page} lastPage={lastPage} disabled={isLoading} onPageChange={setPage} />
        </section>
      </div>

      {detail && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="Close minutes" className="absolute inset-0 bg-black/60" onClick={() => setDetail(null)} /><div className="relative z-10 max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-4"><div><h2 className="text-xl font-bold text-slate-900">{detail.meeting.title}</h2><p className="mt-1 text-sm text-slate-500">Read-only meeting minutes</p></div><button onClick={() => setDetail(null)} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="space-y-6 p-6">
        <div className="grid gap-3 sm:grid-cols-3">{[{ icon: CalendarDays, label: 'Meeting date', value: new Date(detail.meeting.meeting_date).toLocaleDateString() }, { icon: ClipboardList, label: 'Decisions', value: detail.decisions.length }, { icon: CheckCircle2, label: 'Action items', value: detail.action_items.length }].map((item) => <div key={item.label} className="flex items-center gap-3 rounded-lg border bg-slate-50 p-4"><item.icon className="h-5 w-5 text-blue-700" /><div><p className="text-xs uppercase text-slate-400">{item.label}</p><p className="font-semibold text-slate-800">{item.value}</p></div></div>)}</div>
        <section><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Discussion Summary</h3><p className="mt-3 whitespace-pre-line rounded-lg border bg-slate-50 p-4 text-sm leading-7 text-slate-700">{detail.discussion_summary || 'No discussion summary provided.'}</p></section>
        <section><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Formal Decisions</h3><div className="mt-3 space-y-2">{detail.decisions.length ? detail.decisions.map((decision) => <div key={decision.decision_id} className="flex gap-3 rounded-lg border p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{decision.decision_order}</span><p className="text-sm leading-6 text-slate-700">{decision.decision_text}</p></div>) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No decisions recorded.</p>}</div></section>
        <section><h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Action Items</h3><div className="mt-3 overflow-hidden rounded-lg border"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Responsible officer</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{detail.action_items.length ? detail.action_items.map((item) => <tr key={item.action_item_id}><td className="px-4 py-3 text-slate-700">{item.task_description}</td><td className="px-4 py-3 text-slate-600">{item.responsible_officer?.full_name || 'Unassigned'}</td><td className="px-4 py-3 text-slate-600">{item.deadline ? new Date(item.deadline).toLocaleDateString() : '—'}</td><td className="px-4 py-3 capitalize text-slate-600">{item.status.replace('_', ' ')}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No action items recorded.</td></tr>}</tbody></table></div></section>
      </div></div></div>}
    </DashboardLayout>
  );
}
