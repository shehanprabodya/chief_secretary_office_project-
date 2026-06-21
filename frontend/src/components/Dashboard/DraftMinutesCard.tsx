import { FileText } from 'lucide-react';
import Card from '../shared/Card';
import Badge from '../shared/Badge';

const draftMinutes = [
  {
    id: 1,
    title: 'Meeting #442 - Agricultural Subsidy',
    lastEdited: 'Last edited: 2h ago',
    status: 'Pending',
  },
  {
    id: 2,
    title: 'Rural Connectivity Project B-1',
    lastEdited: 'Last edited: Yesterday',
    status: 'Pending',
  },
];

export default function DraftMinutesCard() {
  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Draft Minutes
          </h2>
          <Badge label="3" variant="orange" />
        </div>
      </div>

      <div className="space-y-3">
        {draftMinutes.map((minute) => (
          <div
            key={minute.id}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <h3 className="font-medium text-slate-900 dark:text-white">
              {minute.title}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {minute.lastEdited}
            </p>
            <a
              href="#"
              className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Resume →
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
}