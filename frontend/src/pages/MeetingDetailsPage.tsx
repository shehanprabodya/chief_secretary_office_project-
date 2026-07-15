import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, FileText, MapPin, Pencil, Save, X } from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/layouts/DashboardLayout';
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
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate('/meetings')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Back to meetings</button>
          {canEdit && !isEditing && <button type="button" onClick={startEditing} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Pencil className="h-4 w-4" /> Edit meeting</button>}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Meeting details</p>
          {isEditing && form ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 text-sm font-medium text-slate-700">Title<input value={form.title} onChange={(event) => updateField('title', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none" /></label>
              <label className="text-sm font-medium text-slate-700">Date<input type="date" value={form.meeting_date} onChange={(event) => updateField('meeting_date', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none" /></label>
              <label className="text-sm font-medium text-slate-700">Location<input value={form.location} onChange={(event) => updateField('location', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none" /></label>
              <label className="text-sm font-medium text-slate-700">Start time<input type="time" value={form.start_time} onChange={(event) => updateField('start_time', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none" /></label>
              <label className="text-sm font-medium text-slate-700">End time<input type="time" value={form.end_time} onChange={(event) => updateField('end_time', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none" /></label>
              <label className="sm:col-span-2 text-sm font-medium text-slate-700">Description<textarea rows={4} value={form.description} onChange={(event) => updateField('description', event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none" /></label>
              {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsEditing(false); setForm(null); setError(''); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"><X className="h-4 w-4" /> Cancel</button>
                <button type="button" onClick={saveMeeting} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <h1 className="text-2xl font-bold text-slate-900">{meeting.title}</h1>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 text-slate-700"><CalendarDays className="h-5 w-5 text-blue-600" /><span>{new Date(`${meeting.meeting_date.slice(0, 10)}T00:00:00`).toLocaleDateString()}</span></div>
                <div className="flex items-center gap-3 text-slate-700"><Clock className="h-5 w-5 text-blue-600" /><span>{meeting.start_time?.slice(0, 5) || 'Not assigned'}{meeting.end_time ? ` – ${meeting.end_time.slice(0, 5)}` : ''}</span></div>
                <div className="flex items-center gap-3 text-slate-700"><MapPin className="h-5 w-5 text-blue-600" /><span>{meeting.location || 'Not assigned'}</span></div>
                <div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium capitalize text-slate-700">{meeting.status}</span></div>
              </div>
              {meeting.description && <p className="mt-5 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">{meeting.description}</p>}
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </section>

        {letter && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meeting letter</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3"><FileText className="h-5 w-5 shrink-0 text-blue-600" /><p className="truncate font-semibold text-slate-900">{new DOMParser().parseFromString(letter.title || 'Meeting letter', 'text/html').body.textContent || 'Meeting letter'}</p></div>
              <button type="button" onClick={() => navigate(`/letters/${letter.letter_id}`)} className="shrink-0 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Open letter</button>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
