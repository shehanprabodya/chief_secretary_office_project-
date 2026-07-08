export type MeetingStatus = 'draft' | 'scheduled' | 'completed' | 'cancelled';
export type LocationType = 'physical' | 'virtual' | 'not_assigned';

export interface MeetingAttendee {
  user_id: number;
  full_name: string;
  pivot: { attendance_role: 'assigned' | 'observer' };
}

export interface Meeting {
  meeting_id: number;
  reference_id: string;
  meeting_code: string;
  title: string;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  location_type: LocationType;
  department_id: number | null;
  department?: { department_id: number; department_name: string };
  subject?: { id: number; code: string; title: string };
  status: MeetingStatus;
  description: string | null;
  attendees?: MeetingAttendee[];
}

export interface PaginatedMeetings {
  data: Meeting[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}
