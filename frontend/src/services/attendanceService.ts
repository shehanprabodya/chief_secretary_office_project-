import { api } from '../lib/axios';
import type { ApprovedMeetingLetter, AttendanceSheet, AttendanceStatus } from '../types/attendance';

export const attendanceService = {
  async getApprovedMeetingLetters(search = ''): Promise<ApprovedMeetingLetter[]> {
    const { data } = await api.get<{ letters: ApprovedMeetingLetter[] }>('/officer/attendance/approved-meeting-letters', {
      params: { search: search || undefined },
    });
    return data.letters;
  },

  async getSheet(meetingId: number, letterId?: number): Promise<AttendanceSheet> {
    const { data } = await api.get<AttendanceSheet>(`/officer/meetings/${meetingId}/attendance`, {
      params: { letter_id: letterId },
    });
    return data;
  },

  async saveDraft(meetingId: number, records: { user_id: number; status: AttendanceStatus }[]): Promise<void> {
    await api.post(`/officer/meetings/${meetingId}/attendance/draft`, { records });
  },

  async submit(meetingId: number): Promise<void> {
    await api.post(`/officer/meetings/${meetingId}/attendance/submit`);
  },
};
