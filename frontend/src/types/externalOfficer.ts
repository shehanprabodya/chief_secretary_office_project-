export interface ExternalMeetingLetter {
  letter_id: number;
  title: string;
  content: string | null;
  designation: string | null;
  signatory_name: string | null;
  signature_date: string | null;
  status: 'approved' | 'dispatched';
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
  letter: ExternalMeetingLetter | null;
}
