import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { meetingService } from '../services/meetingService';

export interface MeetingFormData {
  title: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
}

type FormErrors = Partial<Record<keyof MeetingFormData, string>>;

const EMPTY_FORM: MeetingFormData = {
  title: '',
  meetingDate: '',
  startTime: '',
  endTime: '',
  location: '',
};

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<MeetingFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof MeetingFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Meeting title is required.';
    if (!form.meetingDate) nextErrors.meetingDate = 'Meeting date is required.';
    if (!form.startTime) nextErrors.startTime = 'Start time is required.';
    if (!form.endTime) nextErrors.endTime = 'End time is required.';
    if (!form.location.trim()) nextErrors.location = 'Location is required.';

    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      nextErrors.endTime = 'End time must be later than the start time.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const meeting = await meetingService.create({
        title: form.title.trim(),
        meeting_date: form.meetingDate,
        start_time: form.startTime,
        end_time: form.endTime,
        location: form.location.trim(),
        location_type: 'physical',
        status: 'draft',
      });

      navigate('/letters/new', {
        state: {
          meeting,
        },
      });
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      };
      const response = apiError.response?.data;
      const validationMessage = response?.errors
        ? Object.values(response.errors).flat()[0]
        : undefined;

      setSubmitError(validationMessage ?? response?.message ?? 'Unable to create the meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = (hasError: boolean) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${
      hasError
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
    }`;

  return (
    <DashboardLayout pageTitle="Create Meeting">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to meetings
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Meetings &nbsp;›&nbsp; Create Meeting &nbsp;›&nbsp; Generate Letter
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Create Meeting</h1>
          <p className="mt-2 text-sm text-slate-500">
            Add the meeting details before preparing its official letter.
          </p>
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-3 font-semibold text-blue-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs text-white">1</span>
            Meeting details
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-slate-400">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs">2</span>
            Generate letter
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-slate-800">Meeting information</h2>
            <p className="mt-1 text-sm text-slate-500">All fields are required.</p>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="meeting-title" className="mb-2 block text-sm font-semibold text-slate-700">
                Meeting title
              </label>
              <input
                id="meeting-title"
                type="text"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Enter the meeting title"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'meeting-title-error' : undefined}
                className={inputClassName(Boolean(errors.title))}
              />
              {errors.title && <p id="meeting-title-error" className="mt-1.5 text-xs text-red-600">{errors.title}</p>}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="meeting-date" className="mb-2 block text-sm font-semibold text-slate-700">
                  Meeting date
                </label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="meeting-date"
                    type="date"
                    value={form.meetingDate}
                    onChange={(event) => updateField('meetingDate', event.target.value)}
                    aria-invalid={Boolean(errors.meetingDate)}
                    aria-describedby={errors.meetingDate ? 'meeting-date-error' : undefined}
                    className={`${inputClassName(Boolean(errors.meetingDate))} pl-10`}
                  />
                </div>
                {errors.meetingDate && <p id="meeting-date-error" className="mt-1.5 text-xs text-red-600">{errors.meetingDate}</p>}
              </div>

              <div>
                <label htmlFor="meeting-location" className="mb-2 block text-sm font-semibold text-slate-700">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="meeting-location"
                    type="text"
                    value={form.location}
                    onChange={(event) => updateField('location', event.target.value)}
                    placeholder="Conference room or online link"
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={errors.location ? 'meeting-location-error' : undefined}
                    className={`${inputClassName(Boolean(errors.location))} pl-10`}
                  />
                </div>
                {errors.location && <p id="meeting-location-error" className="mt-1.5 text-xs text-red-600">{errors.location}</p>}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="meeting-start-time" className="mb-2 block text-sm font-semibold text-slate-700">
                  Start time
                </label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="meeting-start-time"
                    type="time"
                    value={form.startTime}
                    onChange={(event) => updateField('startTime', event.target.value)}
                    aria-invalid={Boolean(errors.startTime)}
                    aria-describedby={errors.startTime ? 'meeting-start-time-error' : undefined}
                    className={`${inputClassName(Boolean(errors.startTime))} pl-10`}
                  />
                </div>
                {errors.startTime && <p id="meeting-start-time-error" className="mt-1.5 text-xs text-red-600">{errors.startTime}</p>}
              </div>

              <div>
                <label htmlFor="meeting-end-time" className="mb-2 block text-sm font-semibold text-slate-700">
                  End time
                </label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="meeting-end-time"
                    type="time"
                    value={form.endTime}
                    onChange={(event) => updateField('endTime', event.target.value)}
                    aria-invalid={Boolean(errors.endTime)}
                    aria-describedby={errors.endTime ? 'meeting-end-time-error' : undefined}
                    className={`${inputClassName(Boolean(errors.endTime))} pl-10`}
                  />
                </div>
                {errors.endTime && <p id="meeting-end-time-error" className="mt-1.5 text-xs text-red-600">{errors.endTime}</p>}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            {submitError && (
              <p role="alert" className="self-center text-sm text-red-600 sm:mr-auto">
                {submitError}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate('/meetings')}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating meeting…' : 'Create and continue'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
