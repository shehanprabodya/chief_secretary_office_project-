interface RecordPaginationProps {
  page: number;
  lastPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export default function RecordPagination({ page, lastPage, disabled = false, onPageChange }: RecordPaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 text-sm sm:px-6">
      <span className="text-slate-500">Page {page} of {lastPage}</span>
      <div className="flex gap-3">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1 || disabled} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">Previous</button>
        <button onClick={() => onPageChange(Math.min(lastPage, page + 1))} disabled={page === lastPage || disabled} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
