export interface AppNotification {
  notification_id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  entity_type: string | null;
  entity_id: number | null;
  priority: 'normal' | 'important' | 'urgent';
  read_at: string | null;
  created_at: string;
}
