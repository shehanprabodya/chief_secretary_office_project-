import React from 'react';
import './WorkflowStep.css';
import Badge from '../atoms/badge';
import Button from '../atoms/button';
import { Span } from '../atoms/heading';

interface IconProps {
  c: string;
}

const IcoCheck: React.FC<IconProps> = ({ c }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoClock: React.FC<IconProps> = ({ c }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2" />
    <path d="M12 7V12L15 14" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoDl: React.FC<IconProps> = ({ c }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3V15" stroke={c} strokeWidth="2" strokeLinecap="round" />
    <path d="M8 11L12 15L16 11" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 19H19" stroke={c} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

type WorkflowStatus = 'completed' | 'active' | 'pending';

interface WorkflowStepProps {
  id?: string;
  stepNumber: string;
  stepLabel: string;
  title: string;
  subtitle: string;
  meta?: string;
  status: WorkflowStatus;
  actions?: boolean;
  isLast: boolean;
  onAction?: () => void;
}

interface StepConfig {
  dotBg: string;
  dotBorder: string;
  icon: React.ReactNode | null;
}

const WorkflowStep: React.FC<WorkflowStepProps> = ({
  id,
  stepNumber,
  stepLabel,
  title,
  subtitle,
  meta,
  status,
  actions,
  isLast,
  onAction,
}) => {
  const configMap: Record<WorkflowStatus, StepConfig> = {
    completed: {
      dotBg: '#16a34a',
      dotBorder: '#16a34a',
      icon: <IcoCheck c="#fff" />
    },
    active: {
      dotBg: '#fff',
      dotBorder: '#1e4a8f',
      icon: <IcoClock c="#1e4a8f" />
    },
    pending: {
      dotBg: '#f1f5f9',
      dotBorder: '#cbd5e1',
      icon: null
    }
  };

  const config = configMap[status];


  return (
    <div className="workflow-step" id={id}>
      <div className="workflow-step__timeline">
        <div
          className="workflow-step__dot"
          style={{
            background: config.dotBg,
            borderColor: config.dotBorder
          }}
          role="status"
          aria-label={`Step ${stepNumber}: ${status}`}
        >
          {config.icon}
        </div>
        {!isLast && (
          <div
            className={`workflow-step__line workflow-step__line--${status === 'completed' ? 'completed' : 'pending'}`}
            aria-hidden="true"
          />
        )}
      </div>

      <div className={`workflow-step__content workflow-step__content--${status}`}>
        <div className="workflow-step__header">
          <Span variant="label" className={`workflow-step__label workflow-step__label--${status}`}>
            {stepNumber}: {stepLabel}
          </Span>
          {status === 'active' && (
            <Badge variant="info">Current</Badge>
          )}
        </div>

        <h4 className="workflow-step__title">{title}</h4>
        <Span className="workflow-step__subtitle">{subtitle}</Span>

        {meta && (
          <Span className="workflow-step__meta">{meta}</Span>
        )}

        {actions && (
          <div className="workflow-step__actions">
            <Button variant="dark" size="sm" onClick={onAction}>
              Proceed to Review
            </Button>
            <Button variant="ghost" size="sm" icon={<IcoDl c={''} />}>
              Download PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowStep;
