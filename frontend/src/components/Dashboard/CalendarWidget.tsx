import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import Card from '../shared/Card';
import { meetingService } from '../../services/meetingService';
import type { Meeting } from '../../types/meeting';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatTime(value: string | null) {
  if (!value) return 'Time not set';

  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes));
}

export default function CalendarWidget() {
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today));
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlankDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    let ignore = false;

    async function loadMeetings() {
      setIsLoading(true);
      setError('');

      try {
        const firstDate = new Date(year, month, 1);
        const lastDate = new Date(year, month + 1, 0);
        const response = await meetingService.list({
          start_date: dateKey(firstDate),
          end_date: dateKey(lastDate),
          per_page: 100,
        });

        if (!ignore) setMeetings(response.data);
      } catch {
        if (!ignore) {
          setMeetings([]);
          setError('Could not load meetings.');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadMeetings();
    return () => {
      ignore = true;
    };
  }, [month, year]);

  const meetingCounts = useMemo(() => {
    return meetings.reduce<Record<string, number>>((counts, meeting) => {
      const key = meeting.meeting_date.slice(0, 10);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }, [meetings]);

  const selectedMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.meeting_date.slice(0, 10) === selectedDate),
    [meetings, selectedDate],
  );

  const changeMonth = (offset: number) => {
    const nextMonth = new Date(year, month + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(dateKey(nextMonth));
  };

  const goToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  };

  const selectedDateLabel = dateFromKey(selectedDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToToday}
            className="mr-1 rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={monthLabel}>
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            role="columnheader"
            className="flex h-8 items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-400"
          >
            {day}
          </div>
        ))}

        {Array.from({ length: leadingBlankDays }, (_, index) => (
          <div key={`blank-${index}`} className="h-9" aria-hidden="true" />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dayDate = new Date(year, month, day);
          const key = dateKey(dayDate);
          const isToday = key === dateKey(today);
          const isSelected = key === selectedDate;
          const count = meetingCounts[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              onClick={() => setSelectedDate(key)}
              aria-label={`${dayDate.toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}${count ? `, ${count} meeting${count === 1 ? '' : 's'}` : ''}`}
              aria-selected={isSelected}
              className={`relative flex h-9 items-center justify-center rounded-md text-sm transition-colors ${
                isSelected
                  ? 'bg-blue-600 font-semibold text-white'
                  : isToday
                    ? 'bg-blue-50 font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-slate-700 dark:text-blue-300'
                    : 'text-slate-800 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-700'
              }`}
            >
              {day}
              {count > 0 && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
            {selectedDateLabel}
          </h4>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading meetings…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : selectedMeetings.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No meetings scheduled.</p>
        ) : (
          <div className="space-y-3">
            {selectedMeetings.map((meeting) => (
              <div key={meeting.meeting_id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/60">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{meeting.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {formatTime(meeting.start_time)}
                  </span>
                  {meeting.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {meeting.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
