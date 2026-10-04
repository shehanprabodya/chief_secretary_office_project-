import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Filter, Pencil, X } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import WorkflowTracker from '../components/Approvals/WorkflowTracker';
import { approvalService } from '../services/approvalService';
import { minuteService } from '../services/minuteService';
import { useAuth } from '../context/AuthContext';
import { sanitizeDocumentHtml } from '../utils/sanitizeHtml';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import type { ApprovableDocument } from '../types/approval';
import type { DepartmentHeadEditPayload } from '../services/approvalService';
import RecipientTagInput from '../components/Letters/RecipientTagInput';
import type { Organization, RecipientTag } from '../types/letter';

type LetterEdit = Extract<DepartmentHeadEditPayload, { title: string }> & { recipients: RecipientTag[] };
type MinuteEdit = {
  meeting_description?: string | null;
  discussion_summary?: string | null;
  closing_remarks?: string | null;
  signatory_name?: string | null;
  signatory_designation?: string | null;
  decisions: Array<{
    decision_id: number;
    topic: string | null;
    decision_text: string;
    responsibility: string | null;
  }>;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-orange-50 text-orange-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function hasHtml(value?: string | null) {
  return Boolean(value && /<\/?[a-z][\s\S]*>/i.test(value));
}

function htmlToPlainText(value?: string | null) {
  if (!value) return '';
  if (!hasHtml(value)) return value;

  const parsed = new DOMParser().parseFromString(value, 'text/html');
  parsed.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  parsed.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6').forEach((node) => node.append('\n'));
  const text = parsed.body.textContent ?? '';
  return hasHtml(text) ? htmlToPlainText(text) : text.replace(/\n{3,}/g, '\n\n').trim();
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ApprovableDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ApprovableDocument | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'history' | 'attachments'>('preview');
  const [commentText, setCommentText] = useState('');
  const [isActing, setIsActing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);
  const [minutePdfUrl, setMinutePdfUrl] = useState<string | null>(null);
  const [isMinutePdfLoading, setIsMinutePdfLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [letterEdit, setLetterEdit] = useState<LetterEdit | null>(null);
  const [minuteEdit, setMinuteEdit] = useState<MinuteEdit | null>(null);
  const [recipientOrganizations, setRecipientOrganizations] = useState<Organization[]>([]);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await approvalService.list(search || undefined);
      setDocuments(docs);
      setSelectedDoc((current) => {
        if (docs.length === 0) return null;
        return current && docs.some((doc) => doc.document_id === current.document_id) ? current : docs[0];
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load approvals. Please refresh or login again.');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [fetchList]);

  const handleSelectDoc = async (id: number) => {
    const doc = await approvalService.getById(id);
    setIsEditing(false);
    setLetterEdit(null);
    setMinuteEdit(null);
    setSelectedDoc(doc);
    setActiveTab('preview');
  };

  const currentStep = selectedDoc?.steps?.find((s) => s.step_order === selectedDoc.current_step_order);
  const canAct = currentStep && user && currentStep.required_role === user.role && currentStep.status === 'pending';
  const canEditSubmitted = Boolean(canAct && user?.role === 'dept_head' && ['letter', 'minute'].includes(selectedDoc?.document_type ?? ''));

  const startEditing = async () => {
    if (!selectedDoc) return;
    try {
      if (selectedDoc.document_type === 'letter' && selectedDoc.source_letter) {
        const letter = selectedDoc.source_letter;
        let organizations: Organization[];
        try {
          organizations = await approvalService.getRecipientOrganizations();
        } catch (lookupError) {
          console.warn('Recipient organization lookup unavailable; opening the letter with its saved recipients.', lookupError);
          organizations = (letter.recipients ?? []).flatMap((recipient) => {
            if (!recipient.organization_id || !recipient.organization?.organization_name) return [];
            return [{
              organization_id: recipient.organization_id,
              organization_name: recipient.organization.organization_name,
              abbreviation: null,
            }];
          }).filter((organization, index, all) => all.findIndex((item) => item.organization_id === organization.organization_id) === index);
        }
        setRecipientOrganizations(organizations);
        setLetterEdit({
          title: htmlToPlainText(letter.title),
          content: htmlToPlainText(letter.content),
          designation: htmlToPlainText(letter.designation),
          signatory_name: htmlToPlainText(letter.signatory_name),
          signature_date: letter.signature_date,
          recipients: (letter.recipients ?? []).map((recipient) => ({
            id: String(recipient.letter_recipient_id),
            organization_id: recipient.organization_id ?? undefined,
            user_id: recipient.user_id ?? undefined,
            recipient_label: htmlToPlainText(recipient.recipient_label),
            organization_name: recipient.organization?.organization_name ?? recipient.user?.organization?.organization_name,
            designation: recipient.user?.designation ?? undefined,
          })),
        });
      } else if (selectedDoc.document_type === 'minute' && selectedDoc.source_minute) {
        const minute = selectedDoc.source_minute;
        setMinuteEdit({
          meeting_description: minute.meeting_description,
          discussion_summary: minute.discussion_summary,
          closing_remarks: minute.closing_remarks,
          signatory_name: minute.signatory_name,
          signatory_designation: minute.signatory_designation,
          decisions: (minute.decisions ?? []).map((decision) => ({ ...decision })),
        });
      } else {
        setError('The original document could not be loaded for editing. Refresh and try again.');
        return;
      }
      setError(null);
      setIsEditing(true);
    } catch (err) {
      console.error(err);
      setError('Could not load letter recipients for editing. Refresh and try again.');
    }
  };

  const handleEditAndForward = async () => {
    if (!selectedDoc || (!letterEdit && !minuteEdit)) return;
    setIsActing(true);
    setError(null);
    try {
      const updated = await approvalService.editAndForward(
        selectedDoc.document_id,
      letterEdit
        ? { ...letterEdit, recipients: letterEdit.recipients.map(({ organization_id, user_id, recipient_label }) => ({ organization_id, user_id, recipient_label })) }
        : minuteEdit as DepartmentHeadEditPayload,
        commentText || undefined,
      );
      setSelectedDoc(updated);
      setIsEditing(false);
      setLetterEdit(null);
      setMinuteEdit(null);
      setCommentText('');
      await fetchList();
    } catch (err) {
      console.error(err);
      setError('Could not save and forward this document. Refresh the approval and try again.');
    } finally {
      setIsActing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDoc) return;
    setIsActing(true);
    try {
      const updated = await approvalService.approve(selectedDoc.document_id, commentText || undefined);
      setSelectedDoc(updated);
      setCommentText('');
      fetchList();
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc) return;
    setShowRejectConfirmation(true);
  };

  const confirmReject = async () => {
    if (!selectedDoc) return;
    setIsActing(true);
    try {
      const updated = await approvalService.reject(selectedDoc.document_id, commentText || undefined);
      setSelectedDoc(updated);
      setCommentText('');
      setShowRejectConfirmation(false);
      await fetchList();
    } finally {
      setIsActing(false);
    }
  };

  const handlePostComment = async () => {
    if (!selectedDoc || !commentText.trim()) return;
    const comment = await approvalService.addComment(selectedDoc.document_id, commentText);
    setSelectedDoc((prev) => prev ? { ...prev, comments: [...(prev.comments ?? []), comment] } : prev);
    setCommentText('');
  };

  useEffect(() => {
    const sourceId = selectedDoc?.source_id;
    if (!selectedDoc || selectedDoc.document_type !== 'minute' || sourceId == null) {
      if (minutePdfUrl) {
        URL.revokeObjectURL(minutePdfUrl);
      }
      setMinutePdfUrl(null);
      setIsMinutePdfLoading(false);
      return;
    }

    let isMounted = true;
    const loadMinutePdf = async () => {
      setIsMinutePdfLoading(true);
      try {
        const blob = await minuteService.downloadPdf(sourceId);
        const url = URL.createObjectURL(blob);
        if (isMounted) {
          setMinutePdfUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return url;
          });
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Failed to load minute approval PDF preview:', err);
        if (isMounted) {
          setMinutePdfUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsMinutePdfLoading(false);
        }
      }
    };

    void loadMinutePdf();

    return () => {
      isMounted = false;
      setIsMinutePdfLoading(false);
      if (minutePdfUrl) {
        URL.revokeObjectURL(minutePdfUrl);
      }
      setMinutePdfUrl(null);
    };
  }, [selectedDoc]);

  return (
    <DashboardLayout pageTitle="Pending Approvals">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review and manage administrative documents requiring your authorization.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <button
              onClick={fetchList}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" /> Refresh List
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* LEFT: Document List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchList()}
                placeholder="Search by subject code or subject..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {isLoading && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
                Loading approvals...
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!isLoading && !error && documents.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No approvals found.
              </div>
            )}

            {documents.map((doc) => (
              <button
                key={doc.document_id}
                onClick={() => handleSelectDoc(doc.document_id)}
                className={`block w-full rounded-lg border bg-white p-4 text-left transition-colors ${
                  selectedDoc?.document_id === doc.document_id
                    ? 'border-l-4 border-l-blue-600 border-slate-200 bg-slate-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Subject Code: {doc.subject_code ?? '—'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${STATUS_BADGE[doc.status]}`}>
                    {doc.status}
                  </span>
                </div>
                <p className="font-semibold text-slate-900">{doc.subject}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{doc.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold">
                      {doc.submitter?.full_name?.charAt(0) ?? '?'}
                    </span>
                    {doc.submitter?.full_name ?? 'Unknown submitter'}
                  </span>
                  <span className="text-slate-400">{timeAgo(doc.created_at)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* RIGHT: Detail View */}
          {selectedDoc && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Approval Detail View</h2>
                {canAct ? (
                  <div className="flex items-center gap-2">
                    {canEditSubmitted && !isEditing && (
                      <button
                        onClick={startEditing}
                        className="flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" /> Edit document
                      </button>
                    )}
                    {isEditing && (
                      <>
                        <button
                          onClick={() => { setIsEditing(false); setLetterEdit(null); setMinuteEdit(null); }}
                          disabled={isActing}
                          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                        <button
                          onClick={handleEditAndForward}
                          disabled={isActing}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {isActing ? 'Saving…' : 'Save & Forward'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleReject}
                      disabled={isActing || isEditing}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                      Notes/Observations
                    </button>
                    {!isEditing && <button
                      onClick={handleApprove}
                      disabled={isActing}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >Approve</button>}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    {selectedDoc.status === 'pending' ? 'Awaiting other approver' : `Document ${selectedDoc.status}`}
                  </span>
                )}
              </div>

              <WorkflowTracker steps={selectedDoc.steps ?? []} />

              {/* Tabs */}
              <div className="mt-6 flex gap-6 border-b border-slate-200">
                {(['preview', 'history', 'attachments'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`-mb-px border-b-2 px-1 py-3 text-sm font-medium capitalize ${
                      activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'preview' ? 'Document Preview' : tab === 'history' ? 'Submission History' : 'Attachments'}
                  </button>
                ))}
              </div>

              {/* Document Preview */}
              {activeTab === 'preview' && (
                <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-slate-200 p-6">
                  {isEditing && letterEdit ? (
                    <div className="mx-auto max-w-4xl space-y-5 rounded-lg bg-white p-6">
                      <h3 className="text-lg font-semibold text-slate-900">Edit letter before forwarding</h3>
                      <label className="block text-sm font-medium text-slate-700">Subject
                        <input value={letterEdit.title} onChange={(e) => setLetterEdit({ ...letterEdit, title: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                      </label>
                      <div>
                        <p className="mb-1 text-sm font-medium text-slate-700">Letter content</p>
                        <textarea rows={14} value={letterEdit.content} onChange={(e) => setLetterEdit({ ...letterEdit, content: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 leading-7" />
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium text-slate-700">Recipients</p>
                        <RecipientTagInput
                          organizations={recipientOrganizations}
                          recipients={letterEdit.recipients}
                          onChange={(recipients) => setLetterEdit({ ...letterEdit, recipients })}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <label className="text-sm font-medium text-slate-700">Designation<input value={letterEdit.designation ?? ''} onChange={(e) => setLetterEdit({ ...letterEdit, designation: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
                        <label className="text-sm font-medium text-slate-700">Signatory name<input value={letterEdit.signatory_name ?? ''} onChange={(e) => setLetterEdit({ ...letterEdit, signatory_name: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
                        <label className="text-sm font-medium text-slate-700">Signature date<input type="date" value={letterEdit.signature_date?.slice(0, 10) ?? ''} onChange={(e) => setLetterEdit({ ...letterEdit, signature_date: e.target.value || null })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
                      </div>
                    </div>
                  ) : isEditing && minuteEdit ? (
                    <div className="mx-auto max-w-4xl space-y-5 rounded-lg bg-white p-6">
                      <h3 className="text-lg font-semibold text-slate-900">Edit minutes before forwarding</h3>
                      {([
                        ['meeting_description', 'Meeting description'],
                        ['discussion_summary', 'Discussion summary'],
                        ['closing_remarks', 'Closing remarks'],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="block text-sm font-medium text-slate-700">{label}
                          <textarea rows={3} value={minuteEdit[key] ?? ''} onChange={(e) => setMinuteEdit({ ...minuteEdit, [key]: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                        </label>
                      ))}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-slate-700">Signatory name<input value={minuteEdit.signatory_name ?? ''} onChange={(e) => setMinuteEdit({ ...minuteEdit, signatory_name: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
                        <label className="text-sm font-medium text-slate-700">Signatory designation<input value={minuteEdit.signatory_designation ?? ''} onChange={(e) => setMinuteEdit({ ...minuteEdit, signatory_designation: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold text-slate-800">Decisions and responsibilities</h4>
                        {minuteEdit.decisions.map((decision, index) => (
                          <div key={decision.decision_id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                            <p className="text-sm font-semibold text-slate-600">Decision {index + 1}</p>
                            <input aria-label="Decision topic" placeholder="Topic" value={decision.topic ?? ''} onChange={(e) => setMinuteEdit({ ...minuteEdit, decisions: minuteEdit.decisions.map((item) => item.decision_id === decision.decision_id ? { ...item, topic: e.target.value || null } : item) })} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                            <textarea aria-label="Decision text" rows={3} value={decision.decision_text} onChange={(e) => setMinuteEdit({ ...minuteEdit, decisions: minuteEdit.decisions.map((item) => item.decision_id === decision.decision_id ? { ...item, decision_text: e.target.value } : item) })} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                            <input aria-label="Responsibility" placeholder="Responsibility" value={decision.responsibility ?? ''} onChange={(e) => setMinuteEdit({ ...minuteEdit, decisions: minuteEdit.decisions.map((item) => item.decision_id === decision.decision_id ? { ...item, responsibility: e.target.value || null } : item) })} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedDoc.document_type === 'minute' ? (
                    <div className="mx-auto h-[75vh] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {isMinutePdfLoading ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading PDF preview...</div>
                      ) : minutePdfUrl ? (
                        <iframe
                          src={minutePdfUrl}
                          title="Minute approval PDF preview"
                          className="h-full w-full border-0"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">The minute PDF preview is not available.</div>
                      )}
                    </div>
                  ) : selectedDoc.document_type === 'letter' && selectedDoc.source_letter ? (
                    <div className="mx-auto min-h-[70vh] w-full max-w-4xl bg-white p-10 shadow-xl">
                      <div className="mb-10 flex justify-between gap-6 text-sm">
                        <span>{selectedDoc.subject_code ?? '—'}</span>
                        <span>{selectedDoc.source_letter.signature_date ? new Date(selectedDoc.source_letter.signature_date).toLocaleDateString() : ''}</span>
                      </div>
                      <div className="mb-8 space-y-1 text-sm">
                        {(selectedDoc.source_letter.recipients ?? []).map((recipient) => (
                          <p key={recipient.letter_recipient_id}>
                            {recipient.recipient_label ?? recipient.user?.designation ?? recipient.organization?.organization_name ?? ''}
                            {!recipient.recipient_label && recipient.user?.organization?.organization_name ? `, ${recipient.user.organization.organization_name}` : ''}
                          </p>
                        ))}
                      </div>
                      <h3 className="mb-8 text-center text-lg font-bold underline">{htmlToPlainText(selectedDoc.source_letter.title)}</h3>
                      <p className="whitespace-pre-wrap text-justify text-sm leading-7">{htmlToPlainText(selectedDoc.source_letter.content)}</p>
                      <div className="mt-12 space-y-1 text-sm">
                        <p>{htmlToPlainText(selectedDoc.source_letter.signatory_name)}</p>
                        <p>{htmlToPlainText(selectedDoc.source_letter.designation)}</p>
                      </div>
                    </div>
                  ) : hasHtml(selectedDoc.full_content) ? (
                    <div
                      className="mx-auto shrink-0 box-border bg-white px-[20mm] pb-[25mm] pl-[30mm] pt-[30mm] shadow-xl"
                      style={{ width: '8.27in', minHeight: '11.69in', fontFamily: "'Noto Sans Sinhala', 'DejaVu Sans', sans-serif", fontSize: '12pt', lineHeight: '1.75' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeDocumentHtml(selectedDoc.full_content ?? '') }}
                    />
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8">
                      <div className="border-b-2 border-slate-800 pb-4 text-center">
                        <h3 className="text-xl font-bold text-blue-900">SOUTHERN PROVINCIAL COUNCIL</h3>
                        <p className="mt-1 text-sm text-slate-500">Department of Development & Infrastructure</p>
                      </div>

                      <div className="mt-4 flex justify-between text-sm">
                        <div>
                          <p className="text-slate-400">DATE</p>
                          <p className="font-semibold text-slate-900">
                            {new Date(selectedDoc.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400">SUBJECT CODE</p>
                          <p className="font-semibold text-slate-900">{selectedDoc.subject_code ?? '—'}</p>
                        </div>
                      </div>

                      <p className="mt-6 font-bold text-slate-900">Subject: {selectedDoc.subject}</p>

                      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                        {selectedDoc.full_content ?? selectedDoc.description}
                      </p>

                      <div className="mt-10 flex justify-between text-sm">
                        <div>
                          <p className="border-t border-slate-400 pt-1 text-slate-500">Prepared By</p>
                          <p className="font-semibold text-slate-900">{selectedDoc.submitter?.full_name ?? 'Unknown submitter'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-900">SIGNED</p>
                          <p className="text-slate-400">Authorized By</p>
                          <p className="font-semibold text-slate-500">
                            {selectedDoc.status === 'approved' ? 'Approved' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="mt-6 space-y-3">
                  {(selectedDoc.steps ?? []).map((step) => (
                    <div key={step.step_id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
                      <span className="font-medium text-slate-700">{step.step_label}</span>
                      <span className="text-slate-400">
                        {step.actioned_by?.full_name ?? '—'} {step.actioned_at ? `· ${timeAgo(step.actioned_at)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'attachments' && (
                <div className="mt-6 text-sm text-slate-400">No attachments uploaded.</div>
              )}

              {/* Comments */}
              <div className="mt-8">
                <h3 className="mb-4 text-sm font-semibold text-slate-700">💬 Comments & Discussion</h3>
                <div className="space-y-4">
                  {(selectedDoc.comments ?? []).map((c) => (
                    <div key={c.comment_id} className="flex gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {c.user?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="flex-1 rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{c.user?.full_name ?? 'Unknown user'}</p>
                          <p className="text-xs text-slate-400">{timeAgo(c.created_at)}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{c.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    placeholder="Add your comment or observation here..."
                    className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <div className="mt-2 flex justify-end gap-3">
                    <button onClick={() => setCommentText('')} className="text-sm font-medium text-slate-500 hover:underline">
                      Clear
                    </button>
                    <button
                      onClick={handlePostComment}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={showRejectConfirmation}
        title={`Reject ${selectedDoc?.document_type === 'letter' ? 'letter' : selectedDoc?.document_type === 'minute' ? 'minute' : 'document'}?`}
        message={`Are you sure you want to reject ${selectedDoc?.document_type === 'letter' ? `letter ${selectedDoc.subject_code ?? selectedDoc.subject}` : selectedDoc?.document_type === 'minute' ? `minute ${selectedDoc.subject_code ?? selectedDoc.subject}` : selectedDoc?.subject ?? 'this document'}? The submitting officer will be notified${commentText.trim() ? ' with your current observation' : ''}.`}
        confirmLabel={selectedDoc?.document_type === 'letter' ? 'Reject Letter' : selectedDoc?.document_type === 'minute' ? 'Reject Minute' : 'Reject Document'}
        isProcessing={isActing}
        variant="danger"
        onConfirm={confirmReject}
        onCancel={() => setShowRejectConfirmation(false)}
      />
    </DashboardLayout>
  );
}
