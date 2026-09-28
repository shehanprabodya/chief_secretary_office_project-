import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Send, Bold, Italic, List as ListIcon, Link as LinkIcon, Plus, Trash2, FileDown, Eye, X } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { minuteService } from '../services/minuteService';
import { approvalService } from '../services/approvalService';
import { meetingService } from '../services/meetingService';
import type { MeetingMinute, MinuteDecision } from '../types/minute';
import type { Meeting } from '../types/meeting';

type DecisionRow = Pick<MinuteDecision, 'decision_order' | 'topic' | 'decision_text' | 'responsibility'> & { rowKey: string; decision_id?: number };

const attendeeResponsibilityLabel = (attendee: NonNullable<Meeting['attendees']>[number]) => [
  `${attendee.full_name}${attendee.designation ? ` — ${attendee.designation}` : ''}`,
  attendee.organization?.organization_name,
  attendee.organization?.address,
].filter(Boolean).join(', ');

export default function CreateMinutesPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [minute, setMinute] = useState<MeetingMinute | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [closingRemarks, setClosingRemarks] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatoryDesignation, setSignatoryDesignation] = useState('');
  const [decisionRows, setDecisionRows] = useState<DecisionRow[]>([]);
  const [savingDecisionKey, setSavingDecisionKey] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState('');
  const [draftSaveState, setDraftSaveState] = useState<'saved' | 'pending' | 'saving' | 'error'>('saved');
  const [draftChangeVersion, setDraftChangeVersion] = useState(0);
  const draftChangeVersionRef = useRef(0);
  const decisionRowsRef = useRef<DecisionRow[]>([]);
  const draftPayloadRef = useRef({ meetingDescription, discussionSummary, closingRemarks, signatoryName, signatoryDesignation });

  useEffect(() => {
    draftPayloadRef.current = { meetingDescription, discussionSummary, closingRemarks, signatoryName, signatoryDesignation };
  }, [meetingDescription, discussionSummary, closingRemarks, signatoryName, signatoryDesignation]);

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMinute, setIsLoadingMinute] = useState(false);
  const [meetingLoadError, setMeetingLoadError] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  useEffect(() => {
    decisionRowsRef.current = decisionRows;
  }, [decisionRows]);

  const markDraftChanged = () => {
    draftChangeVersionRef.current += 1;
    setDraftChangeVersion(draftChangeVersionRef.current);
    setDraftSaveState('pending');
  };

  useEffect(() => {
    if (!meetingId) {
      const loadMeetings = async () => {
        setIsLoadingMeetings(true);
        setMeetingsError('');

        try {
          const res = await meetingService.list({ per_page: 20 });
          setMeetings(res.data || []);
        } catch {
          setMeetingsError('Unable to load meetings.');
        } finally {
          setIsLoadingMeetings(false);
        }
      };

      void loadMeetings();
      return;
    }

    const loadMinute = async () => {
      setIsLoadingMinute(true);
      setMeetingLoadError('');

      try {
        const { minute, meeting } = await minuteService.getOrCreateForMeeting(Number(meetingId));
        setMinute(minute);
        setMeeting(meeting);
        setDecisionRows(minute.decisions.map((decision) => ({ ...decision, rowKey: `decision-${decision.decision_id}` })));
        setMeetingDescription(minute.meeting_description ?? '');
        setDiscussionSummary(minute.discussion_summary ?? '');
        setClosingRemarks(minute.closing_remarks ?? '');
        setSignatoryName(minute.signatory_name ?? '');
        setSignatoryDesignation(minute.signatory_designation ?? '');
        setDraftSaveState('saved');
        draftChangeVersionRef.current = 0;
        setDraftChangeVersion(0);
      } catch {
        setMinute(null);
        setMeeting(null);
        setDecisionRows([]);
        setMeetingLoadError('Unable to load minutes for this meeting.');
      } finally {
        setIsLoadingMinute(false);
      }
    };

    void loadMinute();
  }, [meetingId]);

  const handleSaveDraft = async (): Promise<MeetingMinute> => {
    if (!minute) {
      throw new Error('No minute is available to save.');
    }

    setIsSaving(true);
    setDraftSaveState('saving');
    try {
      const updated = await minuteService.saveDraft(minute.minute_id, {
        meeting_description: meetingDescription,
        discussion_summary: discussionSummary,
        closing_remarks: closingRemarks,
        signatory_name: signatoryName,
        signatory_designation: signatoryDesignation,
      });
      setMinute((prev) => (prev ? { ...prev, ...updated } : updated));
      setDraftSaveState('saved');
      return updated;
    } catch (error) {
      setDraftSaveState('error');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!minute || !meeting) return;
    setIsSubmitting(true);
    try {
      const savedDecisions = await handleSaveAllDecisionRows();
      const savedMinute = await handleSaveDraft();
      const finalSummary = savedMinute?.discussion_summary ?? discussionSummary;
      const approvalContent = [
        meeting.title,
        `Date: ${new Date(meeting.meeting_date).toLocaleDateString()} · Time: ${meeting.start_time?.slice(0, 5) ?? '—'} · Venue: ${meeting.location ?? 'Not specified'}`,
        savedMinute.meeting_description || '',
        '',
        'Attendees',
        ...(meeting.attendees ?? []).map((attendee, index) => `${index + 1}. ${attendee.full_name} — ${attendee.designation ?? ''}${attendee.organization ? `, ${attendee.organization.organization_name}` : ''}`),
        '',
        'Welcome and purpose',
        finalSummary || '—',
        '',
        'Discussion points and decisions',
        ...savedDecisions.map((decision) => `${decision.decision_order}. ${decision.topic ?? '—'}: ${decision.decision_text} (Responsible: ${decision.responsibility ?? '—'})`),
        '',
        'Closing remarks',
        savedMinute.closing_remarks || '—',
        '',
        savedMinute.signatory_name || '',
        savedMinute.signatory_designation || '',
      ].join('\n');
      const approvalDoc = await approvalService.submit({
        document_type: 'minute',
        source_id: savedMinute.minute_id,
        subject: meeting.title || 'Meeting Minutes',
        description: finalSummary?.slice(0, 255) || 'Meeting minutes submitted for approval',
        full_content: approvalContent,
      });

      await minuteService.submitForApproval(savedMinute.minute_id);
      setMinute((prev) => prev ? { ...prev, status: 'pending_approval' } : prev);
      navigate('/approvals', { state: { selectedDocumentId: approvalDoc.document_id } });
    } catch (error) {
      console.error('Failed to submit minutes for approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDecision = () => {
    markDraftChanged();
    setDecisionRows((rows) => [...rows, {
      rowKey: `draft-${Date.now()}-${rows.length}`,
      decision_order: rows.length + 1,
      topic: '',
      decision_text: '',
      responsibility: '',
    }]);
  };

  const updateDecisionRow = (rowKey: string, field: 'topic' | 'decision_text' | 'responsibility', value: string) => {
    setDecisionRows((rows) => rows.map((row) => row.rowKey === rowKey ? { ...row, [field]: value } : row));
    markDraftChanged();
    setDecisionError('');
  };

  const persistDecisionRow = async (row: DecisionRow): Promise<MinuteDecision> => {
    if (!minute || !row.decision_text.trim()) {
      throw new Error('Enter discussion or a decision before saving this row.');
    }
    const payload = {
      topic: (row.topic ?? '').trim() || null,
      decision_text: row.decision_text.trim(),
      responsibility: (row.responsibility ?? '').trim() || null,
    };
    const saved = row.decision_id
      ? await minuteService.updateDecision(row.decision_id, payload)
      : await minuteService.addDecision(minute.minute_id, payload);

    setMinute((current) => current ? {
      ...current,
      decisions: [...current.decisions.filter((decision) => decision.decision_id !== saved.decision_id), saved]
        .sort((a, b) => a.decision_order - b.decision_order),
    } : current);
    setDecisionRows((rows) => rows.map((current) => current.rowKey === row.rowKey
      ? { ...current, decision_id: saved.decision_id, decision_order: saved.decision_order, rowKey: `decision-${saved.decision_id}` }
      : current));
    return saved;
  };

  const handleSaveDecisionRow = async (row: DecisionRow) => {
    setSavingDecisionKey(row.rowKey);
    setDecisionError('');
    try {
      await persistDecisionRow(row);
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'Unable to save this discussion row.');
    } finally {
      setSavingDecisionKey(null);
    }
  };

  const handleSaveAllDecisionRows = async (): Promise<MinuteDecision[]> => {
    const rows = decisionRows.filter((row) => row.decision_text.trim());
    const saved: MinuteDecision[] = [];
    for (const row of rows) saved.push(await persistDecisionRow(row));
    return saved;
  };

  useEffect(() => {
    const minuteId = minute?.minute_id;
    if (minuteId === undefined || isLoadingMinute || draftChangeVersion === 0) return;

    const version = draftChangeVersion;
    const timeout = window.setTimeout(async () => {
      setDraftSaveState('saving');
      try {
        const payload = draftPayloadRef.current;
        await minuteService.saveDraft(minuteId, {
          meeting_description: payload.meetingDescription,
          discussion_summary: payload.discussionSummary,
          closing_remarks: payload.closingRemarks,
          signatory_name: payload.signatoryName,
          signatory_designation: payload.signatoryDesignation,
        });
        const rowsToSave = [...decisionRowsRef.current];
        for (const row of rowsToSave) {
          if (!row.decision_text.trim()) continue;
          const rowPayload = {
            topic: (row.topic ?? '').trim() || null,
            decision_text: row.decision_text.trim(),
            responsibility: (row.responsibility ?? '').trim() || null,
          };
          const saved = row.decision_id
            ? await minuteService.updateDecision(row.decision_id, rowPayload)
            : await minuteService.addDecision(minuteId, rowPayload);
          setMinute((current) => current ? {
            ...current,
            decisions: [...current.decisions.filter((decision) => decision.decision_id !== saved.decision_id), saved]
              .sort((a, b) => a.decision_order - b.decision_order),
          } : current);
          setDecisionRows((currentRows) => currentRows.map((current) => current.rowKey === row.rowKey
            ? { ...current, decision_id: saved.decision_id, decision_order: saved.decision_order, rowKey: `decision-${saved.decision_id}` }
            : current));
        }
        if (draftChangeVersionRef.current === version) setDraftSaveState('saved');
        else setDraftSaveState('pending');
      } catch {
        setDraftSaveState('error');
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [draftChangeVersion, minute?.minute_id, isLoadingMinute]);

  const handleDeleteDecisionRow = async (row: DecisionRow) => {
    if (row.decision_id) await minuteService.deleteDecision(row.decision_id);
    setDecisionRows((rows) => rows.filter((current) => current.rowKey !== row.rowKey));
    markDraftChanged();
    if (row.decision_id) {
      setMinute((current) => current ? {
        ...current,
        decisions: current.decisions.filter((decision) => decision.decision_id !== row.decision_id),
      } : current);
    }
  };

  const handlePreviewPdf = async () => {
    if (!minute?.minute_id) return;

    try {
      await handleSaveAllDecisionRows();
      await handleSaveDraft();
      const blob = await minuteService.downloadPdf(minute.minute_id);
      const url = window.URL.createObjectURL(blob);

      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }

      setPdfPreviewUrl(url);
      setIsPdfPreviewOpen(true);
    } catch (error) {
      console.error('Failed to preview minutes PDF:', error);
    }
  };

  const handleDownloadPdf = async () => {
    if (!minute?.minute_id) {
      return;
    }

    try {
      await handleSaveAllDecisionRows();
      await handleSaveDraft();
      const blob = await minuteService.downloadPdf(minute.minute_id);
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `minutes-${minute.minute_id}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download minutes PDF:', error);
    }
  };

  const closePdfPreview = () => {
    setIsPdfPreviewOpen(false);
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  // If no meetingId provided, show meeting picker
  if (!meetingId) {
    return (
      <DashboardLayout pageTitle="Create Meeting Minutes">
        <div className="space-y-4">
          <div><h1 className="text-2xl font-bold">Create Meeting Minutes</h1><p className="text-sm text-slate-500">Select a meeting to create minutes for.</p></div>

          {isLoadingMeetings ? (
            <div className="flex h-48 items-center justify-center text-slate-400">Loading meetings...</div>
          ) : meetingsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{meetingsError}</div>
          ) : meetings.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">No meetings available.</div>
          ) : (
            <div className="grid gap-4">
              {meetings.map((m) => (
                <div key={m.meeting_id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-semibold text-slate-900">{m.title}</div>
                    <div className="text-xs text-slate-500">{m.meeting_code} · {m.meeting_date ? new Date(m.meeting_date).toLocaleDateString() : ''}</div>
                  </div>
                  <div>
                    <button onClick={() => navigate(`/meetings/${m.meeting_id}/minutes`)} className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white">Create Minutes</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  if (isLoadingMinute) {
    return (
      <DashboardLayout pageTitle="Create Meeting Minutes">
        <div className="flex h-72 items-center justify-center rounded-3xl border border-slate-200 bg-white text-slate-600 shadow-sm">
          Loading meeting details...
        </div>
      </DashboardLayout>
    );
  }

  if (meetingLoadError || !meeting || !minute) {
    return (
      <DashboardLayout pageTitle="Create Meeting Minutes">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Unable to load meeting minutes</p>
          <p className="mt-2 text-sm text-slate-500">{meetingLoadError || 'The requested meeting could not be loaded.'}</p>
          <button
            type="button"
            onClick={() => navigate('/minutes')}
            className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to meeting selection
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Create Meeting Minutes">
      {isPdfPreviewOpen && pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Meeting Minutes PDF Preview</h2>
                <p className="text-sm text-slate-500">{meeting.title}</p>
              </div>
              <button
                type="button"
                onClick={closePdfPreview}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-100 p-2">
              <iframe
                src={pdfPreviewUrl}
                title="Meeting Minutes PDF Preview"
                className="h-full w-full rounded-xl border-0 bg-white"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Minutes <span className="mx-1">/</span> <span className="font-semibold text-slate-900">New Draft</span></p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Create Meeting Minutes</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Draft Mode
            </span>
            <span aria-live="polite" className={`text-xs font-medium ${draftSaveState === 'error' ? 'text-red-600' : 'text-slate-500'}`}>{draftSaveState === 'saving' ? 'Autosaving…' : draftSaveState === 'pending' ? 'Changes pending…' : draftSaveState === 'error' ? 'Autosave failed — save manually' : 'All changes autosaved'}</span>
            <button
              type="button"
              onClick={handlePreviewPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              <Eye size={18} />
              Preview PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
            >
              <FileDown size={18} />
              Download PDF
            </button>
            <button
              onClick={async () => { await handleSaveAllDecisionRows(); await handleSaveDraft(); }}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={handleSubmitForApproval}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
                <div className="xl:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Meeting Title</label>
                  <input
                    type="text"
                    value={meeting.title}
                    disabled
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Date</label>
                  <input
                    type="text"
                    value={new Date(meeting.meeting_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                    disabled
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </div>

              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold text-slate-700">Venue</label><input value={meeting.location ?? 'Not assigned'} disabled className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900" /></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Meeting time</label><input value={`${meeting.start_time?.slice(0, 5) ?? '—'}${meeting.end_time ? ` – ${meeting.end_time.slice(0, 5)}` : ''}`} disabled className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900" /></div></div>

              <div className="mt-4">
                <label htmlFor="meeting-description" className="mb-2 block text-sm font-semibold text-slate-700">Meeting description</label>
                <textarea
                  id="meeting-description"
                  value={meetingDescription}
                  onChange={(event) => { setMeetingDescription(event.target.value); markDraftChanged(); }}
                  rows={3}
                  placeholder="Briefly describe the meeting and its purpose"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Attendees List</label>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">No.</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Designation and organization</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {meeting.attendees?.map((a, index) => <tr key={a.user_id}><td className="px-3 py-2 text-slate-500">{String(index + 1).padStart(2, '0')}</td><td className="px-3 py-2 font-medium text-slate-800">{a.full_name}</td><td className="px-3 py-2 text-slate-600">{a.designation ?? '—'}{a.organization ? `, ${a.organization.organization_name}` : ''}</td></tr>)}
                      {!meeting.attendees?.length && <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-500">No attendees have been added.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/attendance?meeting_id=${meeting.meeting_id}`)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    + Add Attendee
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-slate-50 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Welcome and purpose</p>
                <div className="flex items-center gap-3 text-slate-400">
                  <Bold className="h-4 w-4 cursor-pointer hover:text-slate-700" />
                  <Italic className="h-4 w-4 cursor-pointer hover:text-slate-700" />
                  <ListIcon className="h-4 w-4 cursor-pointer hover:text-slate-700" />
                  <LinkIcon className="h-4 w-4 cursor-pointer hover:text-slate-700" />
                </div>
              </div>
              <textarea
                value={discussionSummary}
                onChange={(e) => { setDiscussionSummary(e.target.value); markDraftChanged(); }}
                rows={8}
                placeholder="Record the chairperson’s welcome, why the meeting was called, and its purpose..."
                className="w-full rounded-b-3xl border border-slate-200 px-6 py-5 text-sm leading-6 text-slate-700 outline-none focus:border-slate-400"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-3xl border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Discussion points and decisions</h2>
                  <p className="mt-1 text-xs text-slate-500">Enter each topic, discussion or decision, and responsible office in one row.</p>
                </div>
                <button type="button" onClick={handleAddDecision} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                  <Plus className="h-4 w-4" /> Add row
                </button>
              </div>
              {decisionError && <p role="alert" className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{decisionError}</p>}
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full table-fixed border-collapse text-sm">
                  <thead className="bg-white text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="w-[7%] border-b px-3 py-3 text-center">No.</th><th className="w-[23%] border-b px-3 py-3">Topic</th><th className="w-[47%] border-b px-3 py-3">Discussion and decision</th><th className="w-[18%] border-b px-3 py-3">Responsibility</th><th className="w-[5%] border-b px-2 py-3" /></tr>
                  </thead>
                  <tbody>
                    {decisionRows.map((row, index) => (
                      <tr key={row.rowKey} className="align-top">
                        <td className="border-b border-slate-100 px-3 py-3 text-center font-semibold text-slate-500">{String(index + 1).padStart(2, '0')}</td>
                        <td className="border-b border-slate-100 px-2 py-3"><textarea aria-label={`Topic for item ${index + 1}`} value={row.topic ?? ''} onChange={(event) => updateDecisionRow(row.rowKey, 'topic', event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Topic or agenda item" /></td>
                        <td className="border-b border-slate-100 px-2 py-3"><textarea aria-label={`Discussion and decision for item ${index + 1}`} value={row.decision_text} onChange={(event) => updateDecisionRow(row.rowKey, 'decision_text', event.target.value)} rows={4} className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Type the discussion, decision, or resolution" /></td>
                        <td className="border-b border-slate-100 px-2 py-3"><select aria-label={`Responsible officer for item ${index + 1}`} value={row.responsibility ?? ''} onChange={(event) => updateDecisionRow(row.rowKey, 'responsibility', event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="">Select meeting attendee</option>{meeting.attendees?.map((attendee) => { const label = attendeeResponsibilityLabel(attendee); return <option key={attendee.user_id} value={label}>{label}</option>; })}{row.responsibility && !meeting.attendees?.some((attendee) => attendeeResponsibilityLabel(attendee) === row.responsibility) && <option value={row.responsibility}>{row.responsibility} (previously entered)</option>}</select></td>
                        <td className="border-b border-slate-100 px-1 py-3 text-center">
                          <button type="button" onClick={() => handleSaveDecisionRow(row)} disabled={savingDecisionKey === row.rowKey || !row.decision_text.trim()} aria-label={`Save item ${index + 1}`} title="Save row" className="mb-2 rounded p-1 text-blue-700 hover:bg-blue-50 disabled:opacity-40"><Save className="h-4 w-4" /></button>
                          <button type="button" onClick={() => void handleDeleteDecisionRow(row)} aria-label={`Delete item ${index + 1}`} title="Delete row" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {decisionRows.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">No discussion rows yet. Select Add row to begin.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Closing and sign-off</h2>
              <label className="mt-4 block text-sm font-semibold text-slate-700">Closing remarks<textarea value={closingRemarks} onChange={(event) => { setClosingRemarks(event.target.value); markDraftChanged(); }} rows={3} placeholder="Thanks, concluding remarks, and meeting close" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" /></label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Name<input value={signatoryName} onChange={(event) => { setSignatoryName(event.target.value); markDraftChanged(); }} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-slate-400" placeholder="Meeting chair / approving officer" /></label><label className="text-sm font-semibold text-slate-700">Designation<input value={signatoryDesignation} onChange={(event) => { setSignatoryDesignation(event.target.value); markDraftChanged(); }} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-slate-400" placeholder="Title and organization" /></label></div>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
}