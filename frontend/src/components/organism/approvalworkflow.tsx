import React from 'react';
import Card from '../atoms/card';
import WorkflowStep from '../molecules/workflowstep';
import { H2 } from '../atoms/heading';

interface WorkflowStepItem {
  id: string;
  stepNumber: string;
  stepLabel: string;
  title: string;
  subtitle: string;
  meta?: string;
  status: 'completed' | 'active' | 'pending';
  actions?: boolean;
}

interface ApprovalWorkflowProps {
  title?: string;
  steps?: WorkflowStepItem[];
  onStepAction?: (stepId: string) => void;
}

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  title = 'Standardized Approval Workflow',
  steps,
  onStepAction,
}) => {
  const defaultSteps: WorkflowStepItem[] = [
    {
      id: 's1',
      stepNumber: 'Step 01',
      stepLabel: 'Submission & Verification',
      title: 'Development Division Clerk',
      subtitle: 'Completed on Oct 24, 2024 – 09:15 AM',
      meta: 'Document #SPC-2024-081 Verified',
      status: 'completed'
    },
    {
      id: 's2',
      stepNumber: 'Step 02',
      stepLabel: 'Under Review',
      title: 'Chief Secretary Approval',
      subtitle: 'Assigned to: Hon. Chief Secretary',
      status: 'active',
      actions: true
    },
    {
      id: 's3',
      stepNumber: 'Step 03',
      stepLabel: 'Final Disbursement',
      title: 'Finance Department',
      subtitle: 'Awaiting previous step completion',
      status: 'pending'
    }
  ];

  const displaySteps = steps || defaultSteps;

  return (
    <section className="approval-workflow">
      <Card>
        <div className="approval-workflow__content">
          <H2>{title}</H2>
          <div className="approval-workflow__steps">
            {displaySteps.map((step, index) => (
              <WorkflowStep
                key={step.id}
                {...step}
                isLast={index === displaySteps.length - 1}
                onAction={() => onStepAction?.(step.id)}
              />
            ))}
          </div>
        </div>
      </Card>
    </section>
  );
};

export default ApprovalWorkflow;
