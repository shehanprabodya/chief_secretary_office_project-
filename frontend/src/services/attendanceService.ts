import { api } from '../lib/axios';
import type { ApprovedMeetingLetter, AttendanceSheet, AttendanceStatus } from '../types/attendance';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

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

  async getSheetByLetter(letterId: number): Promise<AttendanceSheet> {
    const { data } = await api.get<AttendanceSheet>(`/officer/letters/${letterId}/attendance`);
    return data;
  },

  async saveDraft(meetingId: number, letterId: number, records: { user_id: number | null; letter_recipient_id: number | null; status: AttendanceStatus }[]): Promise<void> {
    await api.post(`/officer/meetings/${meetingId}/attendance/draft`, { letter_id: letterId, records });
  },

  async submit(meetingId: number, letterId: number): Promise<void> {
    await api.post(`/officer/meetings/${meetingId}/attendance/submit`, { letter_id: letterId });
  },

  async exportPdf(
    meetingId: number,
    letterId: number,
    records: Array<{ full_name: string; department: string | null; role: string | null; status: AttendanceStatus }>
  ): Promise<void> {
    const response = await api.post(
      `/officer/meetings/${meetingId}/attendance/export/pdf`,
      { letter_id: letterId, records },
      { responseType: 'blob' }
    );
    const match = response.headers['content-disposition']?.match(/filename="?([^"]+)"?/i);
    downloadBlob(new Blob([response.data], { type: 'application/pdf' }), match?.[1] ?? `attendance-${meetingId}.pdf`);
  },
};
