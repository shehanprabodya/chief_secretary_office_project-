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
        const meetings = await meetingService.getCreatedByDate(dateKey(new Date()));
        if (!ignore) setMeetingCount(meetings.length);
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
  } 
   else if (meetingCount !== null) {
    scheduleMessage = `You have ${meetingCount} meetings scheduled for today.`;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--color-primary)] px-6 py-7 text-white shadow-sm sm:px-8">
      <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/5" />
      <h1 className="relative text-2xl font-bold sm:text-3xl">
        Welcome back, {user?.full_name}
      </h1>

      <p className="relative mt-2 max-w-2xl text-sm text-blue-100">
        {scheduleMessage}
      </p>
    </div>
  );
}
