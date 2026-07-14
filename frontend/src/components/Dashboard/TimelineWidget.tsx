import { useEffect, useState } from 'react';
import Card from '../shared/Card';
import { meetingService } from '../../services/meetingService';
import type { Meeting } from '../../types/meeting';

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: string | null) {
  if (!value) return 'Time not set';

  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes));
}

export default function TimelineWidget() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadTimeline() {
      setIsLoading(true);
      setError('');

      try {
        const result = await meetingService.getByDate(dateKey(new Date()));
        if (!ignore) setMeetings(result);
      } catch {
        if (!ignore) {
          setMeetings([]);
          setError("Could not load today's timeline.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadTimeline();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Card>
      <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
        Today's Timeline
      </h3>
      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading timeline...</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : meetings.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No meetings scheduled for today.
        </p>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting, idx) => (
            <div key={meeting.meeting_id} className="flex gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                {idx < meetings.length - 1 && (
                  <div className="h-8 w-0.5 bg-slate-200 dark:bg-slate-700" />
                )}
              </div>
              <div className="pb-4">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {formatTime(meeting.start_time)}
                </p>
                <p className="text-sm text-slate-900 dark:text-white">
                  {meeting.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
