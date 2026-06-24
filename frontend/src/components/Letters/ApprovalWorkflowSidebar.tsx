import { Check, Pencil } from 'lucide-react';
import type { ApprovalStep } from '../../types/letter';

interface ApprovalWorkflowSidebarProps {
  steps: ApprovalStep[];
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  'Draft Created': 'Current Stage',
  'Chief Secretary Review': 'Pending Submission',
  'Official Seal & Dispatch': 'Final Stage',
};

export default function ApprovalWorkflowSidebar({ steps }: ApprovalWorkflowSidebarProps) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 text-[10px]">i</span>
        Approval Workflow
      </h3>

      <div className="space-y-0">
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.step_id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isCompleted
                      ? 'bg-slate-900 text-white'
                      : isCurrent
                      ? 'bg-slate-900 text-white ring-4 ring-blue-200'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : isCurrent ? <Pencil className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                {!isLast && <div className="my-1 h-10 w-px bg-slate-300" />}
              </div>
              <div className="pb-6">
                <p className={`text-sm font-semibold ${isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                  {step.step_name}
                </p>
                <p className="text-xs text-slate-400">
                  {STEP_DESCRIPTIONS[step.step_name] ?? ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
