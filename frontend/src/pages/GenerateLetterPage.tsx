import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, Printer, Send, Download, History, Trash2, Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import DepartmentTagInput from '../components/Letters/DepartmentTagInput';
import ApprovalWorkflowSidebar from '../components/Letters/ApprovalWorkflowSidebar';
import { letterService } from '../services/letterService';
import type { ApprovalStep } from '../types/letter';


const ALL_DEPARTMENTS = [
  { department_id: 1, department_name: 'Development Division' },
  { department_id: 2, department_name: 'Human Resources' },
  { department_id: 3, department_name: 'Finance & Treasury' },
  { department_id: 4, department_name: 'Department of Education' },
  { department_id: 5, department_name: 'Provincial Treasury' },
];

const DEFAULT_STEPS: ApprovalStep[] = [
  { step_id: 1, step_name: 'Draft Created', step_order: 1, status: 'current', actioned_at: null },
  { step_id: 2, step_name: 'Chief Secretary Review', step_order: 2, status: 'pending', actioned_at: null },
  { step_id: 3, step_name: 'Official Seal & Dispatch', step_order: 3, status: 'pending', actioned_at: null },
];

export default function GenerateLetterPage() {  
    const { id } = useParams();
    const navigate = useNavigate();
    

    const [letterId, setLetterId] = useState<number | null>(id ? Number(id) : null);
    const [senderName] = useState('Office of the Chief Secretary, Southern Provincial Council');
    const [selectedDepartments, setSelectedDepartments] = useState(
    ALL_DEPARTMENTS.filter((d) => [4, 5].includes(d.department_id))
    );
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [designation, setDesignation] = useState('Chief Secretary');
    const [signatoryName, setSignatoryName] = useState('');
    const [signatureDate, setSignatureDate] = useState('');
    const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>(DEFAULT_STEPS);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
    if (id) {
        letterService.getById(Number(id)).then((letter) => {
            setTitle(letter.title);
            setContent(letter.content ?? '');
            setDesignation(letter.designation ?? 'Chief Secretary');
            setSignatoryName(letter.signatory_name ?? '');
            setSignatureDate(letter.signature_date ?? '');
            if (letter.departments) setSelectedDepartments(letter.departments);
            if (letter.approval_steps) setApprovalSteps(letter.approval_steps);
        });
        }
    }, [id]);

    const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const payload = {
        sender_name: senderName,
        title,
        content,
        designation,
        signatory_name: signatoryName,
        signature_date: signatureDate || undefined,
        department_ids: selectedDepartments.map((d) => d.department_id),
      };

      if (letterId) {
        await letterService.update(letterId, payload);
      } else {
        const letter = await letterService.create(payload);
        setLetterId(letter.letter_id);
        navigate(`/letters/${letter.letter_id}`, { replace: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendForApproval = async () => {
    if (!title || !content) {
      alert('Please fill in the title and content before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      let activeLetterId = letterId;

      if (!activeLetterId) {
        const letter = await letterService.create({
          sender_name: senderName,
          title,
          content,
          designation,
          signatory_name: signatoryName,
          signature_date: signatureDate || undefined,
          department_ids: selectedDepartments.map((d) => d.department_id),
        });
        activeLetterId = letter.letter_id;
        setLetterId(activeLetterId);
      } else {
        await letterService.update(activeLetterId, {
          title, content, designation, signatory_name: signatoryName,
          department_ids: selectedDepartments.map((d) => d.department_id),
        });
      }
    const updated = await letterService.sendForApproval(activeLetterId);
      setApprovalSteps(updated.approval_steps ?? approvalSteps);
      navigate('/letters');
    } catch (err) {
      console.error(err);
      alert('Failed to send for approval.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDiscard = async () => {
    if (!confirm('Discard this draft? This cannot be undone.')) return;
    if (letterId) await letterService.discard(letterId);
    navigate('/meetings');
  };
  return (
    <DashboardLayout pageTitle="Generate Meeting Letter">
      <div className="flex flex-col gap-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">
              Meetings <span className="mx-1">›</span>
              <span className="testfont-semibold text-slate-900">Generate Letter</span>
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900"> Letter Details</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-6">
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">From (Sender Details)</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                  {senderName}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">To (Recipient Details)</label>
                <DepartmentTagInput
                  allDepartments={ALL_DEPARTMENTS}
                  selected={selectedDepartments}
                  onChange={setSelectedDepartments}
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Title (Subject of the Letter)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g. Quarterly Review Meeting - Infrastructure Development 2024"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Content</label>
              <div className="rounded-lg border border-slate-300">
                <div className="flex items-center gap-3 border-b border-slate-200 px-3 py-2">
                  <button className="text-slate-500 hover:text-slate-900"><Bold className="h-4 w-4" /></button>
                  <button className="text-slate-500 hover:text-slate-900"><Italic className="h-4 w-4" /></button>
                  <button className="text-slate-500 hover:text-slate-900"><List className="h-4 w-4" /></button>
                  <button className="text-slate-500 hover:text-slate-900"><LinkIcon className="h-4 w-4" /></button>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the main body of the letter here..."
                  rows={12}
                  className="w-full resize-none rounded-b-lg px-3 py-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-400">
                  <div className="flex flex-col items-center gap-1 py-6">
                    <span className="text-lg">✎</span>
                    Designated Space for Signature
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Name of Signatory</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
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

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">✦ Letter Actions</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSendForApproval}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Generating...' : 'Generate Letter'}
                </button>
                <button
                  onClick={handleSendForApproval}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Send for Approval
                </button>
              </div>

              <div className="my-4 h-px bg-slate-100" />

              <div className="flex flex-col gap-6 ">
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="flex items-center justify-center  gap-2 text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Download as PDF'}
                </button>
                <button className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:underline">
                  <History className="h-4 w-4" />
                  View Revision History
                </button>
                <button
                  onClick={handleDiscard}
                  className="flex items-center justify-center gap-2 text-sm font-medium text-red-600 hover:underline"
                >
                  <Trash2 className="h-4 w-4" />
                  Discard Draft
                </button>
              </div>
            </div>

            <ApprovalWorkflowSidebar steps={approvalSteps} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}



