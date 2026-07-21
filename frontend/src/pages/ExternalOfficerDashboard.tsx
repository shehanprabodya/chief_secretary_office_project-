import { useMemo, useState } from 'react';
import {Building2,CalendarDays,CheckCircle2,ChevronRight,Clock3,Download,FileText,MapPin,Search,Users,Video,X,
} from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';

type ExternalMeeting = {
  id: number;
  reference: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  mode: 'Physical' | 'Online';
  organizer: string;
  chair: string;
  status: 'Upcoming' | 'Completed';
  purpose: string;
  agenda: string[];
  attendees: number;
  letterRef: string;
};

const MEETINGS: ExternalMeeting[] = [
  {
    id: 1,
    reference: 'CSO/DEV/07/2026',
    title: 'Provincial Development Progress Review',
    date: '24 July 2026',
    time: '09:30 AM',
    endTime: '11:30 AM',
    location: 'Main Conference Hall, Chief Secretary’s Office',
    mode: 'Physical',
    organizer: 'Development Division',
    chair: 'Chief Secretary, Central Province',
    status: 'Upcoming',
    purpose: 'Review the second-quarter progress of priority provincial development projects and agree on corrective actions for delayed activities.',
    agenda: ['Opening remarks and confirmation of agenda', 'Progress review by implementing agencies', 'Budget utilisation and procurement updates', 'Decisions, responsibilities and deadlines'],
    attendees: 18,
    letterRef: 'CSO/LET/2026/0148',
  },
  {
    id: 2,
    reference: 'CSO/FIN/11/2026',
    title: 'Annual Budget Preparation Coordination Meeting',
    date: '30 July 2026',
    time: '02:00 PM',
    endTime: '03:30 PM',
    location: 'Microsoft Teams',
    mode: 'Online',
    organizer: 'Finance Division',
    chair: 'Deputy Chief Secretary (Finance)',
    status: 'Upcoming',
    purpose: 'Coordinate departmental submissions and clarify the timetable for the 2027 provincial budget estimates.',
    agenda: ['Budget circular highlights', 'Department submission timetable', 'Capital project prioritisation', 'Questions and next steps'],
    attendees: 24,
    letterRef: 'CSO/LET/2026/0156',
  },
  {
    id: 3,
    reference: 'CSO/ADM/04/2026',
    title: 'Inter-Agency Service Delivery Review',
    date: '15 July 2026',
    time: '10:00 AM',
    endTime: '12:00 PM',
    location: 'Committee Room 02, Provincial Council Complex',
    mode: 'Physical',
    organizer: 'Administration Division',
    chair: 'Deputy Chief Secretary (Administration)',
    status: 'Completed',
    purpose: 'Evaluate citizen service delivery performance and identify opportunities for coordinated inter-agency improvements.',
    agenda: ['Previous action-item review', 'Service performance dashboard', 'Agency observations', 'Agreed improvement plan'],
    attendees: 15,
    letterRef: 'CSO/LET/2026/0132',
  },
];

export default function ExternalOfficerDashboard() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Upcoming' | 'Completed'>('All');
  const [selected, setSelected] = useState<ExternalMeeting>(MEETINGS[0]);
  const [letterMeeting, setLetterMeeting] = useState<ExternalMeeting | null>(null);

  const visibleMeetings = useMemo(() => {
    const value = query.trim().toLowerCase();
    return MEETINGS.filter((meeting) =>
      (filter === 'All' || meeting.status === filter) &&
      (!value || `${meeting.title} ${meeting.reference} ${meeting.organizer}`.toLowerCase().includes(value)),
    );
  }, [filter, query]);

  return (
    <DashboardLayout pageTitle="External Officer Portal">
      <div className="mx-auto max-w-7xl space-y-7">
        <section className="overflow-hidden rounded-2xl bg-[var(--color-primary)] text-white shadow-sm">
          <div className="relative px-6 py-7 sm:px-8">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/5" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">External Officer Workspace</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Welcome, {user?.full_name ?? 'External Officer'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">View official meeting invitations, schedules and letters issued to you by the Chief Secretary’s Office.</p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Total meetings', value: MEETINGS.length, icon: CalendarDays, color: 'bg-blue-50 text-blue-700' },
            { label: 'Upcoming', value: MEETINGS.filter((m) => m.status === 'Upcoming').length, icon: Clock3, color: 'bg-amber-50 text-amber-700' },
            { label: 'Meeting letters', value: MEETINGS.length, icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`rounded-xl p-3 ${item.color}`}><item.icon className="h-6 w-6" /></div>
              <div><p className="text-2xl font-bold text-slate-900">{item.value}</p><p className="text-sm text-slate-500">{item.label}</p></div>
            </div>
          ))}
        </section>

        <section id="meetings" className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)]">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-slate-900">My meetings</h2>
              <p className="mt-1 text-sm text-slate-500">Meetings to which you have been officially invited.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or reference" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="flex rounded-lg bg-slate-100 p-1">
                  {(['All', 'Upcoming', 'Completed'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{item}</button>)}
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleMeetings.map((meeting) => (
                <button key={meeting.id} onClick={() => setSelected(meeting)} className={`flex w-full gap-4 p-5 text-left transition hover:bg-slate-50 ${selected.id === meeting.id ? 'bg-blue-50/60' : ''}`}>
                  <div className="w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white text-center">
                    <div className="bg-[var(--color-primary)] py-1 text-[10px] font-bold uppercase text-white">{meeting.date.split(' ')[1]}</div>
                    <div className="py-1.5 text-xl font-bold text-slate-800">{meeting.date.split(' ')[0]}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-slate-900">{meeting.title}</h3><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /></div>
                    <p className="mt-1 text-xs font-medium text-blue-700">{meeting.reference}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{meeting.time}</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{meeting.location}</span></div>
                  </div>
                </button>
              ))}
              {visibleMeetings.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No meetings match your search.</div>}
            </div>
          </div>

          <div className="self-start rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Meeting details</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected.status === 'Upcoming' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{selected.status}</span></div>
              <h2 className="mt-3 text-xl font-bold text-slate-900">{selected.title}</h2>
              <p className="mt-1 text-sm font-medium text-blue-700">{selected.reference}</p>
            </div>
            <div className="space-y-6 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: CalendarDays, label: 'Date', value: selected.date },
                  { icon: Clock3, label: 'Time', value: `${selected.time} – ${selected.endTime}` },
                  { icon: selected.mode === 'Online' ? Video : MapPin, label: selected.mode === 'Online' ? 'Meeting link' : 'Venue', value: selected.location },
                  { icon: Users, label: 'Expected attendees', value: `${selected.attendees} participants` },
                  { icon: Building2, label: 'Organised by', value: selected.organizer },
                  { icon: CheckCircle2, label: 'Chaired by', value: selected.chair },
                ].map((detail) => <div key={detail.label} className="flex gap-3 rounded-lg bg-slate-50 p-3"><detail.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" /><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{detail.label}</p><p className="mt-0.5 text-sm font-medium text-slate-700">{detail.value}</p></div></div>)}
              </div>
              <div><h3 className="text-sm font-bold text-slate-900">Purpose</h3><p className="mt-2 text-sm leading-6 text-slate-600">{selected.purpose}</p></div>
              <div><h3 className="text-sm font-bold text-slate-900">Agenda</h3><ol className="mt-2 space-y-2">{selected.agenda.map((item, index) => <li key={item} className="flex gap-3 text-sm text-slate-600"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">{index + 1}</span>{item}</li>)}</ol></div>
              <button id="letters" onClick={() => setLetterMeeting(selected)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"><FileText className="h-4 w-4" />View official meeting letter</button>
            </div>
          </div>
        </section>
      </div>

      {letterMeeting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setLetterMeeting(null)}>
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3"><div><h2 className="font-bold text-slate-900">Meeting letter</h2><p className="text-xs text-slate-500">Reference: {letterMeeting.letterRef}</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Download</button><button onClick={() => setLetterMeeting(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close letter"><X className="h-5 w-5" /></button></div></div>
            <div className="overflow-y-auto p-4 sm:p-8">
              <article className="mx-auto min-h-[720px] max-w-2xl bg-white px-8 py-10 text-slate-800 shadow-sm sm:px-14">
                <div className="border-b-2 border-slate-800 pb-5 text-center"><p className="text-lg font-bold uppercase">Chief Secretary’s Office</p><p className="mt-1 text-sm">Central Provincial Council</p><p className="text-xs text-slate-500">Pallekele, Kundasale</p></div>
                <div className="mt-6 flex justify-between text-sm"><span>My Ref: <strong>{letterMeeting.letterRef}</strong></span><span>{letterMeeting.date}</span></div>
                <p className="mt-8 text-sm">Dear Sir / Madam,</p>
                <h3 className="mt-6 text-center text-sm font-bold uppercase underline underline-offset-4">Invitation to {letterMeeting.title}</h3>
                <p className="mt-7 text-sm leading-7">You are kindly invited to attend the above meeting, convened under the direction of <strong>{letterMeeting.chair}</strong>. The meeting arrangements are as follows:</p>
                <div className="my-6 grid grid-cols-[90px_1fr] gap-x-4 gap-y-2 border-y border-slate-200 py-5 text-sm"><strong>Date</strong><span>{letterMeeting.date}</span><strong>Time</strong><span>{letterMeeting.time} – {letterMeeting.endTime}</span><strong>Venue</strong><span>{letterMeeting.location}</span><strong>Reference</strong><span>{letterMeeting.reference}</span></div>
                <p className="text-sm leading-7">The purpose of this meeting is to {letterMeeting.purpose.charAt(0).toLowerCase() + letterMeeting.purpose.slice(1)} Your participation and contribution are highly appreciated.</p>
                <p className="mt-6 text-sm leading-7">Please make the necessary arrangements to attend on time.</p>
                <div className="mt-12 text-sm"><p>Yours faithfully,</p><div className="mt-10 w-44 border-t border-slate-500 pt-2"><p className="font-bold">Chief Secretary</p><p className="text-xs text-slate-500">Central Province</p></div></div>
              </article>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
