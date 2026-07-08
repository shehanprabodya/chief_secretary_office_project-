import { api } from '../lib/axios';
import type { Letter, Organization, Subject } from '../types/letter';

export interface DraftPayload {
  letter_id?: number;
  subject_id?: number;
  title?: string;
  content?: string;
  designation?: string;
  signatory_name?: string;
  signature_date?: string;
  recipients?: Array<{
    organization_id?: number;
    user_id?: number;
    recipient_label?: string;
  }>;
}

export const letterService = {
  async getMyLetters(): Promise<Letter[]> {
    const { data } = await api.get<{ letters: Letter[] }>('/officer/letters');
    return data.letters;
  },

  async getById(id: number): Promise<Letter> {
    const { data } = await api.get<{ letter: Letter }>(`/officer/letters/${id}`);
    return data.letter;
  },

  async saveDraft(payload: DraftPayload): Promise<Letter> {
    const { data } = await api.post<{ letter: Letter }>('/officer/letters/draft', payload);
    return data.letter;
  },

  async generate(id: number): Promise<{ letter: Letter; generated_html: string }> {
    const { data } = await api.get(`/officer/letters/${id}/generate`);
    return data;
  },

  async preview(id: number): Promise<{ preview_html: string; letter: Letter }> {
    const { data } = await api.get(`/officer/letters/${id}/preview`);
    return data;
  },

  async downloadPdf(id: number): Promise<void> {
    const response = await api.get(`/officer/letters/${id}/download/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `letter-${id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  async getOrganizations(): Promise<Organization[]> {
    const { data } = await api.get<{ organizations: Organization[] }>('/officer/letter-recipients/orgs');
    return data.organizations;
  },

  async getSubjects(): Promise<Subject[]> {
    const { data } = await api.get<{ subjects: Subject[] }>('/officer/subjects');
    return data.subjects;
  },
};
