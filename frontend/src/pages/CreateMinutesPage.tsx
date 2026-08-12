import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Save, Send, Bold, Italic, List as ListIcon, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { minuteService } from '../services/minuteService';
import { meetingService } from '../services/meetingService';
import type { MeetingMinute } from '../types/minute';
import type { Meeting } from '../types/meeting';

// Hardcoded officer list for the "Responsible Officer" dropdown -
// in production, fetch this from a /users?role=officer endpoint
const OFFICERS = [
  { user_id: 1, full_name: 'Dir. Engineering' },
  { user_id: 2, full_name: 'Project Manager' },
  { user_id: 3, full_name: 'Chief Secretary' },
];

export default function CreateMinutesPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [minute, setMinute] = useState<MeetingMinute | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [meetingsError, setMeetingsError] = useState('');
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [newDecisionText, setNewDecisionText] = useState('');

  const [taskDescription, setTaskDescription] = useState('');
  const [responsibleOfficerId, setResponsibleOfficerId] = useState('');
  const [deadline, setDeadline] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMinute, setIsLoadingMinute] = useState(false);
  const [meetingLoadError, setMeetingLoadError] = useState('');

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
        setDiscussionSummary(minute.discussion_summary ?? '');
      } catch {
        setMinute(null);
        setMeeting(null);
        setMeetingLoadError('Unable to load minutes for this meeting.');
      } finally {
        setIsLoadingMinute(false);
      }
    };

    void loadMinute();
  }, [meetingId]);

  const handleSaveDraft = async () => {
    if (!minute) return;
    setIsSaving(true);
    try {
      const updated = await minuteService.saveDraft(minute.minute_id, discussionSummary);
      setMinute((prev) => (prev ? { ...prev, ...updated } : updated));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!minute) return;
    setIsSubmitting(true);
    try {
      await handleSaveDraft();
      await minuteService.submitForApproval(minute.minute_id);
      navigate('/minutes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDecision = async () => {
    if (!minute || !newDecisionText.trim()) return;
    const decision = await minuteService.addDecision(minute.minute_id, newDecisionText);
    setMinute((prev) => prev ? { ...prev, decisions: [...prev.decisions, decision] } : prev);
    setNewDecisionText('');
  };

  const handleDeleteDecision = async (decisionId: number) => {
    await minuteService.deleteDecision(decisionId);
    setMinute((prev) => prev ? { ...prev, decisions: prev.decisions.filter((d) => d.decision_id !== decisionId) } : prev);
  };

  const handleAddActionItem = async () => {
    if (!minute || !taskDescription.trim() || !responsibleOfficerId || !deadline) return;

    const item = await minuteService.addActionItem(minute.minute_id, {
      task_description: taskDescription,
      responsible_officer_id: Number(responsibleOfficerId),
      deadline,
    });

    const officerName = OFFICERS.find((o) => o.user_id === Number(responsibleOfficerId))?.full_name ?? '';
    setMinute((prev) => prev ? {
      ...prev,
      action_items: [{ ...item, responsible_officer: { user_id: Number(responsibleOfficerId), full_name: officerName } }, ...prev.action_items],
    } : prev);

    setTaskDescription('');
    setResponsibleOfficerId('');
    setDeadline('');
  };

  const handleRemoveActionItem = async (itemId: number) => {
    await minuteService.deleteActionItem(itemId);
    setMinute((prev) => prev ? { ...prev, action_items: prev.action_items.filter((a) => a.action_item_id !== itemId) } : prev);
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
            <button
              onClick={handleSaveDraft}
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

        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
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
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Time</label>
                  <input
                    type="text"
                    value={meeting.start_time?.slice(0, 5) ?? '—'}
                    disabled
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Attendees List</label>
                <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  {meeting.attendees?.map((a) => (
                    <span key={a.user_id} className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-slate-700">{a.full_name}</span>
                  ))}
                  <button className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900">+ Add Attendee</button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-slate-50 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Discussion Summary</p>
                <div className="flex items-center gap-3 text-slate-400">
                  <Bold className="h-4 w-4 cursor-pointer hover:text-slate-700" />
                  <Italic className="h-4 w-4 cursor-pointer hover:text-slate-700" />
                  <ListIcon className="h-4 w-4 cursor-pointer hover:text-slate-700" />
                  <LinkIcon className="h-4 w-4 cursor-pointer hover:text-slate-700" />
                </div>
              </div>
              <textarea
                value={discussionSummary}
                onChange={(e) => setDiscussionSummary(e.target.value)}
                rows={8}
                placeholder="Summarize what was discussed in the meeting..."
                className="w-full rounded-b-3xl border border-slate-200 px-6 py-5 text-sm leading-6 text-slate-700 outline-none focus:border-slate-400"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-200 bg-slate-50 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Formal Decisions</p>
                <button
                  onClick={() => {
                    const text = prompt('Enter decision text:');
                    if (text) { setNewDecisionText(text); handleAddDecision(); }
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" /> Add Decision
                </button>
              </div>
              <div className="space-y-3 px-6 py-5">
                {minute.decisions.length === 0 ? (
                  <p className="text-sm text-slate-500">No formal decisions recorded yet.</p>
                ) : (
                  minute.decisions.map((d) => (
                    <div key={d.decision_id} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white">{String(d.decision_order).padStart(2, '0')}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{d.decision_text}</p>
                      </div>
                      <button onClick={() => handleDeleteDecision(d.decision_id)} className="text-slate-400 transition hover:text-red-600">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-slate-950 p-6 shadow-sm text-white">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500 text-white">
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Action Items</p>
                  <p className="text-sm text-slate-400">Add follow-up tasks for this meeting.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Task Description</label>
                  <input
                    type="text"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Responsible Officer</label>
                  <select
                    value={responsibleOfficerId}
                    onChange={(e) => setResponsibleOfficerId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="" className="text-slate-500">Select Officer...</option>
                    {OFFICERS.map((o) => (
                      <option key={o.user_id} value={o.user_id}>{o.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleAddActionItem}
                  className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Add Action Item
                </button>
              </div>
            </div>

            {minute.action_items.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 shadow-sm text-white">
                <p className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-500">Added This Session</p>
                <div className="space-y-3">
                  {minute.action_items.map((item) => (
                    <div key={item.action_item_id} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.task_description}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.responsible_officer?.full_name} · {item.deadline ? new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'No deadline'}
                          </p>
                        </div>
                        <button onClick={() => handleRemoveActionItem(item.action_item_id)} className="text-slate-400 transition hover:text-white">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}