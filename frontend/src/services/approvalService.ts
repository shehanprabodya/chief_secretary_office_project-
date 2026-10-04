import { api } from '../lib/axios';
import type { ApprovableDocument, ApprovalComment } from '../types/approval';
import type { Organization } from '../types/letter';

export interface SubmitApprovalPayload {
  document_type: 'letter' | 'minute' | 'grant' | 'training_request' | 'hr_transfer';
  source_id?: number;
  subject: string;
  description?: string;
  full_content?: string;
  amount?: number;
}

export type DepartmentHeadEditPayload =
  | {
      title: string;
      content: string;
      designation?: string | null;
      signatory_name?: string | null;
      signature_date?: string | null;
      recipients: Array<{
        organization_id?: number | null;
        user_id?: number | null;
        recipient_label?: string | null;
      }>;
    }
  | {
      meeting_description?: string | null;
      discussion_summary?: string | null;
      closing_remarks?: string | null;
      signatory_name?: string | null;
      signatory_designation?: string | null;
      decisions: Array<{
        decision_id: number;
        topic: string | null;
        decision_text: string;
        responsibility: string | null;
      }>;
    };

export const approvalService = {
  async getRecipientOrganizations(): Promise<Organization[]> {
    try {
      const { data } = await api.get<{ organizations: Organization[] }>('/dept-head/letter-recipient-organizations');
      return data.organizations;
    } catch {
      // Keep letter editing available on deployments that have not refreshed
      // their route cache for the department head recipient lookup yet.
      const { data } = await api.get<{ organizations: Array<Pick<Organization, 'organization_id' | 'organization_name'>> }>('/admin/lookups/organizations');
      return data.organizations.map((organization) => ({
        ...organization,
        abbreviation: null,
      }));
    }
  },

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

  async editAndForward(id: number, payload: DepartmentHeadEditPayload, notes?: string): Promise<ApprovableDocument> {
    const { data } = await api.put<{ document: ApprovableDocument }>(`/approvals/${id}/edit-and-forward`, {
      ...payload,
      notes,
    });
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
