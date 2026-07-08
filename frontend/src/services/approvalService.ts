import { api } from '../lib/axios';
import type { ApprovableDocument, ApprovalComment } from '../types/approval';

export interface SubmitApprovalPayload {
  document_type: 'letter' | 'grant' | 'training_request' | 'hr_transfer';
  source_id?: number;
  subject: string;
  description?: string;
  full_content?: string;
  amount?: number;
}

export const approvalService = {
  async list(search?: string, status?: string): Promise<ApprovableDocument[]> {
    const { data } = await api.get<{ documents: ApprovableDocument[] }>('/approvals', {
      params: { search, status },
    });
    return data.documents;
  },

  async getById(id: number): Promise<ApprovableDocument> {
    const { data } = await api.get<{ document: ApprovableDocument }>(`/approvals/${id}`);
    return data.document;
  },

  async submit(payload: SubmitApprovalPayload): Promise<ApprovableDocument> {
    const { data } = await api.post<{ document: ApprovableDocument }>('/approvals', payload);
    return data.document;
  },

  async approve(id: number, notes?: string): Promise<ApprovableDocument> {
    const { data } = await api.post<{ document: ApprovableDocument }>(`/approvals/${id}/approve`, { notes });
    return data.document;
  },

  async reject(id: number, notes?: string): Promise<ApprovableDocument> {
    const { data } = await api.post<{ document: ApprovableDocument }>(`/approvals/${id}/reject`, { notes });
    return data.document;
  },

  async addComment(id: number, comment: string): Promise<ApprovalComment> {
    const { data } = await api.post<{ comment: ApprovalComment }>(`/approvals/${id}/comments`, { comment });
    return data.comment;
  },
};
