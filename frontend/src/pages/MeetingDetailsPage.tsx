import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, FileText, MapPin, Pencil, Save, X } from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/layouts/DashboardLayout';
import ActionMessage from '../components/shared/ActionMessage';
import { useAuth } from '../context/AuthContext';
import { letterService } from '../services/letterService';
import { meetingService } from '../services/meetingService';
import type { Letter } from '../types/letter';
import type { Meeting } from '../types/meeting';

type EditForm = {
  title: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
};

const toForm = (meeting: Meeting): EditForm => ({
  title: meeting.title,
  meeting_date: meeting.meeting_date.slice(0, 10),
  start_time: meeting.start_time?.slice(0, 5) ?? '',
  end_time: meeting.end_time?.slice(0, 5) ?? '',
  location: meeting.location ?? '',
  description: meeting.description ?? '',
});

export default function MeetingDetailsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meetingId = Number(id);
  const letterId = Number(searchParams.get('letter_id')) || null;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(meetingId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(meetingId ? '' : 'Invalid meeting.');

  useEffect(() => {
    if (!meetingId) return;

    Promise.all([
      meetingService.getById(meetingId),
      letterId ? letterService.getById(letterId) : Promise.resolve(null),
    ]).then(([meetingResult, letterResult]) => {
      setMeeting(meetingResult);
      setLetter(letterResult);
    }).catch(() => setError('Unable to load the meeting details.'))
      .finally(() => setIsLoading(false));
  }, [meetingId, letterId]);

  const canEdit = Boolean(meeting && user && (
    letter
      ? Number(user.id) === letter.created_by
      : Number(user.id) === meeting.creator?.user_id
  ));

  const startEditing = () => {
    if (!meeting || !canEdit) return;
    setForm(toForm(meeting));
    setError('');
    setIsEditing(true);
  };

  const updateField = (field: keyof EditForm, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
  };

  const saveMeeting = async () => {
    if (!meeting || !form || !canEdit) return;
    if (!form.title.trim() || !form.meeting_date) {
      setError('Meeting title and date are required.');
      return;
    }
    if (Boolean(form.start_time) !== Boolean(form.end_time)) {
      setError('Enter both start and end times, or leave both empty.');
      return;
    }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      setError('End time must be after the start time.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const updated = await meetingService.update(meeting.meeting_id, {
        title: form.title.trim(),
        meeting_date: form.meeting_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        letter_id: letter?.letter_id,
      });
      setMeeting({ ...updated, creator: meeting.creator });
      setIsEditing(false);
      setForm(null);
    } catch (requestError) {
      const message = axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data?.message
        : null;
      setError(message ?? 'Unable to update the meeting.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <DashboardLayout pageTitle="Meeting Details"><p className="p-6 text-sm text-slate-500">Loading meeting details…</p></DashboardLayout>;
  }

  if (!meeting) {
    return <DashboardLayout pageTitle="Meeting Details"><div className="p-6"><p className="text-red-600">{error}</p><button onClick={() => navigate('/meetings')} className="mt-4 text-sm font-semibold text-blue-700">Back to meetings</button></div></DashboardLayout>;
  }

  return (
    <DashboardLayout pageTitle="Meeting Details">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button type="button" onClick={() => navigate('/meetings')} className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700"><ArrowLeft className="h-4 w-4" /> Back to meetings</button>
            <h1 className="text-2xl font-bold text-slate-900">Meeting Details</h1>
          </div>
          {canEdit && !isEditing && <button type="button" onClick={startEditing} className="inline-flex items-center justify-center gap-2 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-600"><Pencil className="h-4 w-4" /> Edit Meeting</button>}
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-100 px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meeting Information</p>
          </div>
          {isEditing && form ? (
            <div
              className="grid p-6 sm:grid-cols-2"
              style={{ columnGap: '2rem', rowGap: '2.5rem' }}
            >
              <label className="flex flex-col gap-3 text-xs font-medium text-slate-600 sm:col-span-2">Meeting Title<input value={form.title} onChange={(event) => updateField('title', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label className="flex flex-col gap-3 text-xs font-medium text-slate-600">Meeting Date<input type="date" value={form.meeting_date} onChange={(event) => updateField('meeting_date', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label className="flex flex-col gap-3 text-xs font-medium text-slate-600">Location<input value={form.location} onChange={(event) => updateField('location', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label className="flex flex-col gap-3 text-xs font-medium text-slate-600">Start Time<input type="time" value={form.start_time} onChange={(event) => updateField('start_time', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label className="flex flex-col gap-3 text-xs font-medium text-slate-600">End Time<input type="time" value={form.end_time} onChange={(event) => updateField('end_time', event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              <label className="flex flex-col gap-3 text-xs font-medium text-slate-600 sm:col-span-2">Description<textarea rows={4} value={form.description} onChange={(event) => updateField('description', event.target.value)} className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></label>
              {error && <ActionMessage type="error" message={error} onDismiss={() => setError('')} className="sm:col-span-2" />}
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsEditing(false); setForm(null); setError(''); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" /> Cancel</button>
                <button type="button" onClick={saveMeeting} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"><Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="pb-10">
                <h2 className="text-xl font-bold text-slate-900">{meeting.title}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4"><CalendarDays className="h-5 w-5 text-blue-600" /><p className="mt-3 text-xs font-medium uppercase tracking-wide text-blue-500">Meeting Date</p><p className="mt-1 text-sm font-semibold text-blue-950">{new Date(`${meeting.meeting_date.slice(0, 10)}T00:00:00`).toLocaleDateString()}</p></div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><Clock className="h-5 w-5 text-amber-600" /><p className="mt-3 text-xs font-medium uppercase tracking-wide text-amber-600">Meeting Time</p><p className="mt-1 text-sm font-semibold text-amber-950">{meeting.start_time?.slice(0, 5) || 'Not assigned'}{meeting.end_time ? ` – ${meeting.end_time.slice(0, 5)}` : ''}</p></div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><MapPin className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-xs font-medium uppercase tracking-wide text-emerald-600">Location</p><p className="mt-1 text-sm font-semibold text-emerald-950">{meeting.location || 'Not assigned'}</p></div>
              </div>
              {meeting.description && <p className="mt-5 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">{meeting.description}</p>}
              {error && <ActionMessage type="error" message={error} onDismiss={() => setError('')} className="mt-4" />}
            </div>
          )}
        </section>

        {letter && (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-100 px-6 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meeting Letter</p></div>
            <div className="flex items-center justify-between gap-4 p-6">
              <div className="flex min-w-0 items-center gap-3"><FileText className="h-5 w-5 shrink-0 text-blue-600" /><p className="truncate font-semibold text-slate-900">{new DOMParser().parseFromString(letter.title || 'Meeting letter', 'text/html').body.textContent || 'Meeting letter'}</p></div>
              <button type="button" onClick={() => navigate(`/letters/${letter.letter_id}`)} className="shrink-0 bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600">Open Letter</button>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
