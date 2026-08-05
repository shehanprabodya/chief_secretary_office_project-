import { Search } from 'lucide-react';
import type { DepartmentOfficer } from '../../types/departmentHeadRecords';
import type { RecordFilterValues } from './recordFilterValues';

interface RecordFiltersProps {
  values: RecordFilterValues;
  officers: DepartmentOfficer[];
  statuses: Array<{ value: string; label: string }>;
  searchPlaceholder: string;
  onChange: (values: RecordFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function RecordFilters({
  values,
  officers,
  statuses,
  searchPlaceholder,
  onChange,
  onApply,
  onReset,
}: RecordFiltersProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-x-5 gap-y-5 md:grid-cols-2 xl:grid-cols-5">
        <label className="xl:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Search</span>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={values.search}
              onChange={(event) => onChange({ ...values, search: event.target.value })}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Officer</span>
          <select value={values.officerId} onChange={(event) => onChange({ ...values, officerId: event.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">All officers</option>
            {officers.map((officer) => <option key={officer.user_id} value={officer.user_id}>{officer.full_name}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Status</span>
          <select value={values.status} onChange={(event) => onChange({ ...values, status: event.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label><span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">From</span><input type="date" value={values.dateFrom} onChange={(event) => onChange({ ...values, dateFrom: event.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label><span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">To</span><input type="date" min={values.dateFrom || undefined} value={values.dateTo} onChange={(event) => onChange({ ...values, dateTo: event.target.value })} className="h-10 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
        <button type="button" onClick={onReset} className="min-w-24 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Reset</button>
        <button type="submit" className="min-w-32 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">Apply filters</button>
      </div>
    </form>
  );
}
