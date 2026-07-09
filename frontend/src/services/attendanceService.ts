import { api } from '../lib/axios';
import type { AttendanceSheet, AttendanceStatus } from '../types/attendance';

export const attendanceService = {
  async getSheet(meetingId: number): Promise<AttendanceSheet> {
    const { data } = await api.get<AttendanceSheet>(`/officer/meetings/${meetingId}/attendance`);
    return data;
  },

  async saveDraft(meetingId: number, records: { user_id: number; status: AttendanceStatus }[]): Promise<void> {
    await api.post(`/officer/meetings/${meetingId}/attendance/draft`, { records });
  },

  async submit(meetingId: number): Promise<void> {
    await api.post(`/officer/meetings/${meetingId}/attendance/submit`);
  },
};
