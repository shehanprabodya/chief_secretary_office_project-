import { useEffect, useMemo, useState } from 'react';

export type DistributionRecipient = { key: string; name: string | null; email: string; organization: string | null; status?: string | null; error_details?: string | null };

type RecipientSelectionModalProps = {
  title: string;
  load: () => Promise<DistributionRecipient[]>;
  send: (keys: string[]) => Promise<{ message?: string; summary?: { total: number; sent: number; failed: number; pending: number } }>;
  onClose: () => void;
  onComplete: (message: string) => void;
};

export default function RecipientSelectionModal({ title, load, send, onClose, onComplete }: RecipientSelectionModalProps) {
  const [recipients, setRecipients] = useState<DistributionRecipient[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  useEffect(() => { void load().then((items) => { setRecipients(items); setSelected(items.filter((item) => item.status !== 'sent').map((item) => item.key)); }).catch(() => setError('Unable to load eligible recipients.')).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => recipients.filter((item) => `${item.name} ${item.email} ${item.organization}`.toLowerCase().includes(search.toLowerCase())), [recipients, search]);
  const toggle = (key: string) => setSelected((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  const submit = async () => { if (!selected.length) return setError('Select at least one recipient.'); if (!window.confirm(`Send this official document to ${selected.length} selected recipient(s)?`)) return; setSending(true); setError(''); try { const result = await send(selected); const summary = result.summary; onComplete(`${result.message ?? 'Email distribution queued.'}${summary ? ` Total: ${summary.total}; sent: ${summary.sent}; failed: ${summary.failed}; pending: ${summary.pending}.` : ''}`); } catch (e: any) { setError(e?.response?.data?.message ?? 'Unable to queue the email distribution.'); } finally { setSending(false); } };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button onClick={onClose} aria-label="Close">×</button></div><p className="mt-1 text-sm text-slate-500">Previously sent recipients are not selected automatically. Failed recipients can be safely retried.</p><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, organization or email" className="mt-4 w-full rounded border border-slate-300 px-3 py-2 text-sm" /> <div className="mt-2 flex gap-2 text-sm"><button onClick={() => setSelected(filtered.filter((item) => item.status !== 'sent').map((item) => item.key))} className="text-blue-700">Select all</button><button onClick={() => setSelected([])} className="text-blue-700">Deselect all</button></div>{loading ? <p className="py-8 text-center text-sm">Loading recipients…</p> : <div className="mt-3 max-h-72 overflow-auto rounded border">{filtered.map((item) => <label key={item.key} className="flex gap-3 border-b p-3 text-sm last:border-0"><input type="checkbox" checked={selected.includes(item.key)} disabled={item.status === 'sent'} onChange={() => toggle(item.key)} /><span className="flex-1"><b>{item.name || 'Recipient'}</b><br /><span className="text-slate-500">{item.organization || '—'} · {item.email}</span></span><span className={item.status === 'failed' ? 'text-red-600' : item.status === 'sent' ? 'text-green-700' : 'text-slate-500'}>{item.status || 'Not sent'}</span></label>)}{!filtered.length && <p className="p-4 text-sm text-slate-500">No valid recipients found.</p>}</div>}{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-5 flex justify-end gap-3"><button onClick={onClose} disabled={sending} className="rounded border px-4 py-2 text-sm">Cancel</button><button onClick={() => void submit()} disabled={loading || sending || !selected.length} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{sending ? 'Queueing…' : `Send selected (${selected.length})`}</button></div></div></div>;
}
