export type LetterStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'dispatched';

export interface Organization {
  organization_id: number;
  organization_name: string;
  abbreviation: string | null;
  officers?: ExternalOfficer[];
}

export interface ExternalOfficer {
  user_id: number;
  full_name: string;
  designation: string;
  label: string; // "Chief Engineer, Water Board"
}

export interface Subject {
  id: number;
  code: string;
  title: string;
}

export interface RecipientTag {
  id: string; // temp UI id
  organization_id?: number;
  user_id?: number;
  recipient_label: string; // "designation, organization name"
  organization_name?: string;
  designation?: string;
}

export interface Letter {
  letter_id: number;
  created_by: number;
  meeting_id: number | null;
  meeting_code: string | null;
  subject_id: number | null;
  subject?: Subject;
  sender_name: string;
  title: string;
  content: string;
  designation: string | null;
  signatory_name: string | null;
  signature_date: string | null;
  status: LetterStatus;
  recipients: RecipientTag[];
  generated_html?: string;
  created_at?: string;
  updated_at?: string;
}
