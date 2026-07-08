import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Filter } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import WorkflowTracker from '../components/Approvals/WorkflowTracker';
import { approvalService } from '../services/approvalService';
import { useAuth } from '../context/AuthContext';
import type { ApprovableDocument } from '../types/approval';

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
    setSelectedDoc(doc);
    setActiveTab('preview');
  };

  const currentStep = selectedDoc?.steps?.find((s) => s.step_order === selectedDoc.current_step_order);
  const canAct = currentStep && user && currentStep.required_role === user.role && currentStep.status === 'pending';

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
    if (!confirm('Reject this document?')) return;
    setIsActing(true);
    try {
      const updated = await approvalService.reject(selectedDoc.document_id, commentText || undefined);
      setSelectedDoc(updated);
      setCommentText('');
      fetchList();
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
                placeholder="Search by document ID or subject..."
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
                  <span className="text-xs font-medium text-slate-400">REF: {doc.reference_id}</span>
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
                    <button
                      onClick={handleReject}
                      disabled={isActing}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                      Notes/Observations
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isActing}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
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
                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-200 p-6">
                  {hasHtml(selectedDoc.full_content) ? (
                    <div
                      className="mx-auto min-h-[297mm] w-[210mm] box-border bg-white px-[20mm] pb-[25mm] pl-[30mm] pt-[30mm] shadow-xl"
                      style={{ fontFamily: "'Noto Sans Sinhala', 'DejaVu Sans', sans-serif", fontSize: '12pt', lineHeight: '1.75' }}
                      dangerouslySetInnerHTML={{ __html: selectedDoc.full_content ?? '' }}
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
                          <p className="text-slate-400">DOCUMENT NO</p>
                          <p className="font-semibold text-slate-900">{selectedDoc.reference_id}</p>
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
    </DashboardLayout>
  );
}
