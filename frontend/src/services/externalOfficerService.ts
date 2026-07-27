import { api } from '../lib/axios';
import type {
  AttendanceExcuseRequest,
  ExcuseReasonCategory,
  ExternalOfficerMeeting,
} from '../types/externalOfficer';

interface ExcuseRequestResponse {
  message: string;
  excuse_request: AttendanceExcuseRequest;
}

export const externalOfficerService = {
  async getDashboard(): Promise<ExternalOfficerMeeting[]> {
    const { data } = await api.get<{ meetings: ExternalOfficerMeeting[] }>(
      '/external-officer/dashboard',
    );

    return data.meetings;
  },

  async previewLetter(letterId: number): Promise<string> {
    const { data } = await api.get<{ preview_html: string }>(
      `/external-officer/letters/${letterId}/preview`,
    );
    return data.preview_html;
  },

  async submitExcuseRequest(
    meetingId: number,
    reasonCategory: ExcuseReasonCategory,
    reasonDetails: string,
  ): Promise<ExcuseRequestResponse> {
    const { data } = await api.post<ExcuseRequestResponse>(
      `/external-officer/meetings/${meetingId}/excuse-request`,
      { reason_category: reasonCategory, reason_details: reasonDetails },
    );

    return data;
  },

  async updateExcuseRequest(
    meetingId: number,
    reasonCategory: ExcuseReasonCategory,
    reasonDetails: string,
  ): Promise<ExcuseRequestResponse> {
    const { data } = await api.put<ExcuseRequestResponse>(
      `/external-officer/meetings/${meetingId}/excuse-request`,
      { reason_category: reasonCategory, reason_details: reasonDetails },
    );

    return data;
  },

  async withdrawExcuseRequest(meetingId: number): Promise<ExcuseRequestResponse> {
    const { data } = await api.delete<ExcuseRequestResponse>(
      `/external-officer/meetings/${meetingId}/excuse-request`,
    );

    return data;
  },
};
