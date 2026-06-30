export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface AttendanceParticipant {
  user_id: number;
  full_name: string;
  email: string;
  department: string | null;
  role: string | null;
  status: AttendanceStatus;
}

export interface AttendanceStatistics {
  attendance_percentage: number;
  present: number;
  absent: number;
  excused: number;
}

export interface AttendanceSheet {
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