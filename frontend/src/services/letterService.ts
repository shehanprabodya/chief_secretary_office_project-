import { api } from '../lib/axios';
import type { Letter, Organization, Subject } from '../types/letter';

export interface DraftPayload {
  letter_id?: number;
  meeting_id?: number;
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

export interface LetterListParams {
  page?: number;
  per_page?: number;
  subject_code?: string;
  subject_title?: string;
  start_date?: string;
  end_date?: string;
}

export interface LetterPagination {
  current_page: number;
  data: Letter[];
  from: number | null;
  to: number | null;
  last_page: number;
  per_page: number;
  total: number;
}


const getDownloadFilename = (contentDisposition: string | undefined, fallback: string) => {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      // Fall through to the plain filename when the encoded value is malformed.
    }
  }
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() ?? fallback;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const letterService = {
   async getMyLetters(
    params: LetterListParams = {}
  ): Promise<LetterPagination> {
    const { data } = await api.get<LetterPagination>(
      '/officer/letters',
      {
        params,
      }
    );

    return data;
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
    const filename = getDownloadFilename(response.headers['content-disposition'], `letter-${id}.pdf`);
    downloadBlob(new Blob([response.data], { type: 'application/pdf' }), filename);
  },

  async downloadDocx(id: number): Promise<void> {
    const response = await api.get(`/officer/letters/${id}/download/docx`, { responseType: 'blob' });
    const filename = getDownloadFilename(response.headers['content-disposition'], `letter-${id}.docx`);
    downloadBlob(
      new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      filename
    );
  },

  async getOrganizations(): Promise<Organization[]> {
    const { data } = await api.get<{ organizations: Organization[] }>('/officer/letter-recipients/orgs');
    return data.organizations;
  },

  async getSubjects(): Promise<Subject[]> {
    const { data } = await api.get<{ subjects: Subject[] }>('/officer/subjects');
    return data.subjects;
  },

  async send(id: number): Promise<any> {
    const { data } = await api.post(`/officer/letters/${id}/send`);
    return data;
  },
};
