import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, BarChart3, Info } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { attendanceService } from '../services/attendanceService';
import { meetingService } from '../services/meetingService';
import type { AttendanceSheet, AttendanceStatus, AttendanceParticipant } from '../types/attendance';
import type { Meeting } from '../types/meeting';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; activeClasses: string; icon: string }> = {
  present: { label: 'Present', activeClasses: 'bg-white text-slate-900 border-slate-900 shadow-sm', icon: '✓' },
  absent: { label: 'Absent', activeClasses: 'bg-red-600 text-white border-red-600', icon: '✕' },
  excused: { label: 'Excused', activeClasses: 'bg-orange-500 text-white border-orange-500', icon: 'i' },
};

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function AttendancePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [sheet, setSheet] = useState<AttendanceSheet | null>(null);
  const [participants, setParticipants] = useState<AttendanceParticipant[]>([]);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load meeting list for the "Select Meeting" dropdown
  useEffect(() => {
    meetingService.list({ page: 1 }).then((res) => {
      setMeetings(res.data);
      if (res.data.length > 0) setSelectedMeetingId(res.data[0].meeting_id);
    });
  }, []);

  const fetchSheet = useCallback(async () => {
    if (!selectedMeetingId) return;
    const result = await attendanceService.getSheet(selectedMeetingId);
    setSheet(result);
    setParticipants(result.participants);
  }, [selectedMeetingId]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  const handleStatusChange = (userId: number, status: AttendanceStatus) => {
    setParticipants((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, status } : p))
    );
  };

  // Auto-save draft on every toggle (debounced-ish via direct call, matches "automatically saved as draft" UI text)
  useEffect(() => {
    if (!selectedMeetingId || participants.length === 0) return;
    const timeout = setTimeout(() => {
      setIsSaving(true);
      attendanceService
        .saveDraft(
          selectedMeetingId,
          participants.map((p) => ({ user_id: p.user_id, status: p.status }))
        )
        .finally(() => setIsSaving(false));
    }, 600);

    return () => clearTimeout(timeout);
  }, [participants, selectedMeetingId]);

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
         {/* Select Meeting Card */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                📅 Select Meeting
              </label>
              <select
                value={selectedMeetingId ?? ''}
                onChange={(e) => setSelectedMeetingId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {meetings.map((m) => (
                  <option key={m.meeting_id} value={m.meeting_id}>
                    {m.title} - {new Date(m.meeting_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>

            {sheet && (
              <div className="flex divide-x divide-slate-200 rounded-lg bg-slate-50 px-4 py-2.5">
                <div className="flex-1 px-3">
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {sheet.meeting.start_time?.slice(0, 5)} - {sheet.meeting.end_time?.slice(0, 5)}
                  </p>
                </div>
                <div className="flex-1 px-3">
                  <p className="text-xs text-slate-500">Venue</p>
                  <p className="text-sm font-semibold text-slate-900">{sheet.meeting.location ?? 'Not assigned'}</p>
                </div>
              </div>
            )}
          </div>
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
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Role / Position</th>
                <th className="px-6 py-3 text-center">Status Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParticipants.map((p) => (
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
              {isSaving ? 'Saving draft...' : 'All changes are automatically saved as draft. Finalize to sync with the central server.'}
            </p>
            <div className="flex items-center gap-3">
              <button className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Save Draft
              </button>
              <button
                onClick={handleSubmitAttendance}
                disabled={isSubmitting}
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