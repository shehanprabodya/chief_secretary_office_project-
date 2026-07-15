import { api } from '../lib/axios';
import type { Meeting, PaginatedMeetings } from '../types/meeting';

export interface MeetingFilters {
  search?: string;
  subject_code?: string;
  subject_title?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export const meetingService = {
  async list(filters: MeetingFilters = {}): Promise<PaginatedMeetings> {
    const { data } = await api.get<PaginatedMeetings>('/officer/meetings', { params: filters });
    return data;
  },

  async getByDate(date: string): Promise<Meeting[]> {
    const { data } = await api.get<{ meetings: Meeting[] }>('/officer/meetings/by-date', {
      params: { date },
    });
    return data.meetings;
  },

  async getAssignedUpcoming(): Promise<Meeting[]> {
    const { data } = await api.get<{ meetings: Meeting[] }>(
      '/officer/meetings/assigned-upcoming',
    );
    return data.meetings;
  },

  async getById(id: number): Promise<Meeting> {
    const { data } = await api.get<{ meeting: Meeting }>(`/officer/meetings/${id}`);
    return data.meeting;
  },

  async create(payload: Partial<Meeting> & { attendee_ids?: number[] }): Promise<Meeting> {
    const { data } = await api.post<{ meeting: Meeting }>('/meetings', payload);
    return data.meeting;
  },

  async update(id: number, payload: Partial<Meeting> & { attendee_ids?: number[]; letter_id?: number }): Promise<Meeting> {
    const { data } = await api.put<{ meeting: Meeting }>(`/officer/meetings/${id}`, payload);
    return data.meeting;
  },

  async cancel(id: number): Promise<void> {
    await api.delete(`/officer/meetings/${id}`);
  },
};
