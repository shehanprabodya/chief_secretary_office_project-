import { Check, Pencil } from 'lucide-react';
import type { ApprovalStep } from '../../types/approval';

interface WorkflowTrackerProps {
  steps: ApprovalStep[];
}

export default function WorkflowTracker({ steps }: WorkflowTrackerProps) {
  return (
    <div className="rounded-lg bg-slate-50 p-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Approval Workflow Track
      </p>
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const isApproved = step.status === 'approved';
          const isPending = step.status === 'pending';
          const isRejected = step.status === 'rejected';
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.step_id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    isApproved
                      ? 'bg-green-600 text-white'
                      : isRejected
                      ? 'bg-red-600 text-white'
                      : isPending
                      ? 'bg-[var(--color-primary)] text-white ring-4 ring-blue-100'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isApproved ? <Check className="h-5 w-5" /> : isPending ? <Pencil className="h-4 w-4" /> : <span className="text-sm">●</span>}
                </div>
                <div className="text-center">
                  <p className={`text-sm font-semibold ${isApproved || isPending ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.step_label}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isApproved ? 'Approved' : isPending ? 'Pending' : isRejected ? 'Rejected' : 'Waiting'}
                  </p>
                </div>
              </div>
              {!isLast && (
                <div className={`mx-2 h-px flex-1 ${isApproved ? 'bg-green-300' : 'bg-slate-300'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}