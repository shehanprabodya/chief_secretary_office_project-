export interface ExternalMeetingLetter {
  letter_id: number;
  sender_name: string;
  title: string;
  content: string | null;
  designation: string | null;
  organization_name: string | null;
  organization_address: string | null;
  signatory_name: string | null;
  signature_date: string | null;
  status: 'approved' | 'dispatched';
}

export type ExcuseReasonCategory = 'official_duty' | 'medical' | 'schedule_conflict' | 'other';
export type ExcuseRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface AttendanceExcuseRequest {
  excuse_request_id: number;
  meeting_id: number;
  reason_category: ExcuseReasonCategory;
  reason_details: string;
  status: ExcuseRequestStatus;
  review_comment: string | null;
  submitted_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

export interface ExternalOfficerMeeting {
  meeting_id: number;
  reference_id: string | null;
  meeting_code: string | null;
  title: string;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  location_type: 'physical' | 'virtual' | 'not_assigned';
  status: 'draft' | 'scheduled' | 'completed';
  description: string | null;
  attendees_count: number;
  subject: { id: number; code: string; title: string } | null;
  organizer: string | null;
  organizer_designation: string | null;
  excuse_request: AttendanceExcuseRequest | null;
  letter: ExternalMeetingLetter | null;
}
