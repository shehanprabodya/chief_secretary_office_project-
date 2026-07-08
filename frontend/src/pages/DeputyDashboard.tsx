import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
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

export default function DeputyDashboard() {
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
      setError('Unable to load deputy approval summary.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadApprovals();
  }, []);

  const stats = useMemo(() => {
    const deputyQueue = documents.filter((doc) => {
      const currentStep = doc.steps?.find((step) => step.step_order === doc.current_step_order);
      return doc.status === 'pending' && currentStep?.required_role === 'deputy' && currentStep.status === 'pending';
    });

    const movedToChief = documents.filter((doc) =>
      doc.steps?.some((step) => step.required_role === 'deputy' && step.status === 'approved')
    );

    return {
      pendingForMe: deputyQueue.length,
      movedToChief: movedToChief.length,
      approved: documents.filter((doc) => doc.status === 'approved').length,
      rejected: documents.filter((doc) => doc.status === 'rejected').length,
      total: documents.length,
      queue: deputyQueue.slice(0, 5),
    };
  }, [documents]);

  return (
    <DashboardLayout pageTitle="Deputy Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Deputy Approval Desk</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Welcome, <span className="text-[var(--color-primary)]">{user?.full_name ?? 'Deputy'}</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Review documents cleared by Department Heads and forward final-ready items to the Chief Secretary.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadApprovals}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/approvals')}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Inbox className="h-4 w-4" />
              Open Approval Queue
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-t-4 border-t-orange-400 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Pending for My Review</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{isLoading ? '—' : stats.pendingForMe}</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-2">
                <Clock3 className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <p className="mt-3 text-xs text-orange-600">Current Deputy approval step</p>
          </div>

          <div className="rounded-xl border border-t-4 border-t-indigo-500 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Forwarded to Chief</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{isLoading ? '—' : stats.movedToChief}</p>
              </div>
              <div className="rounded-lg bg-indigo-50 p-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-indigo-600">Deputy step approved</p>
          </div>

          <div className="rounded-xl border border-t-4 border-t-blue-500 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Workflow Items</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{isLoading ? '—' : stats.total}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">All visible approval documents</p>
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

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Deputy Review Queue</h2>
                <p className="text-sm text-slate-500">Documents approved by Department Heads and waiting for Deputy review.</p>
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
                        Loading deputy queue...
                      </td>
                    </tr>
                  ) : stats.queue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                        No documents are waiting for Deputy review.
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

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Workflow Position</h2>
              <div className="mt-5 space-y-4">
                {[
                  { label: 'Officer submits', icon: Send, state: 'complete' },
                  { label: 'Department Head review', icon: FileCheck2, state: 'complete' },
                  { label: 'Deputy review', icon: ShieldCheck, state: 'active' },
                  { label: 'Chief Secretary final approval', icon: CheckCircle2, state: 'waiting' },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          step.state === 'complete'
                            ? 'bg-green-100 text-green-700'
                            : step.state === 'active'
                            ? 'bg-indigo-100 text-indigo-700 ring-4 ring-indigo-50'
                            : 'bg-slate-100 text-slate-400'
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

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-900">Deputy action</h2>
              <p className="mt-2 text-sm leading-6 text-indigo-800">
                Review the submitted document, add observations if needed, then approve to forward it to the Chief Secretary.
              </p>
              <button
                onClick={() => navigate('/approvals')}
                className="mt-4 w-full rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800"
              >
                Review Deputy Queue
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Final approvals</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{isLoading ? '—' : stats.approved}</p>
                </div>
                <CheckCircle2 className="h-9 w-9 text-green-500" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Documents that completed the full approval workflow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
