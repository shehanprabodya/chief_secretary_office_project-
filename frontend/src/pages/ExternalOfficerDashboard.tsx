import { useEffect, useMemo, useState } from 'react';
import {
  Building2, CalendarDays, CheckCircle2, ChevronRight, Clock3, Download,
  FileText, MapPin, RefreshCw, Search, Users, Video, X,
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { externalOfficerService } from '../services/externalOfficerService';
import type { ExternalOfficerMeeting } from '../types/externalOfficer';
import { sanitizeDocumentHtml } from '../utils/sanitizeHtml';

type Filter = 'All' | 'Upcoming' | 'Completed';

const meetingState = (meeting: ExternalOfficerMeeting): Exclude<Filter, 'All'> =>
  meeting.status === 'completed' || new Date(`${meeting.meeting_date}T23:59:59`) < new Date()
    ? 'Completed'
    : 'Upcoming';

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

const formatTime = (time: string | null) => {
  if (!time) return 'Not specified';
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
};

const plainText = (html: string | null | undefined) => {
  if (!html) return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  return document.body.textContent?.trim() ?? '';
};

export default function ExternalOfficerDashboard() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<ExternalOfficerMeeting[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [letterMeeting, setLetterMeeting] = useState<ExternalOfficerMeeting | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await externalOfficerService.getDashboard();
      setMeetings(result);
      setSelectedId((current) => current && result.some((item) => item.meeting_id === current)
        ? current
        : (result[0]?.meeting_id ?? null));
    } catch (err) {
      console.error(err);
      setError('Unable to load your meetings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, []);

  const selected = meetings.find((meeting) => meeting.meeting_id === selectedId) ?? null;
  const visibleMeetings = useMemo(() => {
    const value = query.trim().toLowerCase();
    return meetings.filter((meeting) =>
      (filter === 'All' || meetingState(meeting) === filter) &&
      (!value || `${meeting.title} ${meeting.reference_id ?? ''} ${meeting.meeting_code ?? ''} ${meeting.organizer ?? ''}`.toLowerCase().includes(value)),
    );
  }, [filter, meetings, query]);

  const upcomingCount = meetings.filter((meeting) => meetingState(meeting) === 'Upcoming').length;
  const letterCount = meetings.filter((meeting) => meeting.letter).length;

  return (
    <DashboardLayout pageTitle="External Officer Portal">
      <div
        className="mx-auto flex max-w-7xl flex-col"
        style={{ gap: '2.5rem' }}
      >
        <section className="overflow-hidden rounded-2xl bg-[var(--color-primary)] text-white shadow-sm">
          <div className="relative px-6 py-7 sm:px-8">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/5" />
            <h1 className="text-2xl font-bold sm:text-3xl">Welcome, {user?.full_name ?? 'External Officer'}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-blue-100">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  <span className="font-semibold text-white">Designation:</span>{' '}
                  {user?.designation || '—'}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>
                  <span className="font-semibold text-white">Organization:</span>{' '}
                  {user?.organization || '—'}
                </span>
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">View official meeting invitations, schedules and approved letters issued to you.</p>
          </div>
        </section>

        {error && <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={loadDashboard} className="font-semibold underline">Retry</button></div>}

        <section className="grid gap-5 sm:grid-cols-3">
          {[
            { label: 'Total meetings', value: meetings.length, icon: CalendarDays, color: 'bg-blue-50 text-blue-700' },
            { label: 'Upcoming', value: upcomingCount, icon: Clock3, color: 'bg-amber-50 text-amber-700' },
            { label: 'Meeting letters', value: letterCount, icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
          ].map((item) => <div key={item.label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`rounded-xl p-3 ${item.color}`}><item.icon className="h-6 w-6" /></div><div><p className="text-2xl font-bold text-slate-900">{isLoading ? '—' : item.value}</p><p className="text-sm text-slate-500">{item.label}</p></div></div>)}
        </section>

        <section id="meetings" className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)]">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">My meetings</h2><p className="mt-1 text-sm text-slate-500">Meetings to which you have been officially assigned.</p></div><button onClick={loadDashboard} disabled={isLoading} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Refresh meetings"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button></div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or reference" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div><div className="flex rounded-lg bg-slate-100 p-1">{(['All', 'Upcoming', 'Completed'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{item}</button>)}</div></div>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading ? <div className="p-12 text-center text-sm text-slate-500">Loading your meetings...</div> : visibleMeetings.map((meeting) => {
                const dateParts = formatDate(meeting.meeting_date).split(' ');
                return <button key={meeting.meeting_id} onClick={() => setSelectedId(meeting.meeting_id)} className={`flex w-full gap-4 p-5 text-left transition hover:bg-slate-50 ${selectedId === meeting.meeting_id ? 'bg-blue-50/60' : ''}`}><div className="w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white text-center"><div className="bg-[var(--color-primary)] py-1 text-[10px] font-bold uppercase text-white">{dateParts[1]?.slice(0, 3)}</div><div className="py-1.5 text-xl font-bold text-slate-800">{dateParts[0]}</div></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-slate-900">{meeting.title}</h3><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /></div><p className="mt-1 text-xs font-medium text-blue-700">{meeting.reference_id ?? meeting.meeting_code ?? 'Reference pending'}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatTime(meeting.start_time)}</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{meeting.location ?? 'Venue pending'}</span></div></div></button>;
              })}
              {!isLoading && visibleMeetings.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No assigned meetings found.</div>}
            </div>
          </div>

          {selected ? <div className="self-start rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meeting details</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meetingState(selected) === 'Upcoming' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{meetingState(selected)}</span></div><h2 className="mt-3 text-xl font-bold text-slate-900">{selected.title}</h2><p className="mt-1 text-sm font-medium text-blue-700">{selected.reference_id ?? selected.meeting_code ?? 'Reference pending'}</p></div><div className="space-y-6 p-5"><div className="grid gap-3 sm:grid-cols-2">{[
            { icon: CalendarDays, label: 'Date', value: formatDate(selected.meeting_date) },
            { icon: Clock3, label: 'Time', value: `${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}` },
            { icon: selected.location_type === 'virtual' ? Video : MapPin, label: selected.location_type === 'virtual' ? 'Meeting link' : 'Venue', value: selected.location ?? '—' },
            { icon: Users, label: 'Expected attendees', value: `${selected.attendees_count} participants` },
            { icon: Building2, label: 'Organised by', value: selected.organizer ?? '—' },
            { icon: CheckCircle2, label: 'Subject', value: selected.subject?.title ?? selected.meeting_code ?? '—' },
          ].map((detail) => <div key={detail.label} className="flex gap-3 rounded-lg bg-slate-50 p-3"><detail.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" /><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{detail.label}</p><p className="mt-0.5 text-sm font-medium text-slate-700">{detail.value}</p></div></div>)}</div><div><h3 className="text-sm font-bold text-slate-900">Meeting description</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{selected.description || 'No additional meeting description has been provided.'}</p></div>{selected.letter ? <button id="letters" onClick={() => setLetterMeeting(selected)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"><FileText className="h-4 w-4" />View approved meeting letter</button> : <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">The approved meeting letter is not available yet.</div>}</div></div> : <div className="self-start rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Select a meeting to view its details.</div>}
        </section>
      </div>

      {letterMeeting?.letter && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setLetterMeeting(null)}><div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3"><div><h2 className="font-bold text-slate-900">Meeting letter</h2><p className="text-xs text-slate-500">Letter #{letterMeeting.letter.letter_id} · {letterMeeting.letter.status}</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Print / Save PDF</button><button onClick={() => setLetterMeeting(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close letter"><X className="h-5 w-5" /></button></div></div><div className="overflow-y-auto p-4 sm:p-8"><article className="mx-auto min-h-[720px] max-w-2xl bg-white px-8 py-10 text-slate-800 shadow-sm sm:px-14">{(letterMeeting.letter.sender_name || letterMeeting.letter.organization_name || letterMeeting.letter.organization_address) && <div className="border-b-2 border-slate-800 pb-5 text-center">{letterMeeting.letter.sender_name && <p className="text-lg font-bold uppercase">{letterMeeting.letter.sender_name}</p>}{letterMeeting.letter.organization_name && <p className="mt-1 text-sm">{letterMeeting.letter.organization_name}</p>}{letterMeeting.letter.organization_address && <p className="mt-1 whitespace-pre-line text-xs text-slate-500">{letterMeeting.letter.organization_address}</p>}</div>}<div className="mt-6 flex justify-between text-sm"><span>Ref: <strong>{letterMeeting.reference_id ?? letterMeeting.meeting_code ?? letterMeeting.letter.letter_id}</strong></span>{letterMeeting.letter.signature_date && <span>{formatDate(letterMeeting.letter.signature_date)}</span>}</div>{letterMeeting.letter.title && <h3 className="mt-8 text-center text-sm font-bold uppercase underline underline-offset-4">{plainText(letterMeeting.letter.title)}</h3>}{letterMeeting.letter.content && <div className="mt-8 text-sm leading-7 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: sanitizeDocumentHtml(letterMeeting.letter.content) }} />}{(letterMeeting.letter.signatory_name || letterMeeting.letter.designation) && <div className="mt-12 text-sm"><div className="mt-10 w-52 border-t border-slate-500 pt-2">{letterMeeting.letter.signatory_name && <p className="font-bold">{letterMeeting.letter.signatory_name}</p>}{letterMeeting.letter.designation && <p className="text-xs text-slate-500">{letterMeeting.letter.designation}</p>}</div></div>}</article></div></div></div>}
    </DashboardLayout>
  );
}
