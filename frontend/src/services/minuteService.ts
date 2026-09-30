import { api } from '../lib/axios';
import type { MeetingMinute, MinuteDecision, ActionItem, LetterRecipientOption } from '../types/minute';
import type { Meeting } from '../types/meeting';

export const minuteService = {
  async getOrCreateForMeeting(meetingId: number): Promise<{ minute: MeetingMinute; meeting: Meeting; letter_recipients: LetterRecipientOption[] }> {
    const { data } = await api.get(`/officer/meetings/${meetingId}/minutes`);
    return data;
  },

  async saveDraft(minuteId: number, payload: Pick<MeetingMinute, 'meeting_description' | 'discussion_summary' | 'closing_remarks' | 'signatory_name' | 'signatory_designation'>): Promise<MeetingMinute> {
    const { data } = await api.put<{ minute: MeetingMinute }>(`/officer/minutes/${minuteId}`, payload);
    return data.minute;
  },

  async submitForApproval(minuteId: number): Promise<MeetingMinute> {
    const { data } = await api.post<{ minute: MeetingMinute }>(`/officer/minutes/${minuteId}/submit`);
    return data.minute;
  },

  async addDecision(minuteId: number, payload: Pick<MinuteDecision, 'topic' | 'decision_text' | 'responsibility'>): Promise<MinuteDecision> {
    const { data } = await api.post<{ decision: MinuteDecision }>(`/officer/minutes/${minuteId}/decisions`, payload);
    return data.decision;
  },

  async updateDecision(decisionId: number, payload: Pick<MinuteDecision, 'topic' | 'decision_text' | 'responsibility'>): Promise<MinuteDecision> {
    const { data } = await api.put<{ decision: MinuteDecision }>(`/officer/decisions/${decisionId}`, payload);
    return data.decision;
  },

  async deleteDecision(decisionId: number): Promise<void> {
    await api.delete(`/officer/decisions/${decisionId}`);
  },

  async addActionItem(minuteId: number, payload: { task_description: string; responsible_officer_id: number; deadline: string }): Promise<ActionItem> {
    const { data } = await api.post<{ action_item: ActionItem }>(`/officer/minutes/${minuteId}/action-items`, payload);
    return data.action_item;
  },

  async deleteActionItem(itemId: number): Promise<void> {
    await api.delete(`/officer/action-items/${itemId}`);
  },

  async downloadPdf(minuteId: number): Promise<Blob> {
    try {
      const response = await api.get(`/minutes/${minuteId}/download/pdf`, { responseType: 'blob' });
      return response.data;
    } catch {
      const response = await api.get(`/officer/minutes/${minuteId}/download/pdf`, { responseType: 'blob' });
      return response.data;
    }
  },
};

