import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ApprovalActivityItem } from '../../types/approval';

interface ApprovalActivityLogProps {
  items: ApprovalActivityItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  emptyMessage?: string;
}

function actionTone(action: string): string {
  if (action.includes('reject')) return 'text-red-600';
  if (action.includes('approve') || action.includes('signed') || action.includes('delegated')) return 'text-green-600';
  if (action.includes('unavailable')) return 'text-amber-700';
  return 'text-slate-600';
}

function formatAge(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

function documentLabel(item: ApprovalActivityItem): string {
  const code = item.subject_code?.trim();
  const category = item.subject_category?.trim();
  if (code && category) return `${code} - ${category}`;
  return code || item.subject || 'Untitled document';
}

export default function ApprovalActivityLog({
  items,
  isLoading,
  error,
  onRefresh,
  emptyMessage = 'No activity recorded yet.',
}: ApprovalActivityLogProps) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) => {
      const haystack = [
        item.subject_code,
        item.subject_category,
        item.subject,
        item.message,
        item.action,
        item.document_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [items, search]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Activity Log</h2>
          <p className="text-sm text-slate-500">Recent approval flow actions by your account.</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, category, subject, action..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-md"
        />
        {search.trim() ? (
          <button
            onClick={() => setSearch('')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        ) : null}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-lg border border-slate-100 p-4 text-sm text-slate-400">Loading activity...</div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-lg border border-slate-100 p-4 text-sm text-slate-400">{emptyMessage}</div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.event_id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{documentLabel(item)}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.message}</p>
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">{formatAge(item.at)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="rounded bg-slate-100 px-2 py-0.5 uppercase tracking-wide text-slate-600">{item.document_type}</span>
                <span className={`font-semibold ${actionTone(item.action)}`}>{item.action}</span>
                <span className="text-slate-400">{new Date(item.at).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
