export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface AttendanceParticipant {
  user_id: number | null;
  letter_recipient_id: number | null;
  full_name: string;
  email: string;
  department: string | null;
  role: string | null;
  status: AttendanceStatus;
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
