import Card from '../shared/Card';

const timelineItems = [
  { time: '10:00 AM', title: 'Budget Review', type: 'meeting' },
  { time: '1:30 PM', title: 'Dept. Sync', type: 'meeting' },
];

export default function TimelineWidget() {
  return (
    <Card>
      <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
        Today's Timeline
      </h3>
      <div className="space-y-4">
        {timelineItems.map((item, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              {idx < timelineItems.length - 1 && (
                <div className="h-8 w-0.5 bg-slate-200 dark:bg-slate-700" />
              )}
            </div>
            <div className="pb-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {item.time}
              </p>
              <p className="text-sm text-slate-900 dark:text-white">
                {item.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}