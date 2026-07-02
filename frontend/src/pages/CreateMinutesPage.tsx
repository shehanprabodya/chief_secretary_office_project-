import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Save, Send, Bold, Italic, List as ListIcon, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { minuteService } from '../services/minuteService';
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
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [newDecisionText, setNewDecisionText] = useState('');

  const [taskDescription, setTaskDescription] = useState('');
  const [responsibleOfficerId, setResponsibleOfficerId] = useState('');
  const [deadline, setDeadline] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!meetingId) return;
    minuteService.getOrCreateForMeeting(Number(meetingId)).then(({ minute, meeting }) => {
      setMinute(minute);
      setMeeting(meeting);
      setDiscussionSummary(minute.discussion_summary ?? '');
    });
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

  if (!minute || !meeting) {
    return (
      <DashboardLayout pageTitle="Minutes">
        <div className="flex h-64 items-center justify-center text-slate-400">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Create Meeting Minutes">
      <div className="space-y-4">
        {/* Breadcrumb + Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">
              Minutes <span className="mx-1">/</span>
              <span className="font-semibold text-slate-900">New Draft</span>
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Create Meeting Minutes</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Draft Mode
            </span>
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={handleSubmitForApproval}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Meeting Info Card */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Meeting Title</label>
                  <input
                    type="text"
                    value={meeting.title}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
                  <input
                    type="text"
                    value={new Date(meeting.meeting_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Time</label>
                  <input
                    type="text"
                    value={meeting.start_time?.slice(0, 5) ?? '—'}
                    disabled
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Attendees List</label>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 p-2.5">
                  {meeting.attendees?.map((a) => (
                    <span key={a.user_id} className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                      {a.full_name}
                    </span>
                  ))}
                  <button className="text-sm text-slate-400 hover:text-slate-600">+ Add Attendee</button>
                </div>
              </div>
            </div>

            {/* Discussion Summary */}
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discussion Summary</h3>
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
                rows={6}
                placeholder="Summarize what was discussed in the meeting..."
                className="w-full resize-none rounded-b-lg p-5 text-sm text-slate-700 focus:outline-none"
              />
            </div>

            {/* Formal Decisions */}
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formal Decisions</h3>
                <button
                  onClick={() => {
                    const text = prompt('Enter decision text:');
                    if (text) { setNewDecisionText(text); handleAddDecision(); }
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                >
                  <Plus className="h-4 w-4" /> Add Decision
                </button>
              </div>
              <div className="space-y-3 p-5">
                {minute.decisions.length === 0 ? (
                  <p className="text-sm text-slate-400">No formal decisions recorded yet.</p>
                ) : (
                  minute.decisions.map((d) => (
                    <div key={d.decision_id} className="flex items-start gap-3 rounded-lg border-l-4 border-blue-500 bg-slate-50 p-4">
                      <span className="font-bold text-blue-600">{String(d.decision_order).padStart(2, '0')}.</span>
                      <p className="flex-1 text-sm text-slate-700">{d.decision_text}</p>
                      <button onClick={() => handleDeleteDecision(d.decision_id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Action Items */}
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <AlertCircle className="h-4 w-4 text-blue-600" /> Action Items
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Task Description</label>
                  <input
                    type="text"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Responsible Officer</label>
                  <select
                    value={responsibleOfficerId}
                    onChange={(e) => setResponsibleOfficerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Officer...</option>
                    {OFFICERS.map((o) => (
                      <option key={o.user_id} value={o.user_id}>{o.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleAddActionItem}
                  className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  Add Action Item
                </button>
              </div>
            </div>

            {minute.action_items.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-[var(--color-primary)] p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/60">Added This Session</h3>
                <div className="space-y-2">
                  {minute.action_items.map((item) => (
                    <div key={item.action_item_id} className="flex items-start justify-between gap-2 rounded-lg bg-white/10 p-3">
                      <div>
                        <p className="text-sm font-medium text-white">{item.task_description}</p>
                        <p className="mt-0.5 text-xs text-white/60">
                          {item.responsible_officer?.full_name} · {item.deadline ? new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : ''}
                        </p>
                      </div>
                      <button onClick={() => handleRemoveActionItem(item.action_item_id)} className="text-white/60 hover:text-white">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}