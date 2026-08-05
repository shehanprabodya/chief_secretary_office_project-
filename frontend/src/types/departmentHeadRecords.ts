import type { LetterStatus, Organization, Subject } from './letter';

export interface DepartmentOfficer {
  user_id: number;
  full_name: string;
  email: string;
  designation: string | null;
  organization?: Pick<Organization, 'organization_id' | 'organization_name'> | null;
}

export interface DepartmentHeadLetter {
  letter_id: number;
  meeting_id: number | null;
  meeting_code: string | null;
  title: string;
  status: LetterStatus;
  signature_date: string | null;
  created_at: string;
  recipients_count: number;
  subject?: Subject | null;
  creator: DepartmentOfficer;
  meeting?: {
    meeting_id: number;
    title: string;
    meeting_date: string | null;
  } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface DepartmentHeadRecordFilters {
  officer_id?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}
