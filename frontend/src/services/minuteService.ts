import { api } from '../lib/axios';
import type { MeetingMinute, MinuteDecision, ActionItem } from '../types/minute';
import type { Meeting } from '../types/meeting';

export const minuteService = {
  async getOrCreateForMeeting(meetingId: number): Promise<{ minute: MeetingMinute; meeting: Meeting }> {
    const { data } = await api.get(`/meetings/${meetingId}/minutes`);
    return data;
  },

  async saveDraft(minuteId: number, discussion_summary: string): Promise<MeetingMinute> {
    const { data } = await api.put<{ minute: MeetingMinute }>(`/minutes/${minuteId}`, { discussion_summary });
    return data.minute;
  },

  async submitForApproval(minuteId: number): Promise<MeetingMinute> {
    const { data } = await api.post<{ minute: MeetingMinute }>(`/minutes/${minuteId}/submit`);
    return data.minute;
  },

  async addDecision(minuteId: number, decision_text: string): Promise<MinuteDecision> {
    const { data } = await api.post<{ decision: MinuteDecision }>(`/minutes/${minuteId}/decisions`, { decision_text });
    return data.decision;
  },

  async deleteDecision(decisionId: number): Promise<void> {
    await api.delete(`/decisions/${decisionId}`);
  },

  async addActionItem(minuteId: number, payload: { task_description: string; responsible_officer_id: number; deadline: string }): Promise<ActionItem> {
    const { data } = await api.post<{ action_item: ActionItem }>(`/minutes/${minuteId}/action-items`, payload);
    return data.action_item;
  },

  async deleteActionItem(itemId: number): Promise<void> {
    await api.delete(`/action-items/${itemId}`);
  },
};

