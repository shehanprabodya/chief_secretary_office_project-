export interface RecordFilterValues {
  search: string;
  officerId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

export const emptyRecordFilters: RecordFilterValues = {
  search: '',
  officerId: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};
