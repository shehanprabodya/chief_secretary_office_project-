import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { meetingService } from '../../services/meetingService';

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function WelcomeSection() {
  const { user } = useAuth();
  const [meetingCount, setMeetingCount] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadMeetingCount() {
      try {
        const meetings = await meetingService.getByDate(dateKey(new Date()));
        const scheduledMeetings = meetings.filter(
          (meeting) => meeting.status !== 'cancelled',
        );

        if (!ignore) setMeetingCount(scheduledMeetings.length);
      } catch {
        if (!ignore) setHasError(true);
      }
    }

    void loadMeetingCount();
    return () => {
      ignore = true;
    };
  }, []);

  let scheduleMessage = "Loading today's schedule...";

  if (hasError) {
    scheduleMessage = "Today's meeting schedule is unavailable.";
  } else if (meetingCount === 0) {
    scheduleMessage = 'You have no meetings scheduled for today.';
  } else if (meetingCount === 1) {
    scheduleMessage = 'You have 1 meeting scheduled for today.';
  } else if (meetingCount !== null) {
    scheduleMessage = `You have ${meetingCount} meetings scheduled for today.`;
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40">
      <h1 className="text-2xl font-bold text-blue-950 dark:text-blue-100">
        Welcome back, {user?.full_name}
      </h1>
      
      
      <p className="mt-1 text-blue-700 dark:text-blue-300">
        {scheduleMessage}
      </p>
    </div>
  );
}
