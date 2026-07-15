import { Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MeetingItemProps {
  meeting: {
    id: number;
    title: string;
    date: string;
    time: string;
    location: string;
  };
}

export default function MeetingItem({ meeting }: MeetingItemProps) {
  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="block rounded-lg border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-700 dark:hover:bg-slate-700/50"
      aria-label={`View details for ${meeting.title}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {meeting.title}
          </h3>
          <div className="mt-2 flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-medium">{meeting.date}</span>
              <Clock className="h-4 w-4" />
              <span>{meeting.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{meeting.location}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
