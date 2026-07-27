export type AttendanceStatus = 'present' | 'absent' | 'excused';
export type ExcuseRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface OrganizerExcuseRequest {
  excuse_request_id: number;
  meeting_id: number;
  reason_category: 'official_duty' | 'medical' | 'schedule_conflict' | 'other';
  reason_details: string;
  status: ExcuseRequestStatus;
  review_comment: string | null;
  submitted_at: string;
  updated_at: string;
  reviewed_at: string | null;
  external_officer: {
    user_id: number;
    full_name: string;
    email: string;
    designation: string | null;
    organization: string | null;
  } | null;
  reviewer: {
    user_id: number;
    full_name: string;
    designation: string | null;
  } | null;
}

export interface AttendanceParticipant {
  participant_type: 'invited' | 'additional';
  additional_attendee_id: number | null;
  registered_user_id?: number | null;
  user_id: number | null;
  letter_recipient_id: number | null;
  full_name: string;
  email: string;
  department: string | null;
  role: string | null;
  addition_reason: string | null;
  status: AttendanceStatus;
}

export interface AdditionalAttendeeForm {
  letter_id: number;
  user_id: number | null;
  full_name: string;
  organization: string;
  designation: string;
  email: string;
  addition_reason: string;
  attendance_status: AttendanceStatus;
}

export interface AdditionalAttendeeResponse {
  message: string;
  participant: AttendanceParticipant;
}

export interface ApprovedMeetingLetter {
  letter_id: number;
  meeting_id: number;
  meeting_title: string;
  letter_title: string;
  subject_code: string | null;
  subject_title: string | null;
  meeting_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  recipient_count: number;
}

export interface AttendanceStatistics {
  attendance_percentage: number;
  present: number;
  absent: number;
  excused: number;
}

export interface AttendanceSheet {
  letter_id: number;
  is_finalized: boolean;
  meeting: {
    meeting_id: number;
    title: string;
    meeting_date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
  };
  participants: AttendanceParticipant[];
  statistics: AttendanceStatistics;
}
