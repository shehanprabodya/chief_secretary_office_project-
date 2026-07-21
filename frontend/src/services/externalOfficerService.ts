import { api } from '../lib/axios';
import type { ExternalOfficerMeeting } from '../types/externalOfficer';

export const externalOfficerService = {
  async getDashboard(): Promise<ExternalOfficerMeeting[]> {
    const { data } = await api.get<{ meetings: ExternalOfficerMeeting[] }>(
      '/external-officer/dashboard',
    );

    return data.meetings;
  },
};
