import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,  List, Grid3x3, Plus,
  Eye, Pencil, MoreVertical, RotateCcw, Trash2, MapPin, Laptop,
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import StatusBadge from '../components/shared/StatusBadge';
import { meetingService } from '../services/meetingService';
import type { Meeting } from '../types/meeting';

export default function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const fetchMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await meetingService.list({
        search: search || undefined,
        department_id: departmentId !== 'all' ? departmentId : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
      });
      setMeetings(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, departmentId, startDate, endDate, page]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this meeting?')) return;
    await meetingService.cancel(id);
    fetchMeetings();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const formatTimeRange = (meeting: Meeting) => {
    if (!meeting.start_time) return 'TBD';
    const start = meeting.start_time.slice(0, 5);
    const end = meeting.end_time?.slice(0, 5) ?? '';
    return end ? `${start} - ${end}` : start;
  };

  return (
    <DashboardLayout pageTitle="Meeting Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Meeting Management</h1>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-300 bg-white">
              <button className="flex items-center gap-2 rounded-l-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                <List className="h-4 w-4" />
                List
              </button>
              <button className="flex items-center gap-2 rounded-r-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <Grid3x3 className="h-4 w-4" />
                Calendar
              </button>
            </div>
            <button
              onClick={() => navigate('/meetings/create')}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create Meeting
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Search Meeting</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Title, ID or Signatory..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Department</label>
              <select
                value={departmentId}
                onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Departments</option>
                <option value="1">Development Division</option>
                <option value="2">Human Resources</option>
                <option value="3">Finance & Treasury</option>
                <option value="4">Office of the Chief Secretary</option>
                <option value="5">Public Health</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <span className="text-slate-400">/</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchMeetings}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Meeting Title</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading meetings...
                  </td>
                </tr>
              ) : meetings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    No meetings found.
                  </td>
                </tr>
              ) : (
                meetings.map((meeting) => (
                  <tr key={meeting.meeting_id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className={`font-semibold text-blue-700 hover:underline cursor-pointer ${meeting.status === 'cancelled' ? 'line-through text-slate-400' : ''}`}>
                        {meeting.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">ID: {meeting.reference_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <p>{formatDate(meeting.meeting_date)}</p>
                      <p className="text-xs text-slate-400">{formatTimeRange(meeting)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="flex items-center gap-1.5">
                        {meeting.location_type === 'virtual' ? (
                          <Laptop className="h-4 w-4 text-slate-400" />
                        ) : meeting.location_type === 'physical' ? (
                          <MapPin className="h-4 w-4 text-slate-400" />
                        ) : null}
                        <span className={meeting.location ? '' : 'text-slate-400'}>
                          {meeting.location ?? 'Not Assigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {meeting.department?.department_name ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={meeting.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/meetings/${meeting.meeting_id}`)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {meeting.status !== 'cancelled' && (
                          <button
                            onClick={() => navigate(`/meetings/${meeting.meeting_id}/edit`)}
                            className="rounded p-1.5 text-blue-400 hover:bg-blue-50 hover:text-blue-700"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === meeting.meeting_id ? null : meeting.meeting_id)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            {meeting.status === 'cancelled' ? <RotateCcw className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
                          </button>
                          {openMenuId === meeting.meeting_id && meeting.status !== 'cancelled' && (
                            <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                onClick={() => { handleCancel(meeting.meeting_id); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Cancel Meeting
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
            <p className="text-sm text-slate-500">
              Showing {meetings.length} of {total} meetings
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
              >
                ‹
              </button>
              {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded text-sm font-medium ${
                    p === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}