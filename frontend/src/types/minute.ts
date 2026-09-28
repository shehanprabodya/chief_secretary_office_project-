export interface MinuteDecision {
  decision_id: number;
  decision_order: number;
  topic: string | null;
  decision_text: string;
  responsibility: string | null;
}

export interface ActionItem {
  action_item_id: number;
  task_description: string;
  responsible_officer_id: number | null;
  responsible_officer?: { user_id: number; full_name: string };
  deadline: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  created_at?: string;
}

export interface LetterRecipientOption {
  letter_recipient_id: number;
  user_id?: number;
  organization_id?: number;
  recipient_label: string;
  designation?: string | null;
  full_name?: string;
  organization_name?: string;
}

export interface MeetingMinute {
  minute_id: number;
  meeting_id: number;
  meeting_description: string | null;
  discussion_summary: string | null;
  closing_remarks: string | null;
  signatory_name: string | null;
  signatory_designation: string | null;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  decisions: MinuteDecision[];
  action_items: ActionItem[];
}
