export type LetterStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'dispatched';
export type ApprovalStepStatus = 'pending' | 'current' | 'completed' | 'rejected';

export interface ApprovalStep {
  step_id: number;
  step_name: string;
  step_order: number;
  status: ApprovalStepStatus;
  actioned_at: string | null;
}

export interface Letter {
  letter_id: number;
  meeting_id: number | null;
  sender_name: string;
  title: string;
  content: string | null;
  designation: string | null;
  signatory_name: string | null;
  signature_date: string | null;
  status: LetterStatus;
  departments?: { department_id: number; department_name: string }[];
  approval_steps?: ApprovalStep[];
}