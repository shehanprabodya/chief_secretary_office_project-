interface RecordPaginationProps {
  page: number;
  lastPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export default function RecordPagination({ page, lastPage, disabled = false, onPageChange }: RecordPaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm">
      <span className="text-slate-500">Page {page} of {lastPage}</span>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1 || disabled} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button>
        <button onClick={() => onPageChange(Math.min(lastPage, page + 1))} disabled={page === lastPage || disabled} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
