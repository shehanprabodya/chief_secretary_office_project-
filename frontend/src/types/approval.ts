export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type StepStatus = 'waiting' | 'pending' | 'approved' | 'rejected';

export interface ApprovalStep {
  step_id: number;
  step_label: string;
  step_order: number;
  required_role: string;
  status: StepStatus;
  actioned_by?: { user_id: number; full_name: string } | null;
  actioned_at: string | null;
}

export interface ApprovalComment {
  comment_id: number;
  comment: string;
  created_at: string;
  user: { user_id: number; full_name: string };
}

export interface ApprovableDocument {
  document_id: number;
  reference_id: string;
  subject_code?: string | null;
  document_type: string;
  subject: string;
  description: string | null;
  full_content: string | null;
  amount: number | null;
  status: DocumentStatus;
  current_step_order: number;
  submitter: { user_id: number; full_name: string; role?: { role_name: string } };
  steps: ApprovalStep[];
  comments: ApprovalComment[];
  created_at: string;
}
