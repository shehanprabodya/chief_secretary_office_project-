import { api } from '../lib/axios';
import type {
  DepartmentHeadLetter,
  DepartmentHeadAttendanceSheet,
  DepartmentHeadMinute,
  DepartmentHeadRecordFilters,
  DepartmentOfficer,
  PaginatedResponse,
} from '../types/departmentHeadRecords';
import type { AttendanceSheet } from '../types/attendance';
import type { MeetingMinute } from '../types/minute';
import type { Meeting } from '../types/meeting';

export const departmentHeadRecordService = {
  async getOfficers(search = ''): Promise<DepartmentOfficer[]> {
    const { data } = await api.get<{ officers: DepartmentOfficer[] }>('/dept-head/officers', {
      params: { search: search || undefined },
    });
    return data.officers;
  },

  async getLetters(filters: DepartmentHeadRecordFilters): Promise<PaginatedResponse<DepartmentHeadLetter>> {
    const { data } = await api.get<PaginatedResponse<DepartmentHeadLetter>>('/dept-head/letters', {
      params: filters,
    });
    return data;
  },

  async previewLetter(letterId: number): Promise<string> {
    const { data } = await api.get<{ preview_html: string }>(`/dept-head/letters/${letterId}/preview`);
    return data.preview_html;
  },

  async getAttendance(filters: DepartmentHeadRecordFilters): Promise<PaginatedResponse<DepartmentHeadAttendanceSheet>> {
    const { data } = await api.get<PaginatedResponse<DepartmentHeadAttendanceSheet>>('/dept-head/attendance', {
      params: filters,
    });
    return data;
  },

  async getAttendanceSheet(meetingId: number, letterId: number): Promise<AttendanceSheet> {
    const { data } = await api.get<AttendanceSheet>(`/dept-head/meetings/${meetingId}/attendance`, {
      params: { letter_id: letterId },
    });
    return data;
  },

  async getMinutes(filters: DepartmentHeadRecordFilters): Promise<PaginatedResponse<DepartmentHeadMinute>> {
    const { data } = await api.get<PaginatedResponse<DepartmentHeadMinute>>('/dept-head/minutes', {
      params: filters,
    });
    return data;
  },

  async getMinute(minuteId: number): Promise<MeetingMinute & { meeting: Meeting }> {
    const { data } = await api.get<{ minute: MeetingMinute & { meeting: Meeting } }>(`/dept-head/minutes/${minuteId}`);
    return data.minute;
  },
};
