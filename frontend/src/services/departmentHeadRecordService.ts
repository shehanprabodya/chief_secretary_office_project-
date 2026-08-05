import { api } from '../lib/axios';
import type {
  DepartmentHeadLetter,
  DepartmentHeadRecordFilters,
  DepartmentOfficer,
  PaginatedResponse,
} from '../types/departmentHeadRecords';

export const departmentHeadRecordService = {
  async getOfficers(search = ''): Promise<DepartmentOfficer[]> {
    const { data } = await api.get<{ officers: DepartmentOfficer[] }>('/dept-head/officers', {
      params: { search: search || undefined },
    });
    return data.officers;
  },

  async getLetters(filters: DepartmentHeadRecordFilters): Promise<PaginatedResponse<DepartmentHeadLetter>> {
    const { data } = await api.get<PaginatedResponse<DepartmentHeadLetter>>('/dept-head/letters', {
      params: filters,
    });
    return data;
  },

  async previewLetter(letterId: number): Promise<string> {
    const { data } = await api.get<{ preview_html: string }>(`/dept-head/letters/${letterId}/preview`);
    return data.preview_html;
  },
};
