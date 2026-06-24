interface StatusBadgeProps {
  status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
}

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  scheduled: { label: 'Scheduled', classes: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  completed: { label: 'Completed', classes: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  draft: { label: 'Draft', classes: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${config.classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}