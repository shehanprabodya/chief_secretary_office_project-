import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, BarChart3, Info, ChevronDown } from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { attendanceService } from '../services/attendanceService';
import type { AttendanceSheet, AttendanceStatus, AttendanceParticipant, ApprovedMeetingLetter } from '../types/attendance';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; activeClasses: string;}> = {
  present: { label: 'Present', activeClasses: 'bg-green-500 text-white border-green-500 ' },
  absent: { label: 'Absent', activeClasses: 'bg-red-600 text-white border-red-600'},
  excused: { label: 'Excused', activeClasses: 'bg-orange-500 text-white border-orange-500' },
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
  const [letterSearch, setLetterSearch] = useState('');
  const [isLetterDropdownOpen, setIsLetterDropdownOpen] = useState(false);
  const [letters, setLetters] = useState<ApprovedMeetingLetter[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(false);
  const [letterError, setLetterError] = useState('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canLoadAttendance = Boolean(selectedMeetingId || selectedLetterId);
  const isViewOnly = searchParams.get('mode') === 'view';
  const showLetterSelector = !canLoadAttendance || isViewOnly;
  const activeMeetingId = selectedMeetingId ?? sheet?.meeting.meeting_id ?? null;
  const activeLetterId = selectedLetterId ?? sheet?.letter_id ?? null;
  const matchingLetters = letters.filter((letter) => {
    const term = letterSearch.trim().toLowerCase();
    if (!term) return true;
    return [letter.letter_title, letter.meeting_title, letter.subject_code, letter.subject_title]
      .some((value) => value?.toLowerCase().includes(term));
  });

  const loadLetters = useCallback(async (term = '') => {
    setIsLoadingLetters(true);
    setLetterError('');
    try {
      setLetters(await attendanceService.getApprovedMeetingLetters(term));
    } catch (err) {
      console.error('Failed to fetch approved meeting letters:', err);
      setLetters([]);
      setLetterError('Failed to load approved meeting letters.');
    } finally {
      setIsLoadingLetters(false);
    }
  }, []);

  const fetchSheet = useCallback(async () => {
    if (!selectedMeetingId && !selectedLetterId) {
      setSheet(null);
      setParticipants([]);
      return;
    }

    setIsLoadingSheet(true);
    setAttendanceError('');

    try {
      const result = selectedMeetingId
        ? await attendanceService.getSheet(selectedMeetingId, selectedLetterId ?? undefined)
        : await attendanceService.getSheetByLetter(selectedLetterId!);
      setSheet(result);
      setParticipants(result.participants);
    } catch (err) {
      console.error('Failed to fetch attendance sheet:', err);
      setSheet(null);
      setParticipants([]);
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : null;
      setAttendanceError(message ?? 'Failed to load attendance records for the selected meeting letter.');
    } finally {
      setIsLoadingSheet(false);
    }
  }, [selectedLetterId, selectedMeetingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSheet();
  }, [fetchSheet]);

  useEffect(() => {
    loadLetters();
  }, [loadLetters]);

  useEffect(() => {
    if (!isViewOnly || !selectedLetterId) return;
    const selectedLetter = letters.find((letter) => letter.letter_id === selectedLetterId);
    if (selectedLetter) setLetterSearch(selectedLetter.letter_title);
  }, [isViewOnly, letters, selectedLetterId]);

  const participantKey = (participant: AttendanceParticipant) =>
    participant.user_id ? `user-${participant.user_id}` : `recipient-${participant.letter_recipient_id}`;

  const handleStatusChange = (key: string, status: AttendanceStatus) => {
    if (isViewOnly) return;
    setParticipants((previous) =>
      previous.map((participant) =>
        participantKey(participant) === key ? { ...participant, status } : participant
      )
    );
  };

  const handleSaveDraft = async () => {
    if (!activeMeetingId || !activeLetterId || isViewOnly) return;
    setIsSaving(true);
    try {
      await attendanceService.saveDraft(
        activeMeetingId,
        activeLetterId,
        participants.map((participant) => ({ user_id: participant.user_id, letter_recipient_id: participant.letter_recipient_id, status: participant.status }))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!activeMeetingId || !activeLetterId || isViewOnly) return;
    setIsSubmitting(true);
    try {
      await attendanceService.saveDraft(
        activeMeetingId,
        activeLetterId,
        participants.map((participant) => ({ user_id: participant.user_id, letter_recipient_id: participant.letter_recipient_id, status: participant.status }))
      );
      await attendanceService.submit(activeMeetingId, activeLetterId);
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
          <div className="w-full max-w-2xl flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Attendance Tracking</h1>

            {showLetterSelector && (
              <div className="mt-5">
                <label htmlFor="meeting-letter" className="mb-2 block text-sm font-semibold text-slate-700">
                  Select Meeting Letter
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="meeting-letter"
                    type="text"
                    value={letterSearch}
                    onChange={(event) => {
                      setLetterSearch(event.target.value);
                      setIsLetterDropdownOpen(true);
                    }}
                    onFocus={() => setIsLetterDropdownOpen(true)}
                    onBlur={() => window.setTimeout(() => setIsLetterDropdownOpen(false), 150)}
                    placeholder={isLoadingLetters ? 'Loading meeting letters...' : 'Type to search meeting letters...'}
                    disabled={isLoadingLetters}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={isLetterDropdownOpen}
                    aria-controls="meeting-letter-options"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                  />
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setIsLetterDropdownOpen((open) => !open)}
                    className="absolute right-2 top-1.5 rounded p-1.5 text-slate-400 hover:bg-slate-100"
                    aria-label="Toggle meeting letter options"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isLetterDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isLetterDropdownOpen && !isLoadingLetters && (
                    <div id="meeting-letter-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {matchingLetters.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-400">No matching meeting letters found.</p>
                      ) : matchingLetters.map((letter) => (
                        <button
                          key={letter.letter_id}
                          type="button"
                          role="option"
                          aria-selected={selectedLetterId === letter.letter_id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setLetterSearch(letter.letter_title);
                            setIsLetterDropdownOpen(false);
                            navigate(`/attendance?letter_id=${letter.letter_id}&mode=view`);
                          }}
                          className={`block w-full px-4 py-2.5 text-left hover:bg-blue-50 ${selectedLetterId === letter.letter_id ? 'bg-blue-50' : ''}`}
                        >
                          <span className="block truncate text-sm font-semibold text-slate-900">{letter.letter_title}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {letter.subject_code ? `${letter.subject_code} · ` : ''}{letter.subject_title ?? letter.meeting_title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {letterError && <p className="mt-3 text-sm text-red-600">{letterError}</p>}

                {!isLoadingLetters && letters.length === 0 && (
                  <p className="mt-3 text-sm text-slate-400">No approved meeting letters found.</p>
                )}
              </div>
            )}
          </div>

          <div className=" flex flex-col gap-6 w-full max-w-xs rounded-xl bg-slate-800 p-5 text-black">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white">Live Statistics</p>
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-bold text-white">
              {percentage}%
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white px-2 py-2 text-center">
                <p className="text-[11px] text-slate-500">Present</p>
                <p className="text-lg font-bold">{present}</p>
              </div>
              <div className="rounded-lg bg-white px-2 py-2 text-center">
                <p className="text-[11px] text-slate-500">Absent</p>
                <p className="text-lg font-bold">{absent}</p>
              </div>
              <div className="rounded-lg bg-white px-2 py-2 text-center">
                <p className="text-[11px] text-slate-500">Excused</p>
                <p className="text-lg font-bold">{excused}</p>
              </div>
            </div>
          </div>
        </div>
        {(canLoadAttendance || attendanceError) && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          {canLoadAttendance && (
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
        )}

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
                    {canLoadAttendance ? 'No attendance records found for this meeting letter.' : 'Search for a meeting letter above to view its attendance.'}
                  </td>
                </tr>
              ) : filteredParticipants.map((p) => (
                <tr key={participantKey(p)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {getInitials(p.full_name)}
                      </div>
                      <p className="font-semibold text-slate-900">{p.full_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{p.department ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {p.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isViewOnly ? (
                      <div className="flex justify-center">
                        <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${STATUS_CONFIG[p.status].activeClasses}`}>
                          {STATUS_CONFIG[p.status].label}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {(['present', 'absent', 'excused'] as AttendanceStatus[]).map((status) => {
                          const isActive = p.status === status;
                          const config = STATUS_CONFIG[status];
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(participantKey(p), status)}
                              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                isActive ? config.activeClasses : 'border-transparent text-slate-500 hover:bg-white'
                              }`}
                            >
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isViewOnly ? (
            <div className="border-t border-slate-200 p-4 text-xs text-slate-400">
              Attendance records are view-only in this mode.
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-slate-200 p-4">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Info className="h-3.5 w-3.5" />
                {isSaving ? 'Saving draft...' : 'Update the statuses, then save a draft or submit attendance.'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving || !activeMeetingId || participants.length === 0}
                  className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={isSubmitting || !activeMeetingId || participants.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
                  <span>▶</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
