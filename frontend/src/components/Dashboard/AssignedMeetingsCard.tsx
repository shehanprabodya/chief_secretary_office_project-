import Card from '../shared/Card';
import MeetingItem from './MeetingItem';

const meetings: {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  status: string;
  statusColor: 'blue' | 'gray' | 'green' | 'orange' | 'red';
}[] = [
  {
    id: 1,
    title: 'Infrastructure Budget Review 2024',
    date: 'Oct 24',
    time: '10:00 AM - 11:30',
    location: 'Conference Room A',
    status: 'Assigned',
    statusColor: 'blue',
  },
  {
    id: 2,
    title: 'Inter-District Development Committee',
    date: 'Oct 25',
    time: '02:00 PM - 04:00 PM',
    location: 'Online (MS Teams)',
    status: 'Observer',
    statusColor: 'gray',
  },
];

export default function AssignedMeetingsCard() {
  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            My Assigned Meetings
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            View All
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {meetings.map((meeting) => (
          <MeetingItem key={meeting.id} meeting={meeting} />
        ))}
      </div>
    </Card>
  );
}
