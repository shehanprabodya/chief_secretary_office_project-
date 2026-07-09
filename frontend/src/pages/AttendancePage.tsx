import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, BarChart3, Info, ArrowLeft } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { attendanceService } from '../services/attendanceService';
import type {
  AttendanceSheet,
  AttendanceStatus,
  AttendanceParticipant,
} from '../types/attendance';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; activeClasses: string; icon: string }> = {
  present: { label: 'Present', activeClasses: 'bg-white text-slate-900 border-slate-900 shadow-sm', icon: '✓' },
  absent: { label: 'Absent', activeClasses: 'bg-red-600 text-white border-red-600', icon: '✕' },
  excused: { label: 'Excused', activeClasses: 'bg-orange-500 text-white border-orange-500', icon: 'i' },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function AttendancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedMeetingId = Number(searchParams.get('meeting_id')) || null;
  const selectedLetterId = Number(searchParams.get('letter_id')) || null;
  const [sheet, setSheet] = useState<AttendanceSheet | null>(null);
  const [participants, setParticipants] = useState<AttendanceParticipant[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSheet = useCallback(async () => {
    if (!selectedMeetingId) {
      setSheet(null);
      setParticipants([]);
      return;
    }

    setIsLoadingSheet(true);
    setAttendanceError('');

    try {
      const result = await attendanceService.getSheet(selectedMeetingId, selectedLetterId ?? undefined);
      setSheet(result);
      setParticipants(result.participants);
    } catch (err) {
      console.error('Failed to fetch attendance sheet:', err);
      setSheet(null);
      setParticipants([]);
      setAttendanceError('Failed to load attendance records for the selected meeting.');
    } finally {
      setIsLoadingSheet(false);
    }
  }, [selectedLetterId, selectedMeetingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSheet();
  }, [fetchSheet]);

  const handleStatusChange = (userId: number, status: AttendanceStatus) => {
    setParticipants((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, status } : p))
    );
  };

  const handleSaveDraft = async () => {
    if (!selectedMeetingId) return;
    setIsSaving(true);
    try {
      await attendanceService.saveDraft(
        selectedMeetingId,
        participants.map((p) => ({ user_id: p.user_id, status: p.status }))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!selectedMeetingId) return;
    setIsSubmitting(true);
    try {
      await attendanceService.saveDraft(
        selectedMeetingId,
        participants.map((p) => ({ user_id: p.user_id, status: p.status }))
      );
      await attendanceService.submit(selectedMeetingId);
      await fetchSheet();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredParticipants = participants.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(term) ||
      p.department?.toLowerCase().includes(term) ||
      p.role?.toLowerCase().includes(term)
    );
  });

  // Live stats recalculated from current local state (not just server snapshot)
  const present = participants.filter((p) => p.status === 'present').length;
  const absent = participants.filter((p) => p.status === 'absent').length;
  const excused = participants.filter((p) => p.status === 'excused').length;
  const total = participants.length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <DashboardLayout pageTitle="Attendance Tracking">
      <div className="flex flex-col gap-6">
        {/* Header + Live Stats */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Attendance Tracking</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Real-time attendance management for official ministerial and departmental meetings.
            </p>
          </div>

          <div className=" flex flex-col gap-6 w-full max-w-xs rounded-xl bg-[var(--color-primary)] p-5 text-white">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Live Statistics</p>
              <BarChart3 className="h-5 w-5 text-white/40" />
            </div>
            <p className="text-4xl font-bold">
              {percentage}%
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/10 px-2 py-2 text-center">
                <p className="text-[11px] text-white/60">Present</p>
                <p className="text-lg font-bold">{present}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-2 py-2 text-center">
                <p className="text-[11px] text-white/60">Absent</p>
                <p className="text-lg font-bold">{absent}</p>
              </div>
              <div className="rounded-lg bg-white/10 px-2 py-2 text-center">
                <p className="text-[11px] text-white/60">Excused</p>
                <p className="text-lg font-bold">{excused}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          {!selectedMeetingId ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Open attendance from Meeting Management</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search the approved meeting letter, then click the attendance icon to load that meeting's attendance table.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/meetings')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <ArrowLeft className="h-4 w-4" />
                Meeting Search
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Meeting</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{sheet?.meeting.title ?? 'Loading meeting...'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Time</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {sheet?.meeting.start_time?.slice(0, 5) || '--:--'} - {sheet?.meeting.end_time?.slice(0, 5) || '--:--'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Venue</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{sheet?.meeting.location ?? 'Not assigned'}</p>
              </div>
            </div>
          )}
          {attendanceError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {attendanceError}
            </p>
          )}
        </div>

        {/* Participant Table */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search participant by name, department or role..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Filter className="h-4 w-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Participant Details</th>
                <th className="px-6 py-3">Organization</th>
                <th className="px-6 py-3">Designation</th>
                <th className="px-6 py-3 text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingSheet ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                    {selectedMeetingId ? 'No participants found for this meeting.' : 'Open an attendance table from Meeting Management search results.'}
                  </td>
                </tr>
              ) : filteredParticipants.map((p) => (
                <tr key={p.user_id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {getInitials(p.full_name)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.full_name}</p>
                        <p className="text-xs text-slate-400">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{p.department ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {p.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
                      {(['present', 'absent', 'excused'] as AttendanceStatus[]).map((status) => {
                        const isActive = p.status === status;
                        const config = STATUS_CONFIG[status];
                        return (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(p.user_id, status)}
                            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                              isActive ? config.activeClasses : 'border-transparent text-slate-500 hover:bg-white'
                            }`}
                          >
                            {isActive && <span>{config.icon}</span>}
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

         {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 p-4">
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Info className="h-3.5 w-3.5" />
              {isSaving ? 'Saving draft...' : 'Statuses are saved when you click Save Draft or Submit Attendance.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving || !selectedMeetingId || participants.length === 0}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleSubmitAttendance}
                disabled={isSubmitting || !selectedMeetingId || participants.length === 0}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
                <span>▶</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
