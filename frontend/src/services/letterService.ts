import { api } from '../lib/axios';
import type { Letter } from '../types/letter';

export interface LetterPayload {
  meeting_id?: number | null;
  sender_name: string;
  title: string;
  content: string;
  designation?: string;
  signatory_name?: string;
  signature_date?: string;
  department_ids: number[];
}

export const letterService = {
  async getById(id: number): Promise<Letter> {
    const { data } = await api.get<{ letter: Letter }>(`/letters/${id}`);
    return data.letter;
  },

  async create(payload: LetterPayload): Promise<Letter> {
    const { data } = await api.post<{ letter: Letter }>('/letters', payload);
    return data.letter;
  },

  async update(id: number, payload: Partial<LetterPayload>): Promise<Letter> {
    const { data } = await api.put<{ letter: Letter }>(`/letters/${id}`, payload);
    return data.letter;
  },

  async sendForApproval(id: number): Promise<Letter> {
    const { data } = await api.post<{ letter: Letter }>(`/letters/${id}/send-for-approval`);
    return data.letter;
  },

  async discard(id: number): Promise<void> {
    await api.delete(`/letters/${id}`);
  },
};