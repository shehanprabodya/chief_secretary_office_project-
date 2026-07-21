import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { adminService } from '../services/adminService';
import type { SubjectPayload, SubjectRecord } from '../types/admin';

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };

const emptyForm: SubjectPayload = { code: '', title: '', description: '' };

function errorMessage(error: unknown, fallback: string) {
  const data = (error as ApiError).response?.data;
  const validationMessage = data?.errors ? Object.values(data.errors).flat()[0] : null;
  return validationMessage || data?.message || fallback;
}

export default function SubjectManagementPage() {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<SubjectRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SubjectPayload>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSubjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await adminService.getSubjects(search, page);
      setSubjects(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Unable to load subjects.') });
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSubjects();
  }, [loadSubjects]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setMessage(null);
    setShowForm(true);
  };

  const openEdit = (subject: SubjectRecord) => {
    setEditing(subject);
    setForm({ code: subject.code, title: subject.title, description: subject.description ?? '' });
    setMessage(null);
    setShowForm(true);
  };

  const saveSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      if (editing) await adminService.updateSubject(editing.id, form);
      else await adminService.createSubject(form);
      setShowForm(false);
      setMessage({ type: 'success', text: editing ? 'Subject updated successfully.' : 'Subject created successfully.' });
      await loadSubjects();
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Unable to save subject.') });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSubject = async (subject: SubjectRecord) => {
    if (!window.confirm(`Delete subject ${subject.code} — ${subject.title}?`)) return;
    setMessage(null);
    try {
      await adminService.deleteSubject(subject.id);
      setMessage({ type: 'success', text: 'Subject deleted successfully.' });
      await loadSubjects();
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Unable to delete subject.') });
    }
  };

  return (
    <DashboardLayout pageTitle="Subject Management">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-bold text-slate-900">Subject Management</h1><p className="mt-1 text-sm text-slate-500">Create and maintain subjects used for meetings and letters.</p></div>
          <button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"><Plus className="h-4 w-4" />Add Subject</button>
        </div>

        {message && <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><BookOpen className="h-6 w-6" /></div><div><p className="text-2xl font-bold text-slate-900">{isLoading ? '—' : total}</p><p className="text-sm text-slate-500">Total subjects</p></div></div>
        </div>

        <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search code, title or description" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><th className="px-6 py-3">Code</th><th className="px-6 py-3">Title</th><th className="px-6 py-3">Description</th><th className="px-6 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{isLoading ? <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">Loading subjects...</td></tr> : subjects.length === 0 ? <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">No subjects found.</td></tr> : subjects.map((subject) => <tr key={subject.id} className="hover:bg-slate-50"><td className="px-6 py-4"><span className="rounded-md bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-700">{subject.code}</span></td><td className="px-6 py-4 text-sm font-semibold text-slate-900">{subject.title}</td><td className="max-w-md px-6 py-4 text-sm text-slate-500">{subject.description || '—'}</td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit(subject)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" title="Edit subject"><Pencil className="h-4 w-4" /></button><button onClick={() => deleteSubject(subject)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete subject"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3"><p className="text-sm text-slate-500">{total} subject{total === 1 ? '' : 's'}</p><div className="flex gap-2"><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">Previous</button><span className="px-2 py-1.5 text-sm text-slate-500">{page} / {lastPage}</span><button onClick={() => setPage((value) => Math.min(lastPage, value + 1))} disabled={page === lastPage} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">Next</button></div></div>
        </div>
      </div>

      {showForm && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={saveSubject} className="w-full max-w-lg rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-6 py-4"><div><h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Subject' : 'Add Subject'}</h2><p className="text-sm text-slate-500">Enter the subject details below.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-6"><label className="block text-sm font-semibold text-slate-700">Subject code<input required maxLength={50} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500" placeholder="e.g. DEV-01" /></label><label className="block text-sm font-semibold text-slate-700">Subject title<input required maxLength={255} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label><label className="block text-sm font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span><textarea rows={4} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label></div><div className="flex justify-end gap-3 border-t px-6 py-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button disabled={isSaving} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Subject'}</button></div></form></div>}
    </DashboardLayout>
  );
}
