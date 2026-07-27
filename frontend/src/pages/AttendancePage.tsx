import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, BarChart3, Info, ChevronDown, CheckCircle2, XCircle, UserPlus, X } from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/layouts/DashboardLayout';
import ActionMessage, { type ActionMessageType } from '../components/shared/ActionMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { attendanceService } from '../services/attendanceService';
import { letterService } from '../services/letterService';
import type {
  AttendanceSheet,
  AttendanceStatus,
  AttendanceParticipant,
  ApprovedMeetingLetter,
  OrganizerExcuseRequest,
  AdditionalAttendeeForm,
} from '../types/attendance';
import type { Organization as LetterOrganization } from '../types/letter';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; activeClasses: string;}> = {
  present: { label: 'Present', activeClasses: 'bg-green-500 text-white border-green-500 ' },
  absent: { label: 'Absent', activeClasses: 'bg-red-600 text-white border-red-600'},
  excused: { label: 'Excused', activeClasses: 'bg-orange-500 text-white border-orange-500' },
};

const EXCUSE_REASON_LABELS: Record<OrganizerExcuseRequest['reason_category'], string> = {
  official_duty: 'Official duty',
  medical: 'Medical reason',
  schedule_conflict: 'Schedule conflict',
  other: 'Other',
};

const EMPTY_ADDITIONAL_ATTENDEE_FORM: AdditionalAttendeeForm = {
  letter_id: 0,
  user_id: null,
  full_name: '',
  organization: '',
  designation: '',
  email: '',
  addition_reason: '',
  attendance_status: 'present',
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
  const [isExporting, setIsExporting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: ActionMessageType; text: string } | null>(null);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [excuseRequests, setExcuseRequests] = useState<OrganizerExcuseRequest[]>([]);
  const [reviewRequest, setReviewRequest] = useState<OrganizerExcuseRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [showAdditionalAttendeeForm, setShowAdditionalAttendeeForm] = useState(false);
  const [additionalAttendeeMode, setAdditionalAttendeeMode] = useState<'registered' | 'manual'>('manual');
  const [additionalAttendeeForm, setAdditionalAttendeeForm] = useState<AdditionalAttendeeForm>(EMPTY_ADDITIONAL_ATTENDEE_FORM);
  const [additionalAttendeeErrors, setAdditionalAttendeeErrors] = useState<Record<string, string>>({});
  const [isAddingAttendee, setIsAddingAttendee] = useState(false);
  const [recipientOrganizations, setRecipientOrganizations] = useState<LetterOrganization[]>([]);
  const [isLoadingRegisteredUsers, setIsLoadingRegisteredUsers] = useState(false);
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
      setExcuseRequests([]);
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
      if (!isViewOnly) {
        try {
          setExcuseRequests(await attendanceService.getExcuseRequests(result.meeting.meeting_id));
        } catch (excuseError) {
          console.error('Failed to fetch excuse requests:', excuseError);
          setExcuseRequests([]);
        }
      } else {
        setExcuseRequests([]);
      }
    } catch (err) {
      console.error('Failed to fetch attendance sheet:', err);
      setSheet(null);
      setParticipants([]);
      setExcuseRequests([]);
      const message = axios.isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : null;
      setAttendanceError(message ?? 'Failed to load attendance records for the selected meeting letter.');
    } finally {
      setIsLoadingSheet(false);
    }
  }, [isViewOnly, selectedLetterId, selectedMeetingId]);

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
    setActionMessage(null);
    setParticipants((previous) =>
      previous.map((participant) =>
        participantKey(participant) === key ? { ...participant, status } : participant
      )
    );
  };

  const openReviewDialog = (request: OrganizerExcuseRequest, decision: 'approve' | 'reject') => {
    setReviewRequest(request);
    setReviewDecision(decision);
    setReviewComment('');
    setActionMessage(null);
  };

  const handleReviewExcuseRequest = async () => {
    if (!activeMeetingId || !reviewRequest) return;

    setIsReviewing(true);
    try {
      const updated = await attendanceService.reviewExcuseRequest(
        activeMeetingId,
        reviewRequest.excuse_request_id,
        reviewDecision,
        reviewComment,
      );
      setExcuseRequests((current) => current.map((item) =>
        item.excuse_request_id === updated.excuse_request_id ? updated : item));
      if (reviewDecision === 'approve' && updated.external_officer) {
        setParticipants((current) => current.map((participant) =>
          participant.user_id === updated.external_officer?.user_id
            ? { ...participant, status: 'excused' }
            : participant));
      }
      setReviewRequest(null);
      setReviewComment('');
      setActionMessage({
        type: 'success',
        text: reviewDecision === 'approve'
          ? 'Excuse request approved and attendance marked as excused.'
          : 'Excuse request rejected.',
      });
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      setActionMessage({ type: 'error', text: message ?? 'Unable to review the excuse request.' });
      setReviewRequest(null);
    } finally {
      setIsReviewing(false);
    }
  };

  const openAdditionalAttendeeForm = async () => {
    if (!activeLetterId) return;
    setAdditionalAttendeeMode('manual');
    setAdditionalAttendeeForm({ ...EMPTY_ADDITIONAL_ATTENDEE_FORM, letter_id: activeLetterId });
    setAdditionalAttendeeErrors({});
    setShowAdditionalAttendeeForm(true);

    if (recipientOrganizations.length === 0) {
      setIsLoadingRegisteredUsers(true);
      try {
        setRecipientOrganizations(await letterService.getOrganizations());
      } catch (error) {
        console.error('Failed to load registered officers:', error);
        setAdditionalAttendeeErrors({ registered_user: 'Unable to load registered officers.' });
      } finally {
        setIsLoadingRegisteredUsers(false);
      }
    }
  };

  const updateAdditionalAttendeeField = <K extends keyof AdditionalAttendeeForm>(
    field: K,
    value: AdditionalAttendeeForm[K],
  ) => {
    setAdditionalAttendeeForm((current) => ({ ...current, [field]: value }));
    setAdditionalAttendeeErrors((current) => ({ ...current, [field]: '' }));
  };

  const selectRegisteredOfficer = (value: string) => {
    if (!value) {
      setAdditionalAttendeeForm((current) => ({ ...current, user_id: null, full_name: '', organization: '', designation: '', email: '' }));
      return;
    }

    const userId = Number(value);
    const organization = recipientOrganizations.find((item) =>
      item.officers?.some((officer) => officer.user_id === userId));
    const officer = organization?.officers?.find((item) => item.user_id === userId);
    if (!organization || !officer) return;

    setAdditionalAttendeeForm((current) => ({
      ...current,
      user_id: officer.user_id,
      full_name: officer.full_name,
      organization: organization.organization_name,
      designation: officer.designation ?? '',
      email: '',
    }));
    setAdditionalAttendeeErrors({});
  };

  const validateAdditionalAttendee = () => {
    const errors: Record<string, string> = {};
    if (additionalAttendeeMode === 'registered' && !additionalAttendeeForm.user_id) {
      errors.registered_user = 'Select a registered officer.';
    }
    if (!additionalAttendeeForm.full_name.trim()) errors.full_name = 'Full name is required.';
    if (!additionalAttendeeForm.organization.trim()) errors.organization = 'Organization is required.';
    if (!additionalAttendeeForm.designation.trim()) errors.designation = 'Designation is required.';
    if (additionalAttendeeForm.email && !/^\S+@\S+\.\S+$/.test(additionalAttendeeForm.email)) {
      errors.email = 'Enter a valid email address.';
    }
    if (additionalAttendeeForm.addition_reason.trim().length < 5) {
      errors.addition_reason = 'Provide at least 5 characters explaining why this participant is being added.';
    }
    setAdditionalAttendeeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAdditionalAttendee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeMeetingId || !activeLetterId || !validateAdditionalAttendee()) return;

    setIsAddingAttendee(true);
    setActionMessage(null);
    try {
      const response = await attendanceService.createAdditionalAttendee(activeMeetingId, {
        ...additionalAttendeeForm,
        letter_id: activeLetterId,
        user_id: additionalAttendeeMode === 'registered' ? additionalAttendeeForm.user_id : null,
      });
      setParticipants((current) => [...current, response.participant]);
      setShowAdditionalAttendeeForm(false);
      setActionMessage({ type: 'success', text: response.message });
    } catch (error) {
      if (axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
        const responseErrors = error.response?.data.errors;
        if (responseErrors) {
          setAdditionalAttendeeErrors(Object.fromEntries(
            Object.entries(responseErrors).map(([field, messages]) => [field, messages[0]]),
          ));
        } else {
          setAdditionalAttendeeErrors({ form: error.response?.data.message ?? 'Unable to add the participant.' });
        }
      } else {
        setAdditionalAttendeeErrors({ form: 'Unable to add the participant.' });
      }
    } finally {
      setIsAddingAttendee(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!activeMeetingId || !activeLetterId || isViewOnly) return;
    setIsSaving(true);
    setActionMessage(null);
    try {
      await attendanceService.saveDraft(
        activeMeetingId,
        activeLetterId,
        participants.map((participant) => ({ user_id: participant.user_id, letter_recipient_id: participant.letter_recipient_id, status: participant.status }))
      );
      setActionMessage({
        type: 'success',
        text: 'Attendance draft saved successfully. You can continue editing before submitting.',
      });
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      setActionMessage({ type: 'error', text: message ?? 'Unable to save the attendance draft. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!activeMeetingId || !activeLetterId || isViewOnly) return;
    setShowSubmitConfirmation(false);
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      await attendanceService.saveDraft(
        activeMeetingId,
        activeLetterId,
        participants.map((participant) => ({ user_id: participant.user_id, letter_recipient_id: participant.letter_recipient_id, status: participant.status }))
      );
      await attendanceService.submit(activeMeetingId, activeLetterId, pendingExcuseCount > 0);
      await fetchSheet();
      setActionMessage({
        type: 'success',
        text: 'Attendance submitted successfully. All participant statuses have been recorded.',
      });
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      setActionMessage({ type: 'error', text: message ?? 'Unable to submit attendance. Please check the records and try again.' });
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

  const handleExportPdf = async () => {
    if (!activeMeetingId || !activeLetterId || filteredParticipants.length === 0) return;
    setIsExporting(true);
    setActionMessage(null);
    try {
      await attendanceService.exportPdf(
        activeMeetingId,
        activeLetterId,
        filteredParticipants.map(({ user_id, full_name, department, role, status }) => ({ user_id, full_name, department, role, status }))
      );
      setActionMessage({ type: 'success', text: 'Attendance PDF downloaded successfully.' });
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : null;
      setActionMessage({ type: 'error', text: message ?? 'Unable to export the attendance PDF. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  // Live stats recalculated from current local state (not just server snapshot)
  const present = participants.filter((p) => p.status === 'present').length;
  const absent = participants.filter((p) => p.status === 'absent').length;
  const excused = participants.filter((p) => p.status === 'excused').length;
  const total = participants.length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  const pendingExcuseCount = excuseRequests.filter((request) => request.status === 'pending').length;

  const renderExcuseRequest = (participant: AttendanceParticipant) => {
    const request = excuseRequests.find((item) =>
      item.status !== 'withdrawn' && item.external_officer?.user_id === participant.user_id);

    if (!request) return <span className="text-sm text-slate-400">—</span>;

    const statusClasses = request.status === 'pending'
      ? 'bg-amber-100 text-amber-800'
      : request.status === 'approved'
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-red-100 text-red-800';

    return (
      <div className="min-w-[220px] max-w-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${statusClasses}`}>
            {request.status === 'pending' ? 'Pending review' : request.status}
          </span>
          <span className="text-xs font-semibold text-slate-600">{EXCUSE_REASON_LABELS[request.reason_category]}</span>
        </div>
        <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-slate-600">{request.reason_details}</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Submitted {new Date(request.submitted_at).toLocaleString('en-GB')}
        </p>
        {request.review_comment && (
          <p className="mt-2 rounded bg-white/70 px-2 py-1.5 text-xs text-slate-600">
            <span className="font-semibold">Review comment:</span> {request.review_comment}
          </p>
        )}
        {request.status === 'pending' && !isViewOnly && (
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => openReviewDialog(request, 'approve')} className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />Approve
            </button>
            <button type="button" onClick={() => openReviewDialog(request, 'reject')} className="flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
              <XCircle className="h-3.5 w-3.5" />Reject
            </button>
          </div>
        )}
      </div>
    );
  };

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
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={openAdditionalAttendeeForm}
                  disabled={!activeMeetingId || !activeLetterId || isLoadingSheet}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Additional Attendee
                </button>
              )}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting || !activeMeetingId || !activeLetterId || filteredParticipants.length === 0}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Participant Details</th>
                <th className="px-6 py-3">Organization</th>
                <th className="px-6 py-3">Designation</th>
                <th className="px-6 py-3">Excuse Request</th>
                <th className="px-6 py-3 text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingSheet ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
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
                  <td className="px-6 py-4 align-top">{renderExcuseRequest(p)}</td>
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
            <div className="border-t border-slate-200 p-4">
              {actionMessage && (
                <ActionMessage type={actionMessage.type} message={actionMessage.text} onDismiss={() => setActionMessage(null)} className="mb-3" />
              )}
              <p className="text-xs text-slate-400">Attendance records are view-only in this mode.</p>
            </div>
          ) : (
            <div className="border-t border-slate-200 p-4">
              {actionMessage && (
                <ActionMessage type={actionMessage.type} message={actionMessage.text} onDismiss={() => setActionMessage(null)} className="mb-4" />
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Info className="h-3.5 w-3.5" />
                {isSaving ? 'Saving draft...' : 'Update the statuses, then save a draft or submit attendance.'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving || isSubmitting || !activeMeetingId || !activeLetterId || participants.length === 0}
                  className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirmation(true)}
                  disabled={isSubmitting || isSaving || !activeMeetingId || !activeLetterId || participants.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
                  <span>▶</span>
                </button>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={showSubmitConfirmation}
        title={pendingExcuseCount > 0 ? 'Pending excuse requests' : 'Submit Attendance'}
        message={pendingExcuseCount > 0
          ? `${pendingExcuseCount} excuse request${pendingExcuseCount === 1 ? ' is' : 's are'} still pending review. If you continue, verify those participants' attendance statuses before final submission.`
          : 'Please confirm that every participant status is correct. Submitted attendance will be recorded for this meeting letter.'}
        confirmLabel={pendingExcuseCount > 0 ? 'Continue and Submit' : 'Submit Attendance'}
        variant={pendingExcuseCount > 0 ? 'danger' : 'default'}
        isProcessing={isSubmitting}
        onConfirm={handleSubmitAttendance}
        onCancel={() => setShowSubmitConfirmation(false)}
      />
      {reviewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isReviewing) setReviewRequest(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="review-excuse-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="review-excuse-title" className="text-lg font-bold text-slate-900">
              {reviewDecision === 'approve' ? 'Approve excuse request' : 'Reject excuse request'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{reviewRequest.external_officer?.full_name}</p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{EXCUSE_REASON_LABELS[reviewRequest.reason_category]}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{reviewRequest.reason_details}</p>
            </div>
            <label htmlFor="review-comment" className="mt-4 block text-sm font-semibold text-slate-700">Organizer comment <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="review-comment" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={2000} rows={4} disabled={isReviewing} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" placeholder="Add a comment for the external officer..." />
            <div className="mt-1 text-right text-xs text-slate-400">{reviewComment.length}/2000</div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setReviewRequest(null)} disabled={isReviewing} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleReviewExcuseRequest} disabled={isReviewing} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${reviewDecision === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {isReviewing ? 'Saving...' : reviewDecision === 'approve' ? 'Approve as Excused' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAdditionalAttendeeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isAddingAttendee) setShowAdditionalAttendeeForm(false); }}>
          <form onSubmit={handleCreateAdditionalAttendee} noValidate className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="additional-attendee-title">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 id="additional-attendee-title" className="text-lg font-bold text-slate-900">Add Additional Attendee</h2>
                <p className="mt-1 text-sm text-slate-500">Add someone who was not included in the approved invitation list.</p>
              </div>
              <button type="button" onClick={() => setShowAdditionalAttendeeForm(false)} disabled={isAddingAttendee} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-5 p-6">
              {additionalAttendeeErrors.form && <ActionMessage type="error" message={additionalAttendeeErrors.form} />}

              <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                <button type="button" onClick={() => { setAdditionalAttendeeMode('manual'); setAdditionalAttendeeForm((current) => ({ ...current, user_id: null, full_name: '', organization: '', designation: '', email: '' })); setAdditionalAttendeeErrors({}); }} className={`rounded-md px-4 py-2 text-sm font-semibold ${additionalAttendeeMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Manual Participant</button>
                <button type="button" onClick={() => { setAdditionalAttendeeMode('registered'); setAdditionalAttendeeForm((current) => ({ ...current, user_id: null, full_name: '', organization: '', designation: '', email: '' })); setAdditionalAttendeeErrors({}); }} className={`rounded-md px-4 py-2 text-sm font-semibold ${additionalAttendeeMode === 'registered' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Registered Officer</button>
              </div>

              {additionalAttendeeMode === 'registered' && (
                <div>
                  <label htmlFor="registered-additional-officer" className="mb-1.5 block text-sm font-semibold text-slate-700">Registered officer</label>
                  <select id="registered-additional-officer" value={additionalAttendeeForm.user_id ?? ''} onChange={(event) => selectRegisteredOfficer(event.target.value)} disabled={isLoadingRegisteredUsers || isAddingAttendee} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100">
                    <option value="">{isLoadingRegisteredUsers ? 'Loading registered officers...' : 'Select an officer'}</option>
                    {recipientOrganizations.flatMap((organization) => (organization.officers ?? []).map((officer) => (
                      <option key={officer.user_id} value={officer.user_id}>{officer.full_name} — {officer.designation}, {organization.organization_name}</option>
                    )))}
                  </select>
                  {additionalAttendeeErrors.registered_user && <p className="mt-1 text-xs text-red-600">{additionalAttendeeErrors.registered_user}</p>}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="additional-full-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
                  <input id="additional-full-name" value={additionalAttendeeForm.full_name} onChange={(event) => updateAdditionalAttendeeField('full_name', event.target.value)} disabled={additionalAttendeeMode === 'registered' || isAddingAttendee} maxLength={255} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
                  {additionalAttendeeErrors.full_name && <p className="mt-1 text-xs text-red-600">{additionalAttendeeErrors.full_name}</p>}
                </div>
                <div>
                  <label htmlFor="additional-organization" className="mb-1.5 block text-sm font-semibold text-slate-700">Organization</label>
                  <input id="additional-organization" value={additionalAttendeeForm.organization} onChange={(event) => updateAdditionalAttendeeField('organization', event.target.value)} disabled={additionalAttendeeMode === 'registered' || isAddingAttendee} maxLength={255} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
                  {additionalAttendeeErrors.organization && <p className="mt-1 text-xs text-red-600">{additionalAttendeeErrors.organization}</p>}
                </div>
                <div>
                  <label htmlFor="additional-designation" className="mb-1.5 block text-sm font-semibold text-slate-700">Designation</label>
                  <input id="additional-designation" value={additionalAttendeeForm.designation} onChange={(event) => updateAdditionalAttendeeField('designation', event.target.value)} disabled={additionalAttendeeMode === 'registered' || isAddingAttendee} maxLength={150} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
                  {additionalAttendeeErrors.designation && <p className="mt-1 text-xs text-red-600">{additionalAttendeeErrors.designation}</p>}
                </div>
                <div>
                  <label htmlFor="additional-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email <span className="font-normal text-slate-400">(optional)</span></label>
                  <input id="additional-email" type="email" value={additionalAttendeeForm.email} onChange={(event) => updateAdditionalAttendeeField('email', event.target.value)} disabled={additionalAttendeeMode === 'registered' || isAddingAttendee} maxLength={255} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
                  {additionalAttendeeErrors.email && <p className="mt-1 text-xs text-red-600">{additionalAttendeeErrors.email}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="additional-reason" className="mb-1.5 block text-sm font-semibold text-slate-700">Reason for addition</label>
                <textarea id="additional-reason" value={additionalAttendeeForm.addition_reason} onChange={(event) => updateAdditionalAttendeeField('addition_reason', event.target.value)} disabled={isAddingAttendee} maxLength={2000} rows={4} placeholder="For example: Attending as the invited officer's representative" className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
                {additionalAttendeeErrors.addition_reason && <p className="mt-1 text-xs text-red-600">{additionalAttendeeErrors.addition_reason}</p>}
              </div>

              <div>
                <label htmlFor="additional-attendance-status" className="mb-1.5 block text-sm font-semibold text-slate-700">Initial attendance status</label>
                <select id="additional-attendance-status" value={additionalAttendeeForm.attendance_status} onChange={(event) => updateAdditionalAttendeeField('attendance_status', event.target.value as AttendanceStatus)} disabled={isAddingAttendee} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100">
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="excused">Excused</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button type="button" onClick={() => setShowAdditionalAttendeeForm(false)} disabled={isAddingAttendee} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isAddingAttendee || isLoadingRegisteredUsers} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isAddingAttendee ? 'Adding...' : 'Add Attendee'}</button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
