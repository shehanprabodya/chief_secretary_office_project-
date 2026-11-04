import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, RefreshCw, Filter, Pencil, X } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import WorkflowTracker from '../components/Approvals/WorkflowTracker';
import DecisionResponsibilityInput from '../components/Minutes/DecisionResponsibilityInput';
import { approvalService } from '../services/approvalService';
import { minuteService } from '../services/minuteService';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import LetterPreviewDocument from '../components/Letters/LetterPreviewDocument';
import type { ApprovableDocument } from '../types/approval';
import type { EligibleDeputy } from '../types/approval';
import type { DepartmentHeadEditPayload } from '../services/approvalService';
import RecipientTagInput from '../components/Letters/RecipientTagInput';
import type { Organization, RecipientTag } from '../types/letter';
import type { MeetingAttendee } from '../types/meeting';

type LetterEdit = Extract<DepartmentHeadEditPayload, { title: string }> & { recipients: RecipientTag[] };
type MinuteEdit = {
  meeting_description?: string | null;
  discussion_summary?: string | null;
  closing_remarks?: string | null;
  signatory_name?: string | null;
  signatory_designation?: string | null;
  decisions: Array<{
    row_key: string;
    decision_id?: number;
    topic: string | null;
    decision_text: string;
    responsibility: string | null;
  }>;
};

const attendeeResponsibilityLabel = (attendee: MeetingAttendee) => [
  `${attendee.full_name}${attendee.designation ? ` — ${attendee.designation}` : ''}`,
  attendee.organization?.organization_name,
  attendee.organization?.address,
].filter(Boolean).join(', ');

const selectedResponsibilityIds = (responsibility: string | null | undefined, attendees: MeetingAttendee[] = []): number[] => {
  if (!responsibility) return [];

  try {
    const parsed: unknown = JSON.parse(responsibility);
    if (Array.isArray(parsed)) {
      return parsed.map(Number).filter((id) => Number.isInteger(id));
    }
  } catch {
    // Legacy responsibility values may be plain labels.
  }

  const legacyAttendee = attendees.find((attendee) => attendeeResponsibilityLabel(attendee) === responsibility);
  return legacyAttendee ? [legacyAttendee.user_id] : [];
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

function htmlToPlainText(value?: string | null): string {
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
  const location = useLocation();
  const requestedDocumentId = Number((location.state as { selectedDocumentId?: number } | null)?.selectedDocumentId) || null;
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
  const [minuteAttendees, setMinuteAttendees] = useState<MeetingAttendee[]>([]);
  const [recipientOrganizations, setRecipientOrganizations] = useState<Organization[]>([]);
  const [forwardMode, setForwardMode] = useState<'approve' | 'edit' | null>(null);
  const [eligibleDeputies, setEligibleDeputies] = useState<EligibleDeputy[]>([]);
  const [isLoadingDeputies, setIsLoadingDeputies] = useState(false);
  const [deputyLookupError, setDeputyLookupError] = useState<string | null>(null);
  const [selectedDeputyId, setSelectedDeputyId] = useState('');
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signPassword, setSignPassword] = useState('');
  const [signConfirmed, setSignConfirmed] = useState(false);
  const [showChiefSignReminder, setShowChiefSignReminder] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const selectedDocumentId = useRef<number | null>(requestedDocumentId);
  const minutePdfUrlRef = useRef<string | null>(null);
  const minuteRowCounter = useRef(0);

  const clearMinutePdfPreview = useCallback(() => {
    if (minutePdfUrlRef.current) URL.revokeObjectURL(minutePdfUrlRef.current);
    minutePdfUrlRef.current = null;
    setMinutePdfUrl(null);
    setIsMinutePdfLoading(false);
  }, []);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await approvalService.list(search || undefined);
      setDocuments(docs);
      const selectedId = docs.some((doc) => doc.document_id === selectedDocumentId.current)
        ? selectedDocumentId.current
        : docs[0]?.document_id;
      if (!selectedId) {
        selectedDocumentId.current = null;
        setSelectedDoc(null);
        return;
      }
      if (selectedDocumentId.current !== selectedId) {
        clearMinutePdfPreview();
      }
      setIsDetailLoading(true);
      try {
        selectedDocumentId.current = selectedId;
        setSelectedDoc(await approvalService.getById(selectedId));
      } catch (detailError) {
        console.error(detailError);
        setSelectedDoc(docs.find((doc) => doc.document_id === selectedId) ?? null);
      } finally {
        setIsDetailLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load approvals. Please refresh or login again.');
    } finally {
      setIsLoading(false);
    }
  }, [clearMinutePdfPreview, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [fetchList]);

  const handleSelectDoc = async (id: number) => {
    selectedDocumentId.current = id;
    clearMinutePdfPreview();
    setIsDetailLoading(true);
    try {
      const doc = await approvalService.getById(id);
      setIsEditing(false);
      setLetterEdit(null);
      setMinuteEdit(null);
      setMinuteAttendees([]);
      setSelectedDoc(doc);
      setActiveTab('preview');
    } catch (detailError) {
      console.error(detailError);
      setError('Could not load this approval document. Refresh and try again.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const currentStep = selectedDoc?.steps?.find((s) => s.step_order === selectedDoc.current_step_order);
  const canAct = currentStep && user && currentStep.required_role === user.role && currentStep.status === 'pending'
    && (!currentStep.assigned_to || Number(currentStep.assigned_to) === Number(user.id));
  const canSignDocument = Boolean(
    user && ['chief_secretary', 'deputy'].includes(user.role) && currentStep && currentStep.required_role === user.role && currentStep.status === 'pending'
      && (!currentStep.assigned_to || Number(currentStep.assigned_to) === Number(user.id)),
  );
  const canEditSubmitted = Boolean(canAct && user?.role === 'dept_head' && ['letter', 'minute'].includes(selectedDoc?.document_type ?? ''));
  const requiresDeputySelection = Boolean(canAct && user?.role === 'dept_head' && ['letter', 'minute'].includes(selectedDoc?.document_type ?? ''));
  const deputySinhalaName = user?.full_name_si?.trim() || user?.full_name || '';
  const deputySinhalaDesignation = user?.designation_si?.trim() || user?.designation || 'නියෝජ්‍ය ප්‍රධාන ලේකම්';

  const openForwardDialog = async (mode: 'approve' | 'edit') => {
    setForwardMode(mode);
    setSelectedDeputyId('');
    setEligibleDeputies([]);
    setDeputyLookupError(null);
    setIsLoadingDeputies(true);
    try {
      setEligibleDeputies(await approvalService.eligibleDeputies());
    } catch (lookupError) {
      console.error(lookupError);
      setDeputyLookupError('Could not load active Deputy Chief Secretaries. Close this dialog and try again.');
    } finally {
      setIsLoadingDeputies(false);
    }
  };

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
        const minute = await approvalService.getDepartmentHeadMinute(selectedDoc.source_minute.minute_id);
        setMinuteAttendees(minute.meeting?.attendees ?? []);
        setMinuteEdit({
          meeting_description: minute.meeting_description,
          discussion_summary: minute.discussion_summary,
          closing_remarks: minute.closing_remarks,
          signatory_name: minute.signatory_name,
          signatory_designation: minute.signatory_designation,
          decisions: (minute.decisions ?? []).map((decision) => ({
            row_key: `decision-${decision.decision_id}`,
            decision_id: decision.decision_id,
            topic: decision.topic,
            decision_text: decision.decision_text,
            responsibility: decision.responsibility,
          })),
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
    await openForwardDialog('edit');
  };

  const addMinuteDecisionRow = () => {
    setMinuteEdit((current) => {
      if (!current) {
        return current;
      }

      minuteRowCounter.current += 1;

      return {
        ...current,
        decisions: [
          ...current.decisions,
          {
            row_key: `new-decision-${minuteRowCounter.current}`,
            topic: null,
            decision_text: '',
            responsibility: null,
          },
        ],
      };
    });
  };

  const confirmForward = async () => {
    if (!selectedDoc || !selectedDeputyId) return;
    const minuteForwardPayload = minuteEdit
      ? {
        ...minuteEdit,
        decisions: minuteEdit.decisions.map((decision) => ({
          decision_id: decision.decision_id,
          topic: decision.topic,
          decision_text: decision.decision_text,
          responsibility: decision.responsibility,
        })),
      }
      : null;
    setIsActing(true);
    setError(null);
    try {
      const updated = forwardMode === 'edit'
          ? await approvalService.editAndForward(
          selectedDoc.document_id,
          letterEdit
            ? { ...letterEdit, recipients: letterEdit.recipients.map(({ organization_id, user_id, recipient_label }) => ({ organization_id, user_id, recipient_label })) }
            : minuteForwardPayload as DepartmentHeadEditPayload,
          commentText || undefined,
          Number(selectedDeputyId),
        )
        : await approvalService.approve(selectedDoc.document_id, commentText || undefined, Number(selectedDeputyId));
      setSelectedDoc(updated);
      setForwardMode(null);
      setIsEditing(false);
      setLetterEdit(null);
      setMinuteEdit(null);
      setMinuteAttendees([]);
      setCommentText('');
      await fetchList();
    } catch (err) {
      console.error(err);
      setError('Could not save and forward this document. Refresh the approval and try again.');
      setDeputyLookupError('Forwarding failed. Your changes are still available; check the connection and try again.');
    } finally {
      setIsActing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDoc) return;
    if (requiresDeputySelection) {
      await openForwardDialog('approve');
      return;
    }

    if (user?.role === 'chief_secretary' && canSignDocument && !isEditing) {
      setShowChiefSignReminder(true);
      return;
    }

    await performApprove();
  };

  const performApprove = async () => {
    if (!selectedDoc) return;
    setIsActing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await approvalService.approve(selectedDoc.document_id, commentText || undefined);
      setSelectedDoc(updated);
      setCommentText('');
      await fetchList();
    } catch (approveError) {
      console.error(approveError);
      const maybeError = approveError as { response?: { data?: { message?: string } } };
      setError(maybeError.response?.data?.message ?? 'Could not approve this document. It may have already moved to another stage. Refresh and try again.');
    } finally {
      setIsActing(false);
    }
  };

  const handleSignDocument = async () => {
    if (!selectedDoc) return;
    setShowSignDialog(true);
    setSignConfirmed(false);
    setSignPassword('');
  };

  const confirmDocumentSigning = async () => {
    if (!selectedDoc || !signPassword.trim()) {
      setError('Enter your password to sign this document.');
      return;
    }
    if (!signConfirmed) {
      setError('Please confirm that you are signing as the authorized signatory.');
      return;
    }

    setIsActing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await approvalService.signDocument(
        selectedDoc.document_type,
        selectedDoc.document_id,
        signPassword,
        selectedDoc.source_id ?? undefined,
      );
      setShowSignDialog(false);
      setSignPassword('');
      setSignConfirmed(false);
      if (result.auto_approved) {
        setSuccessMessage('නියෝජ්‍ය ප්‍රධාන ලේකම් විසින් ප්‍රධාන ලේකම් වෙනුවෙන් ලේඛනය අත්සන් කර සාර්ථකව අනුමත කරන ලදී.');
      } else {
        setSuccessMessage(result.message || 'Document signed successfully.');
      }
      await fetchList();
    } catch (signError) {
      console.error(signError);
      const maybeError = signError as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const firstValidationMessage = maybeError.response?.data?.errors
        ? Object.values(maybeError.response.data.errors).flat()[0]
        : null;
      setError(firstValidationMessage || maybeError.response?.data?.message || 'Could not sign this document. Check your password, delegation status, or uploaded signature image.');
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

  const selectedDocumentType = selectedDoc?.document_type;
  const selectedMinuteId = selectedDoc?.source_id;

  useEffect(() => {
    if (selectedDocumentType !== 'minute' || selectedMinuteId == null) {
      return;
    }

    let isMounted = true;
    const loadMinutePdf = async () => {
      setIsMinutePdfLoading(true);
      try {
        const blob = await minuteService.downloadPdf(selectedMinuteId);
        const url = URL.createObjectURL(blob);
        if (isMounted) {
          setMinutePdfUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            minutePdfUrlRef.current = url;
            return url;
          });
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Failed to load minute approval PDF preview:', err);
        if (isMounted) {
          setMinutePdfUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            minutePdfUrlRef.current = null;
            return null;
          });
          setIsMinutePdfLoading(false);
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
      if (minutePdfUrlRef.current) URL.revokeObjectURL(minutePdfUrlRef.current);
      minutePdfUrlRef.current = null;
    };
  }, [selectedDocumentType, selectedMinuteId]);

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

            {successMessage && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {successMessage}
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
                    {canSignDocument && !isEditing && (
                      <button
                        onClick={handleSignDocument}
                        disabled={isActing}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        Sign document
                      </button>
                    )}
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                      Notes/Observations
                    </button>
                    {!isEditing && <button
                      onClick={handleApprove}
                      disabled={isActing}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >{requiresDeputySelection ? 'Approve & Forward' : 'Approve'}</button>}
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
              {isDetailLoading ? (
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Loading document details…</div>
              ) : activeTab === 'preview' && (
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
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-slate-800">Decisions and responsibilities</h4>
                          <button
                            type="button"
                            onClick={addMinuteDecisionRow}
                            className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Add decision row
                          </button>
                        </div>
                        {minuteEdit.decisions.map((decision, index) => (
                          <div key={decision.row_key} className="space-y-3 rounded-lg border border-slate-200 p-4">
                            <p className="text-sm font-semibold text-slate-600">Decision {index + 1}</p>
                            <input aria-label="Decision topic" placeholder="Topic" value={decision.topic ?? ''} onChange={(e) => setMinuteEdit({ ...minuteEdit, decisions: minuteEdit.decisions.map((item) => item.row_key === decision.row_key ? { ...item, topic: e.target.value || null } : item) })} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                            <textarea aria-label="Decision text" rows={3} value={decision.decision_text} onChange={(e) => setMinuteEdit({ ...minuteEdit, decisions: minuteEdit.decisions.map((item) => item.row_key === decision.row_key ? { ...item, decision_text: e.target.value } : item) })} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                            {minuteAttendees.length > 0 ? (
                              <DecisionResponsibilityInput
                                attendees={minuteAttendees}
                                selectedIds={selectedResponsibilityIds(decision.responsibility, minuteAttendees)}
                                onChange={(selectedIds) => setMinuteEdit({
                                  ...minuteEdit,
                                  decisions: minuteEdit.decisions.map((item) => item.row_key === decision.row_key
                                    ? { ...item, responsibility: selectedIds.length > 0 ? JSON.stringify(selectedIds) : null }
                                    : item),
                                })}
                              />
                            ) : (
                              <input aria-label="Responsibility" placeholder="Responsibility" value={decision.responsibility ?? ''} onChange={(e) => setMinuteEdit({ ...minuteEdit, decisions: minuteEdit.decisions.map((item) => item.row_key === decision.row_key ? { ...item, responsibility: e.target.value || null } : item) })} className="w-full rounded-md border border-slate-300 px-3 py-2" />
                            )}
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
                  ) : hasHtml(selectedDoc.full_content) ? (
                    <LetterPreviewDocument
                      html={selectedDoc.full_content ?? ''}
                      letter={{
                        subject: { id: 0, code: selectedDoc.subject_code ?? '', title: selectedDoc.subject },
                        meeting_code: selectedDoc.subject_code ?? null,
                        signature_date: selectedDoc.source_letter?.signature_date ?? selectedDoc.created_at ?? null,
                        your_ref: '',
                      }}
                    />
                  ) : selectedDoc.document_type === 'letter' && selectedDoc.source_letter ? (
                    <LetterPreviewDocument
                      html={selectedDoc.full_content ?? selectedDoc.source_letter.content}
                      letter={{
                        subject: { id: 0, code: selectedDoc.subject_code ?? '', title: selectedDoc.subject },
                        meeting_code: selectedDoc.subject_code ?? null,
                        signature_date: selectedDoc.source_letter.signature_date ?? selectedDoc.created_at ?? null,
                        title: selectedDoc.source_letter.title,
                        designation: selectedDoc.source_letter.designation ?? undefined,
                        signatory_name: selectedDoc.source_letter.signatory_name ?? undefined,
                        your_ref: '',
                      }}
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
      {forwardMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="select-deputy-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="select-deputy-title" className="text-lg font-bold text-slate-900">Select Deputy Chief Secretary</h2>
            <p className="mt-2 text-sm text-slate-600">Choose the Deputy Chief Secretary who should receive this document for the next approval stage.</p>
            <label htmlFor="approval-deputy" className="mt-5 block text-sm font-medium text-slate-700">Deputy Chief Secretary</label>
            <select
              id="approval-deputy"
              value={selectedDeputyId}
              onChange={(event) => setSelectedDeputyId(event.target.value)}
              disabled={isLoadingDeputies || isActing}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">{isLoadingDeputies ? 'Loading eligible deputies…' : 'Select a deputy'}</option>
              {eligibleDeputies.map((deputy) => (
                <option key={deputy.user_id} value={deputy.user_id}>
                  {deputy.full_name}{deputy.designation ? ` — ${deputy.designation}` : ''}{deputy.organization?.organization_name ? ` · ${deputy.organization.organization_name}` : ''}
                </option>
              ))}
            </select>
            {deputyLookupError && <p role="alert" className="mt-3 text-sm text-red-700">{deputyLookupError}</p>}
            {eligibleDeputies.length === 0 && !isLoadingDeputies && !deputyLookupError && (
              <p role="status" className="mt-3 text-sm text-amber-700">No active Deputy Chief Secretaries are available.</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setForwardMode(null)} disabled={isActing} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmForward} disabled={!selectedDeputyId || isLoadingDeputies || isActing} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isActing ? 'Sending…' : 'Send'}
              </button>
            </div>
          </section>
        </div>
      )}
      {showSignDialog && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="sign-document-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="sign-document-title" className="text-lg font-bold text-slate-900">Sign official document</h2>
            <p className="mt-2 text-sm text-slate-600">
              {selectedDoc.document_type === 'letter' ? 'This letter' : 'This minute'} will be signed with your official signature image and saved to the document record.
            </p>

            {user?.role === 'deputy' && (
              <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
                <div className="text-xs leading-6 text-violet-900">
                  <p>ප්‍රධාන ලේකම් වෙනුවෙන්,</p>
                  <p>{deputySinhalaName}</p>
                  <p>{deputySinhalaDesignation}</p>
                  <p>දකුණු පළාත් සභාව</p>
                </div>
              </div>
            )}

            <label htmlFor="sign-password" className="mt-5 block text-sm font-medium text-slate-700">Your password</label>
            <input
              id="sign-password"
              type="password"
              value={signPassword}
              onChange={(event) => setSignPassword(event.target.value)}
              placeholder="Enter your password"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />

            <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={signConfirmed}
                onChange={(event) => setSignConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <span>I confirm that I am the authorized signatory and this document should be signed using my official signature.</span>
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowSignDialog(false)} disabled={isActing} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirmDocumentSigning} disabled={isActing || !signPassword.trim()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isActing ? 'Signing…' : 'Sign now'}
              </button>
            </div>
          </section>
        </div>
      )}
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
      <ConfirmDialog
        open={showChiefSignReminder}
        title="Sign Document First"
        message="Please sign the document first. Approving without signing is not allowed for Chief Secretary final approval."
        confirmLabel="Open Sign Dialog"
        onConfirm={() => {
          setShowChiefSignReminder(false);
          void handleSignDocument();
        }}
        onCancel={() => setShowChiefSignReminder(false)}
      />
    </DashboardLayout>
  );
}
