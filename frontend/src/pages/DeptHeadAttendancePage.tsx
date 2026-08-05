import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, RefreshCw, Search, Users, X } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { departmentHeadRecordService } from '../services/departmentHeadRecordService';
import type { AttendanceSheet, AttendanceStatus } from '../types/attendance';
import type { DepartmentHeadAttendanceSheet, DepartmentOfficer } from '../types/departmentHeadRecords';

const initialFilters = { search: '', officerId: '', status: '', dateFrom: '', dateTo: '' };
const statusStyle: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-50 text-emerald-700',
  absent: 'bg-red-50 text-red-700',
  excused: 'bg-amber-50 text-amber-700',
};

export default function DeptHeadAttendancePage() {
  const [records, setRecords] = useState<DepartmentHeadAttendanceSheet[]>([]);
  const [officers, setOfficers] = useState<DepartmentOfficer[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AttendanceSheet | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await departmentHeadRecordService.getAttendance({
        search: applied.search.trim() || undefined,
        officer_id: applied.officerId ? Number(applied.officerId) : undefined,
        status: applied.status || undefined,
        date_from: applied.dateFrom || undefined,
        date_to: applied.dateTo || undefined,
        page,
        per_page: 10,
      });
      setRecords(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (requestError) {
      setError(axios.isAxiosError(requestError) ? requestError.response?.data?.message || 'Unable to load attendance records.' : 'Unable to load attendance records.');
    } finally {
      setIsLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    departmentHeadRecordService.getOfficers().then(setOfficers).catch(() => setError('Unable to load the officer filter.'));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecords();
  }, [loadRecords]);

  const openDetail = async (record: DepartmentHeadAttendanceSheet) => {
    if (!record.meeting_id) return;
    setOpeningId(record.letter_id);
    setError('');
    try {
      setDetail(await departmentHeadRecordService.getAttendanceSheet(record.meeting_id, record.letter_id));
    } catch {
      setError('Unable to open this attendance sheet.');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <DashboardLayout pageTitle="Attendance">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Attendance Records</h1><p className="mt-1 text-sm text-slate-500">View submitted and draft attendance sheets across all officers.</p></div>

        <form onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied(filters); }} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="xl:col-span-2"><span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Search</span><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Letter, meeting, or code" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div></label>
            <label><span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Officer</span><select value={filters.officerId} onChange={(event) => setFilters({ ...filters, officerId: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All officers</option>{officers.map((officer) => <option key={officer.user_id} value={officer.user_id}>{officer.full_name}</option>)}</select></label>
            <label><span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Status</span><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option><option value="draft">Draft</option><option value="finalized">Finalized</option></select></label>
            <div className="grid grid-cols-2 gap-2"><label><span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">From</span><input type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" /></label><label><span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">To</span><input type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" /></label></div>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setFilters(initialFilters); setApplied(initialFilters); setPage(1); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600">Reset</button><button className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Apply filters</button></div>
        </form>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><p className="text-sm font-semibold text-slate-800">{total} attendance sheet{total === 1 ? '' : 's'}</p><button onClick={loadRecords} disabled={isLoading} className="flex items-center gap-2 text-sm font-medium text-blue-700"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</button></div>
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Meeting</th><th className="px-5 py-3">Officer</th><th className="px-5 py-3">Attendance</th><th className="px-5 py-3">Breakdown</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{isLoading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading attendance records...</td></tr> : records.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-slate-500">No attendance sheets match these filters.</p></td></tr> : records.map((record) => <tr key={record.letter_id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4"><p className="font-semibold text-slate-900">{record.meeting?.title || record.title || 'Untitled meeting'}</p><p className="mt-1 text-xs text-slate-400">{record.subject?.code || record.meeting_code || `Letter #${record.letter_id}`}</p></td>
              <td className="px-5 py-4"><p className="font-medium text-slate-700">{record.creator?.full_name || 'Unknown'}</p><p className="text-xs text-slate-400">{record.creator?.organization?.organization_name || '—'}</p></td>
              <td className="px-5 py-4"><p className="font-bold text-slate-900">{record.attendance_percentage}%</p><div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${record.attendance_percentage}%` }} /></div></td>
              <td className="px-5 py-4 text-xs text-slate-600"><span className="text-emerald-700">{record.present_count} present</span> · <span className="text-red-700">{record.absent_count} absent</span> · <span className="text-amber-700">{record.excused_count} excused</span></td>
              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.is_finalized ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{record.is_finalized ? 'Finalized' : 'Draft'}</span></td>
              <td className="px-5 py-4 text-right"><button onClick={() => openDetail(record)} disabled={!record.meeting_id || openingId === record.letter_id} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-40"><Eye className="h-3.5 w-3.5" />{openingId === record.letter_id ? 'Opening...' : 'View'}</button></td>
            </tr>)}</tbody></table></div>
          {lastPage > 1 && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm"><span className="text-slate-500">Page {page} of {lastPage}</span><div className="flex gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || isLoading} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button onClick={() => setPage((value) => Math.min(lastPage, value + 1))} disabled={page === lastPage || isLoading} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
        </section>
      </div>

      {detail && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="Close attendance details" className="absolute inset-0 bg-black/60" onClick={() => setDetail(null)} /><div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b px-6 py-4"><div><h2 className="text-xl font-bold text-slate-900">{detail.meeting.title}</h2><p className="mt-1 text-sm text-slate-500">{new Date(detail.meeting.meeting_date).toLocaleDateString()} · Read-only attendance</p></div><button onClick={() => setDetail(null)} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="grid grid-cols-4 gap-3 border-b bg-slate-50 p-5">{[{ label: 'Attendance', value: `${detail.statistics.attendance_percentage}%` }, { label: 'Present', value: detail.statistics.present }, { label: 'Absent', value: detail.statistics.absent }, { label: 'Excused', value: detail.statistics.excused }].map((item) => <div key={item.label} className="rounded-lg border bg-white p-3 text-center"><p className="text-2xl font-bold text-slate-900">{item.value}</p><p className="text-xs uppercase text-slate-500">{item.label}</p></div>)}</div><div className="overflow-auto"><table className="min-w-full divide-y text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Participant</th><th className="px-6 py-3">Department</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y">{detail.participants.map((participant, index) => <tr key={`${participant.participant_type}-${participant.user_id ?? participant.additional_attendee_id ?? participant.letter_recipient_id ?? index}`}><td className="px-6 py-3"><p className="font-medium text-slate-800">{participant.full_name}</p><p className="text-xs text-slate-400">{participant.email || '—'}</p></td><td className="px-6 py-3 text-slate-600">{participant.department || '—'}</td><td className="px-6 py-3 text-slate-600">{participant.role || '—'}</td><td className="px-6 py-3 capitalize text-slate-500">{participant.participant_type}</td><td className="px-6 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[participant.status]}`}>{participant.status}</span></td></tr>)}</tbody></table></div></div></div>}
    </DashboardLayout>
  );
}
