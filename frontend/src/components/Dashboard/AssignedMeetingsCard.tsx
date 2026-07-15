import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../shared/Card';
import MeetingItem from './MeetingItem';
import { meetingService } from '../../services/meetingService';
import type { Meeting } from '../../types/meeting';

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(value: string | null) {
  if (!value) return 'Time not set';

  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes));
}

export default function AssignedMeetingsCard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadMeetings() {
      try {
        const result = await meetingService.getCreatedUpcoming();
        if (!ignore) setMeetings(result);
      } catch {
        if (!ignore) setError('Could not load your meetings.');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadMeetings();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            My Meetings
          </h2>
          <Link
            to="/meetings"
            className="mt-1 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            View All
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading meetings...</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : meetings.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You have no upcoming meetings.
        </p>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
              <MeetingItem
                key={meeting.meeting_id}
                meeting={{
                  id: meeting.meeting_id,
                  title: meeting.title,
                  date: formatDate(meeting.meeting_date),
                  time: `${formatTime(meeting.start_time)} - ${formatTime(meeting.end_time)}`,
                  location: meeting.location ?? 'Location not assigned',
                }}
              />
          ))}
        </div>
      )}
    </Card>
  );
}
