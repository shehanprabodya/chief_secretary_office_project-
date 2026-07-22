import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Gavel,
  Inbox,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { approvalService } from '../services/approvalService';
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
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

export default function ChiefSecretaryDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ApprovableDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const docs = await approvalService.list(undefined, 'all');
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      setError('Unable to load final approval summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadApprovals();
  }, []);

  const stats = useMemo(() => {
    const finalQueue = documents.filter((doc) => {
      const currentStep = doc.steps?.find((step) => step.step_order === doc.current_step_order);
      return doc.status === 'pending' && currentStep?.required_role === 'chief_secretary' && currentStep.status === 'pending';
    });

    const deputyCleared = documents.filter((doc) =>
      doc.steps?.some((step) => step.required_role === 'deputy' && step.status === 'approved')
    );

    return {
      pendingForMe: finalQueue.length,
      deputyCleared: deputyCleared.length,
      approved: documents.filter((doc) => doc.status === 'approved').length,
      rejected: documents.filter((doc) => doc.status === 'rejected').length,
      total: documents.length,
      queue: finalQueue.slice(0, 5),
    };
  }, [documents]);

  return (
    <DashboardLayout pageTitle="Chief Secretary Dashboard">
      <div className="approval-dashboard-sections">
        <section className="relative overflow-hidden rounded-2xl bg-[var(--color-primary)] px-6 py-7 text-white shadow-sm sm:px-8">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/5" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Final Approval Authority</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Welcome, {user?.full_name ?? 'Chief Secretary'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">
              Review Deputy-cleared documents and issue the final approval decision for official dispatch.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadApprovals}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/approvals')}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-blue-50"
            >
              <Inbox className="h-4 w-4" />
              Open Final Queue
            </button>
          </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="approval-dashboard-stats grid sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-t-4 border-t-orange-400 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Pending Final Approval</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{isLoading ? '—' : stats.pendingForMe}</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-2">
                <Clock3 className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <p className="mt-3 text-xs text-orange-600">Current Chief Secretary step</p>
          </div>

          <div className="rounded-xl border border-t-4 border-t-purple-500 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Deputy Cleared</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{isLoading ? '—' : stats.deputyCleared}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-2">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-purple-600">Documents passed Deputy review</p>
          </div>

          <div className="rounded-xl border border-t-4 border-t-green-500 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Final Approved</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{isLoading ? '—' : stats.approved}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-2">
                <Award className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-green-600">Completed official approvals</p>
          </div>

          <div className="rounded-xl border border-t-4 border-t-red-500 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Rejected</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{isLoading ? '—' : stats.rejected}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <p className="mt-3 text-xs text-red-500">Returned or declined documents</p>
          </div>
        </div>

        <div className="approval-dashboard-content grid xl:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Final Approval Queue</h2>
                <p className="text-sm text-slate-500">Documents approved by Deputy and waiting for final decision.</p>
              </div>
              <button
                onClick={() => navigate('/approvals')}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                View all
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Submitted By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                        Loading final approval queue...
                      </td>
                    </tr>
                  ) : stats.queue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                        No documents are waiting for final approval.
                      </td>
                    </tr>
                  ) : (
                    stats.queue.map((doc) => (
                      <tr
                        key={doc.document_id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => navigate('/approvals')}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-slate-800">{doc.reference_id}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{doc.subject}</td>
                        <td className="px-4 py-4 text-sm text-slate-500">{doc.submitter?.full_name ?? 'Unknown'}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${STATUS_BADGE[doc.status]}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-400">{timeAgo(doc.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="approval-dashboard-sidebar">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Workflow Position</h2>
              <div className="mt-5 space-y-4">
                {[
                  { label: 'Officer submits', icon: Send, state: 'complete' },
                  { label: 'Department Head review', icon: FileCheck2, state: 'complete' },
                  { label: 'Deputy review', icon: ShieldCheck, state: 'complete' },
                  { label: 'Chief Secretary final approval', icon: Gavel, state: 'active' },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          step.state === 'complete'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700 ring-4 ring-purple-50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{step.label}</p>
                        <p className="text-xs capitalize text-slate-400">{step.state}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-purple-900">Final decision</h2>
              <p className="mt-2 text-sm leading-6 text-purple-800">
                Open the final queue to inspect the generated document, add final observations, then approve for completion or reject for correction.
              </p>
              <button
                onClick={() => navigate('/approvals')}
                className="mt-4 w-full rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800"
              >
                Review Final Queue
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">All workflow items</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{isLoading ? '—' : stats.total}</p>
                </div>
                <FileText className="h-9 w-9 text-blue-500" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Complete visibility over the approval documents in the workflow.
              </p>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50/60 p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-900">Approved documents become final.</p>
                  <p className="text-xs text-green-700">Linked letters are marked as approved after final sign-off.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
