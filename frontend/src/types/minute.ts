export interface MinuteDecision {
  decision_id: number;
  decision_order: number;
  decision_text: string;
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

export interface MeetingMinute {
  minute_id: number;
  meeting_id: number;
  discussion_summary: string | null;
  status: 'draft' | 'pending_approval' | 'approved';
  decisions: MinuteDecision[];
  action_items: ActionItem[];
}
