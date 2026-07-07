import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save, Eye, Printer, Play, Send,
  Download, History, Trash2,
  CheckCircle, Clock, 
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import RichTextEditor from '../components/Letters/RichTextEditor';
import RecipientTagInput from '../components/Letters/RecipientTagInput';
import PreviewModal from '../components/Letters/PreviewModal';
import { letterService } from '../services/letterService';
import type {  Organization, Subject, RecipientTag } from '../types/letter';

// Status Workflow Sidebar 
const WORKFLOW_STEPS = [
  { step: 1, label: 'Draft Phase',  sub: 'IN PROGRESS' },
  { step: 2, label: 'Review',       sub: 'PENDING' },
  { step: 3, label: 'Dispatch',     sub: 'FINAL' },
];

function StatusStep({ step, label, sub, currentStep }: {
  step: number; label: string; sub: string; currentStep: number;
}) {
  const isDone = step < currentStep;
  const isCurrent = step === currentStep;

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            isDone
              ? 'bg-green-600 text-white'
              : isCurrent
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-slate-200 text-slate-500'
          }`}
        >
          {isDone ? <CheckCircle className="h-4 w-4" /> : step}
        </div>
        {step < 3 && <div className="mt-1 h-8 w-px bg-slate-200" />}
      </div>
      <div className="pt-0.5">
        <p className={`text-sm font-semibold ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
          {label}
        </p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

export default function GenerateLetterPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // Form state
  const [letterId, setLetterId] = useState<number | null>(id ? Number(id) : null);
  const [meetingCode, setMeetingCode] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [designation, setDesignation] = useState('ප්‍රධාන ලේකම්');
  const [actingAuthority, setActingAuthority] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [signatureDate, setSignatureDate] = useState('');
  const [recipients, setRecipients] = useState<RecipientTag[]>([]);

  // Data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [currentStep] = useState(1); // draft = step 1, changes after send-for-approval
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved');

  const getErrorMessage = (err: any, fallback: string) => {
    const message = err?.response?.data?.message;
    const errors = err?.response?.data?.errors;
    const firstError = errors ? Object.values(errors).flat()[0] : null;

    return String(firstError || message || fallback);
  };

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
      setMeetingCode(letter.meeting_code ?? '');
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
    });
  }, [id]);

  // Auto-save draft every 30 seconds if there's content
  useEffect(() => {
    if (!content && !title) return;
    const timer = setTimeout(() => {
      handleSaveDraft(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [content, title, recipients]);

  const buildPayload = () => ({
    letter_id: letterId ?? undefined,
    meeting_code: meetingCode || undefined,
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
  });

  const handleSaveDraft = async (silent = false) => {
    if (!silent) setIsSaving(true);
    setSaveStatus('saving');
    try {
      const saved = await letterService.saveDraft(buildPayload());
      setLetterId(saved.letter_id);
      setSaveStatus('saved');
      if (!silent) {
        navigate(`/letters/${saved.letter_id}`, { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setSaveStatus('unsaved');
      if (!silent) {
        alert(getErrorMessage(err, 'Failed to save draft'));
      }
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const saved = await letterService.saveDraft(buildPayload());
      const idToGenerate = saved.letter_id;

      setLetterId(idToGenerate);
      const result = await letterService.generate(idToGenerate);
      setPreviewHtml(result.generated_html);
      setShowPreview(true);
    } catch (err: any) {
      console.error(err);
      setSaveStatus('unsaved');
      alert(getErrorMessage(err, 'Failed to generate letter'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (!letterId) {
      alert('Save the draft first to preview');
      return;
    }
    try {
      await letterService.saveDraft(buildPayload());
      const result = await letterService.preview(letterId);
      setPreviewHtml(result.preview_html);
      setShowPreview(true);
    } catch (err: any) {
      console.error(err);
      alert(getErrorMessage(err, 'Failed to preview letter'));
    }
  };

  const handlePrint = () => {
    if (!previewHtml) {
      alert('Generate or preview the letter first');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Print Letter</title></head><body>${previewHtml}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleDownloadPdf = async () => {
    if (!letterId) { alert('Save the draft first'); return; }
    try {
      await letterService.saveDraft(buildPayload());
      await letterService.downloadPdf(letterId);
    } catch (err: any) {
      console.error(err);
      alert(getErrorMessage(err, 'Failed to download PDF'));
    }
  };

  const handleDiscard = async () => {
    if (!confirm('Discard this draft? This cannot be undone.')) return;
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
            <button
              onClick={() => handleSaveDraft()}
              disabled={isSaving}
              className="flex w-36 items-center gap-2  border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handlePreview}
              className="flex w-36 items-center gap-2  border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <Eye className="h-4 w-4" /> Preview
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {/* Auto-save indicator */}
        <p className="text-xs text-slate-400">
          {saveStatus === 'saving' ? '⏳ Saving...' : saveStatus === 'saved' ? '✓ Draft saved' : '● Unsaved changes'}
        </p>

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          {/* Main Form  */}
          <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="text-slate-400">≡</span>
              <h2 className="text-sm font-semibold text-slate-700">Letter Details</h2>
            </div>

            {/* Row 1: Meeting Code + Recipient Details */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Meeting Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    placeholder="E.g. SPC/DEV/2024/08"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {/* Subject selector */}
                  <select
                    value={subjectId ?? ''}
                    onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    title="Select Subject/Project"
                  >
                    <option value="">Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Recipient Details
                </label>
                <RecipientTagInput
                  organizations={organizations}
                  recipients={recipients}
                  onChange={setRecipients}
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
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate Letter'}
                </button>
                <button
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
                  title="Approval workflow - coming soon"
                >
                  <Send className="h-4 w-4" />
                  Send for Approval
                </button>
              
                <button
                  onClick={handleDownloadPdf}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-200 py-2.5 text-sm font-medium text-teal hover:bg-teal-500"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate- hover:opacity-90 disabled:opacity-50"
                  title="Revision history - coming soon"
                >
                  <History className="h-4 w-4" /> Revision History
                </button>
                <button
                  onClick={handleDiscard}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400 bg-red-50 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" /> Discard Draft
                </button>
              </div>
            </div>

            {/* Status Workflow */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="h-4 w-4 text-blue-500" /> Status
              </h3>
              <div className="space-y-0">
                {WORKFLOW_STEPS.map((step) => (
                  <StatusStep
                    key={step.step}
                    step={step.step}
                    label={step.label}
                    sub={step.sub}
                    currentStep={currentStep}
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
          onClose={() => setShowPreview(false)}
        />
      )}
    </DashboardLayout>
  );
}
