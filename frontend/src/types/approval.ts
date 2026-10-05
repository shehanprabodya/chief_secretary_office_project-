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
  source_id?: number | null;
  subject: string;
  description: string | null;
  full_content: string | null;
  amount: number | null;
  status: DocumentStatus;
  current_step_order: number;
  submitter: { user_id: number; full_name: string; role?: { role_name: string } };
  steps: ApprovalStep[];
  comments: ApprovalComment[];
  source_letter?: {
    letter_id: number;
    title: string;
    content: string;
    designation: string | null;
    signatory_name: string | null;
    signature_date: string | null;
    recipients: Array<{
      letter_recipient_id: number;
      organization_id: number | null;
      user_id: number | null;
      recipient_label: string | null;
      organization?: { organization_name: string } | null;
      user?: {
        designation: string | null;
        organization?: { organization_name: string } | null;
      } | null;
    }>;
  } | null;
  source_minute?: {
    minute_id: number;
    meeting_description: string | null;
    discussion_summary: string | null;
    closing_remarks: string | null;
    signatory_name: string | null;
    signatory_designation: string | null;
    decisions: Array<{
      decision_id: number;
      topic: string | null;
      decision_text: string;
      responsibility: string | null;
    }>;
  } | null;
  created_at: string;
}
