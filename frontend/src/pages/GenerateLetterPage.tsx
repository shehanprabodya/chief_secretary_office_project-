import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  Save, Eye, Printer, Play, Send,
  Download, History, Trash2,
  CalendarDays, CheckCircle, Clock, FileText, MapPin, XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import RichTextEditor from '../components/Letters/RichTextEditor';
import RecipientTagInput from '../components/Letters/RecipientTagInput';
import PreviewModal from '../components/Letters/PreviewModal';
import ActionMessage, { type ActionMessageType } from '../components/shared/ActionMessage';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { letterService } from '../services/letterService';
import { approvalService } from '../services/approvalService';
import { useAuth } from '../context/AuthContext';
import type {  Organization, Subject, RecipientTag, LetterStatus } from '../types/letter';
import type { ApprovableDocument, ApprovalStep } from '../types/approval';
import type { Meeting } from '../types/meeting';

type ApiError = {
  response?: {
    data?: {
      message?: unknown;
      errors?: Record<string, unknown>;
    };
  };
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as ApiError)?.response?.data;
  const firstError = data?.errors ? Object.values(data.errors).flat()[0] : null;

  return String(firstError || data?.message || fallback);
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

type StatusStepState = 'complete' | 'current' | 'waiting' | 'rejected';

type StatusItem = {
  label: string;
  sub: string;
  state: StatusStepState;
};

const LETTER_STATUS_LABELS: Record<LetterStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  dispatched: 'Dispatched',
};

const approvalStepToStatusItem = (label: string, step?: ApprovalStep): StatusItem => {
  if (!step) {
    return { label, sub: 'Waiting', state: 'waiting' };
  }

  if (step.status === 'approved') {
    return { label, sub: 'Approved', state: 'complete' };
  }

  if (step.status === 'pending') {
    return { label, sub: 'Pending', state: 'current' };
  }

  if (step.status === 'rejected') {
    return { label, sub: 'Rejected', state: 'rejected' };
  }

  return { label, sub: 'Waiting', state: 'waiting' };
};

function StatusStep({ item, index, isLast }: {
  item: StatusItem; index: number; isLast: boolean;
}) {
  const isDone = item.state === 'complete';
  const isCurrent = item.state === 'current';
  const isRejected = item.state === 'rejected';

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            isDone
              ? 'bg-green-600 text-white'
              : isRejected
              ? 'bg-red-600 text-white'
              : isCurrent
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-slate-200 text-slate-500'
          }`}
        >
          {isDone ? <CheckCircle className="h-4 w-4" /> : isRejected ? <XCircle className="h-4 w-4" /> : index + 1}
        </div>
        {!isLast && <div className={`mt-1 h-8 w-px ${isDone ? 'bg-green-300' : isRejected ? 'bg-red-300' : 'bg-slate-200'}`} />}
      </div>
      <div className="pt-0.5">
        <p className={`text-sm font-semibold ${isDone || isCurrent || isRejected ? 'text-slate-900' : 'text-slate-400'}`}>
          {item.label}
        </p>
        <p className={`text-xs ${isRejected ? 'text-red-500' : isCurrent ? 'text-blue-500' : 'text-slate-400'}`}>{item.sub}</p>
      </div>
    </div>
  );
}

export default function GenerateLetterPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const createdMeeting = (location.state as { meeting?: Meeting } | null)?.meeting;

  // Form state
  const [letterId, setLetterId] = useState<number | null>(id ? Number(id) : null);
  const [meetingId, setMeetingId] = useState<number | null>(createdMeeting?.meeting_id ?? null);
  const [meetingContext] = useState<Meeting | null>(createdMeeting ?? null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [designation, setDesignation] = useState('ප්‍රධාන ලේකම්');
  const [actingAuthority, setActingAuthority] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatureDate, setSignatureDate] = useState('');
  const [recipients, setRecipients] = useState<RecipientTag[]>([]);
  const [letterOwnerId, setLetterOwnerId] = useState<number | null>(id ? null : Number(user?.id ?? 0));

  // Data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingApproval, setIsSendingApproval] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [letterStatus, setLetterStatus] = useState<LetterStatus>('draft');
  const [approvalDocument, setApprovalDocument] = useState<ApprovableDocument | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved');
  const [actionMessage, setActionMessage] = useState<{ type: ActionMessageType; text: string } | null>(null);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [showGenerateConfirmation, setShowGenerateConfirmation] = useState(false);
  const [showApprovalConfirmation, setShowApprovalConfirmation] = useState(false);
  const [approvedRevision, setApprovedRevision] = useState<string | null>(null);
  const isExistingLetter = Boolean(id);
  const canEditLetter = !isExistingLetter || (letterOwnerId !== null && String(letterOwnerId) === user?.id);
  const isReadOnly = !canEditLetter;

  const currentRevision = useMemo(() => JSON.stringify({
    subjectId,
    title,
    content,
    designation,
    signatoryName,
    signatureDate,
    recipients: recipients.map((recipient) => ({
      organization_id: recipient.organization_id ?? null,
      user_id: recipient.user_id ?? null,
      recipient_label: recipient.recipient_label ?? null,
    })),
  }), [content, designation, recipients, signatoryName, signatureDate, subjectId, title]);

  const isApprovedWithoutChanges = letterStatus === 'approved'
    && approvedRevision !== null
    && currentRevision === approvedRevision;
  const actionsLocked = letterStatus === 'pending_approval' || isApprovedWithoutChanges;

  const refreshStatus = useCallback(async (idToRefresh: number, silent = false) => {
    if (!silent) setIsStatusLoading(true);

    try {
      const [letter, approvalDocuments] = await Promise.all([
        letterService.getById(idToRefresh),
        approvalService.list(undefined, 'all'),
      ]);

      setLetterStatus(letter.status);
      if (letter.status === 'approved' && approvedRevision === null) {
        setApprovedRevision(JSON.stringify({
          subjectId: letter.subject_id,
          title: letter.title,
          content: letter.content,
          designation: letter.designation ?? 'ප්‍රධාන ලේකම්',
          signatoryName: letter.signatory_name ?? '',
          signatureDate: letter.signature_date ?? '',
          recipients: letter.recipients.map((recipient) => ({
            organization_id: recipient.organization_id ?? null,
            user_id: recipient.user_id ?? null,
            recipient_label: recipient.recipient_label ?? null,
          })),
        }));
      }
      setApprovalDocument(
        approvalDocuments.find((document) => document.document_type === 'letter' && document.source_id === idToRefresh) ?? null
      );
    } catch (err) {
      console.error('Failed to refresh letter status:', err);
    } finally {
      if (!silent) setIsStatusLoading(false);
    }
  }, [approvedRevision]);

  // Load data
  useEffect(() => {
    letterService.getOrganizations().then(setOrganizations);
    letterService.getSubjects().then(setSubjects);
  }, []);

  // Load draft if editing
  useEffect(() => {
    if (!id) return;
    letterService.getById(Number(id)).then((letter) => {
      setLetterId(letter.letter_id);
      setMeetingId(letter.meeting_id);
      setLetterOwnerId(letter.created_by);
      setLetterStatus(letter.status);
      setSubjectId(letter.subject_id);
      setTitle(letter.title);
      setContent(letter.content);
      setDesignation(letter.designation ?? 'ප්‍රධාන ලේකම්');
      setSignatoryName(letter.signatory_name ?? '');
      setSignatureDate(letter.signature_date ?? '');
      setRecipients(
        letter.recipients.map((r, i) => ({
          ...r,
          id: `loaded-${i}`,
        }))
      );
      if (letter.status === 'approved') {
        setApprovedRevision(JSON.stringify({
          subjectId: letter.subject_id,
          title: letter.title,
          content: letter.content,
          designation: letter.designation ?? 'ප්‍රධාන ලේකම්',
          signatoryName: letter.signatory_name ?? '',
          signatureDate: letter.signature_date ?? '',
          recipients: letter.recipients.map((recipient) => ({
            organization_id: recipient.organization_id ?? null,
            user_id: recipient.user_id ?? null,
            recipient_label: recipient.recipient_label ?? null,
          })),
        }));
      }
    });
  }, [id]);

  useEffect(() => {
    if (!letterId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshStatus(letterId);
    const intervalId = window.setInterval(() => {
      refreshStatus(letterId, true);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [letterId, refreshStatus]);

  const statusItems = useMemo<StatusItem[]>(() => {
    const steps = approvalDocument?.steps ?? [];
    const findStep = (order: number) => steps.find((step) => step.step_order === order);

    return [
      {
        label: 'Draft',
        sub: LETTER_STATUS_LABELS[letterStatus],
        state: letterStatus === 'draft'
          ? 'current'
          : letterStatus === 'rejected'
          ? 'rejected'
          : 'complete',
      },
      {
        label: 'Officer Submit',
        sub: approvalDocument ? 'Submitted' : 'Not submitted',
        state: approvalDocument ? 'complete' : 'waiting',
      },
      approvalStepToStatusItem('Dept Head Review', findStep(2)),
      approvalStepToStatusItem('Deputy Review', findStep(3)),
      approvalStepToStatusItem('Chief Secretary', findStep(4)),
    ];
  }, [approvalDocument, letterStatus]);

  const buildPayload = useCallback(() => ({
    letter_id: letterId ?? undefined,
    meeting_id: meetingId ?? undefined,
    subject_id: subjectId ?? undefined,
    title,
    content,
    designation,
    signatory_name: signatoryName || undefined,
    signature_date: signatureDate || undefined,
    recipients: recipients.map((r) => ({
      organization_id: r.organization_id,
      user_id: r.user_id,
      recipient_label: r.recipient_label,
    })),
  }), [content, designation, letterId, meetingId, recipients, signatoryName, signatureDate, subjectId, title]);

  const handleSaveDraft = useCallback(async (silent = false) => {
    if (!canEditLetter) return;
    if (!silent) setIsSaving(true);
    if (!silent) setActionMessage(null);
    setSaveStatus('saving');
    try {
      const saved = await letterService.saveDraft(buildPayload());
      setLetterId(saved.letter_id);
      setLetterStatus(saved.status);
      setSaveStatus('saved');
      if (!silent) {
        setActionMessage({ type: 'success', text: 'Letter draft saved successfully.' });
        navigate(`/letters/${saved.letter_id}`, { replace: true });
      }
    } catch (err: unknown) {
      console.error(err);
      setSaveStatus('unsaved');
      if (!silent) {
        setActionMessage({ type: 'error', text: getErrorMessage(err, 'Failed to save draft') });
      }
    } finally {
      if (!silent) setIsSaving(false);
    }
  }, [buildPayload, canEditLetter, navigate]);

  // Auto-save draft every 30 seconds if there's content
  useEffect(() => {
    if (!canEditLetter) return;
    if (!content && !title) return;
    const timer = setTimeout(() => {
      handleSaveDraft(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [canEditLetter, content, handleSaveDraft, title]);

  const handleGenerate = async () => {
    if (!canEditLetter || actionsLocked) return;
    setShowGenerateConfirmation(false);
    setIsGenerating(true);
    setActionMessage({ type: 'info', text: 'Generating the meeting letter. Please wait…' });
    try {
      const saved = await letterService.saveDraft(buildPayload());
      const idToGenerate = saved.letter_id;

      setLetterId(idToGenerate);
      setLetterStatus(saved.status);
      const result = await letterService.generate(idToGenerate);
      setPreviewHtml(result.generated_html);
      setShowPreview(true);
      setActionMessage({ type: 'success', text: 'Letter generated successfully and is ready to preview.' });
    } catch (err: unknown) {
      console.error(err);
      setSaveStatus('unsaved');
      setActionMessage({ type: 'error', text: getErrorMessage(err, 'Failed to generate letter') });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (!letterId) {
      setActionMessage({ type: 'info', text: 'Please save the draft before previewing the letter.' });
      return;
    }
    try {
      if (!canEditLetter) {
        const result = await letterService.preview(letterId);
        setPreviewHtml(result.preview_html);
        setShowPreview(true);
        return;
      }

      const saved = await letterService.saveDraft(buildPayload());
      setLetterId(saved.letter_id);
      setLetterStatus(saved.status);
      const result = await letterService.preview(saved.letter_id);
      setPreviewHtml(result.preview_html);
      setShowPreview(true);
    } catch (err: unknown) {
      console.error(err);
      setActionMessage({ type: 'error', text: getErrorMessage(err, 'Failed to preview letter') });
    }
  };

  const handlePrint = () => {
    if (!previewHtml) {
      setActionMessage({ type: 'info', text: 'Please generate or preview the letter before printing.' });
      return;
    }
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Print Letter</title>
          <style>
            @font-face {
              font-family: 'Iskoola Pota';
              src: url('/fonts/Iskoola Pota Regular.ttf') format('truetype');
              font-style: normal;
              font-weight: 400;
            }
            @page { size: Letter portrait; margin: 1in; }
            html, body { margin: 0; padding: 0; }
            body { font-family: 'Iskoola Pota', 'Noto Sans Sinhala', 'DejaVu Sans', sans-serif; font-size: 12pt; }
            .letter-page { width: 100%; box-sizing: border-box; }
            .letter-page, .letter-page * { word-spacing: -1.5pt; }
            .letter-page .body, .letter-page .body * { word-spacing: -1.5pt !important; }
          </style>
        </head>
        <body>${previewHtml}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handleDownloadPdf = async () => {
    if (!canEditLetter) return;
    if (!letterId) { setActionMessage({ type: 'info', text: 'Please save the draft before downloading a PDF.' }); return; }
    try {
      const saved = await letterService.saveDraft(buildPayload());
      setLetterId(saved.letter_id);
      setLetterStatus(saved.status);
      await letterService.downloadPdf(saved.letter_id);
      setActionMessage({ type: 'success', text: 'The PDF download was prepared successfully.' });
    } catch (err: unknown) {
      console.error(err);
      setActionMessage({ type: 'error', text: getErrorMessage(err, 'Failed to download PDF') });
    }
  };

  const handleDownloadDocx = async () => {
    if (!canEditLetter) return;
    if (!letterId) { setActionMessage({ type: 'info', text: 'Please save the draft before downloading a DOCX file.' }); return; }
    try {
      const saved = await letterService.saveDraft(buildPayload());
      setLetterId(saved.letter_id);
      setLetterStatus(saved.status);
      await letterService.downloadDocx(saved.letter_id);
      setActionMessage({ type: 'success', text: 'The DOCX download was prepared successfully.' });
    } catch (err: unknown) {
      console.error(err);
      setActionMessage({ type: 'error', text: getErrorMessage(err, 'Failed to download DOCX') });
    }
  };

  const handleSendForApproval = async () => {
    if (!canEditLetter || actionsLocked) return;
    setShowApprovalConfirmation(false);
    setIsSendingApproval(true);
    setActionMessage({ type: 'info', text: 'Sending the letter for approval. Please wait…' });
    try {
      const saved = await letterService.saveDraft(buildPayload());
      setLetterId(saved.letter_id);

      const result = await letterService.generate(saved.letter_id);
      const selectedSubject = subjects.find((subject) => subject.id === subjectId);
      const approvalSubject = stripHtml(title) || selectedSubject?.title || selectedSubject?.code || `Letter ${saved.letter_id}`;
      const description = stripHtml(content).slice(0, 300);

      const submittedDocument = await approvalService.submit({
        document_type: 'letter',
        source_id: saved.letter_id,
        subject: approvalSubject,
        description,
        full_content: result.generated_html,
      });

      setApprovalDocument(submittedDocument);
      setLetterStatus('pending_approval');

      setActionMessage({ type: 'success', text: 'Letter sent for approval successfully. Opening the approvals page…' });
      window.setTimeout(() => navigate('/approvals'), 1800);
    } catch (err: unknown) {
      console.error(err);
      setActionMessage({ type: 'error', text: getErrorMessage(err, 'Failed to send letter for approval') });
    } finally {
      setIsSendingApproval(false);
    }
  };

  const handleDiscard = async () => {
    if (!canEditLetter) return;
    setShowDiscardConfirmation(false);
    navigate('/meetings');
  };

  return (
    <DashboardLayout pageTitle="Generate Meeting Letter">
      <div className="space-y-4">
        {/* Breadcrumb + Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Meetings &nbsp;›&nbsp;
              <span className="font-bold text-slate-700">Generate Letter</span>
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Generate Meeting Letter</h1>
          </div>

          {/* Top Action Buttons */}
          <div className="flex items-center gap-2">
            {canEditLetter && (
              <button
                onClick={() => handleSaveDraft()}
                disabled={isSaving}
                className="flex w-36 items-center gap-2  border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            <button
              onClick={handlePreview}
              className="flex w-36 items-center gap-2  border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <Eye className="h-4 w-4" /> Preview
            </button>
            {canEditLetter && (
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            )}
          </div>
        </div>

        {actionMessage && (
          <div className="fixed right-5 top-5 z-[70] w-[min(26rem,calc(100vw-2.5rem))] shadow-lg">
            <ActionMessage
              type={actionMessage.type}
              message={actionMessage.text}
              onDismiss={() => setActionMessage(null)}
            />
          </div>
        )}

        {meetingContext && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Created meeting</p>
                <p className="mt-1 font-semibold text-slate-900">{meetingContext.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(`${meetingContext.meeting_date.slice(0, 10)}T00:00:00`).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {meetingContext.start_time?.slice(0, 5)} – {meetingContext.end_time?.slice(0, 5)}
                  </span>
                  {meetingContext.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {meetingContext.location}
                    </span>
                  )}
                </div>
              </div>
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Step 2 of 2
              </span>
            </div>
          </div>
        )}

        {/* Auto-save indicator */}
        {canEditLetter ? (
          <p className="text-xs text-slate-400">
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Draft saved' : 'Unsaved changes'}
          </p>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Preview only. This letter was created by another officer and cannot be edited from your account.
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          {/* Main Form  */}
          <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="text-slate-400">≡</span>
              <h2 className="text-sm font-semibold text-slate-700">Letter Details</h2>
            </div>

            {/* Row 1: Subject Code + Recipient Details */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Subject Code
                </label>
                <select
                  value={subjectId ?? ''}
                  onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
                  disabled={isReadOnly}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  title="Select Subject Code"
                >
                  <option value="">Select subject code</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Recipient Details
                </label>
                <RecipientTagInput
                  organizations={organizations}
                  recipients={recipients}
                  onChange={setRecipients}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Letter Title */}
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Letter Title
              </label>
              <RichTextEditor
                value={title}
                onChange={setTitle}
                placeholder="Enter letter title here..."
                minHeight="80px"
                readOnly={isReadOnly}
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Content
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write the main body of the letter here..."
                minHeight="350px"
                readOnly={isReadOnly}
              />
            </div>

            {/* Signature Section */}
            <div className="border-t border-slate-100 pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Primary Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    readOnly={isReadOnly}
                    placeholder="Chief Secretary"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Signature Space */}
                <div className="flex items-end">
                  <div className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 py-6 text-sm text-slate-400">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl text-slate-300">✒</span>
                      Place Signature Here
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Acting / Departmental Authority (Optional)
                  </label>
                  <input
                    type="text"
                    value={actingAuthority}
                    onChange={(e) => setActingAuthority(e.target.value)}
                    readOnly={isReadOnly}
                    placeholder="e.g. Acting Director, Head of Division"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Name of Signatory
                    </label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      readOnly={isReadOnly}
                      placeholder="Enter full name"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Letter Date
                    </label>
                    <input
                      type="date"
                      value={signatureDate}
                      onChange={(e) => setSignatureDate(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Execution Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="text-slate-400">⚡</span> Execution
              </h3>
              <div className="flex flex-col gap-3">
                {canEditLetter ? (
                  <>
                    {actionsLocked && (
                      <ActionMessage
                        type="info"
                        message={letterStatus === 'pending_approval'
                          ? 'This letter is currently in the approval workflow. Generate and submission actions are unavailable.'
                          : 'This letter is approved. Edit the letter to enable generation and resubmission.'}
                      />
                    )}
                    <button
                      onClick={() => setShowGenerateConfirmation(true)}
                      disabled={isGenerating || actionsLocked}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {isGenerating ? 'Generating...' : 'Generate Letter'}
                    </button>
                    <button
                      onClick={() => setShowApprovalConfirmation(true)}
                      disabled={isSendingApproval || actionsLocked}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {isSendingApproval ? 'Sending...' : 'Send for Approval'}
                    </button>
                  
                    <button
                      onClick={handleDownloadPdf}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-200 py-2.5 text-sm font-medium text-teal hover:bg-teal-500"
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </button>
                    <button
                      onClick={handleDownloadDocx}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-100 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-200"
                    >
                      <FileText className="h-4 w-4" /> Download DOCX
                    </button>
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate- hover:opacity-90 disabled:opacity-50"
                      title="Revision history - coming soon"
                    >
                      <History className="h-4 w-4" /> Revision History
                    </button>
                    <button
                      onClick={() => setShowDiscardConfirmation(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400 bg-red-50 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" /> Discard Draft
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handlePreview}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <Eye className="h-4 w-4" /> Preview Letter
                  </button>
                )}
              </div>
            </div>

            {/* Status Workflow */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Clock className="h-4 w-4 text-blue-500" /> Status
                </h3>
                {isStatusLoading && <span className="text-[11px] text-blue-500">Refreshing...</span>}
              </div>
              <div className="space-y-0">
                {statusItems.map((item, index) => (
                  <StatusStep
                    key={item.label}
                    item={item}
                    index={index}
                    isLast={index === statusItems.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          html={previewHtml}
          letterId={letterId!}
          allowExports={canEditLetter}
          onClose={() => setShowPreview(false)}
        />
      )}
      <ConfirmDialog
        open={showGenerateConfirmation}
        title="Generate Letter"
        message="Generate this meeting letter now? The latest letter details will be saved and used to create the preview."
        confirmLabel="Generate Letter"
        isProcessing={isGenerating}
        onConfirm={handleGenerate}
        onCancel={() => setShowGenerateConfirmation(false)}
      />
      <ConfirmDialog
        open={showApprovalConfirmation}
        title="Send for Approval"
        message="Send this letter into the approval workflow? Please confirm that the subject, recipients, content, and signature details are correct."
        confirmLabel="Send for Approval"
        isProcessing={isSendingApproval}
        onConfirm={handleSendForApproval}
        onCancel={() => setShowApprovalConfirmation(false)}
      />
      <ConfirmDialog
        open={showDiscardConfirmation}
        title="Discard Draft"
        message="Are you sure you want to discard this draft? Unsaved changes cannot be recovered."
        confirmLabel="Discard Draft"
        onConfirm={handleDiscard}
        onCancel={() => setShowDiscardConfirmation(false)}
      />
    </DashboardLayout>
  );
}
