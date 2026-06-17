import { Mail } from 'lucide-react';
import Card from '../shared/Card';
import Badge from '../shared/Badge';

const draftLetters = [
  {
    id: 1,
    title: 'Request for Fund Allocation - Q4',
    recipient: 'To: Chief Secretary',
    status: 'Draft',
  },
  {
    id: 2,
    title: 'Inquiry Response: Project X-44',
    recipient: 'To: Director General',
    status: 'Draft',
  },
];

export default function DraftLettersCard() {
  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Draft Letters
          </h2>
          <Badge label="5" variant="blue" />
        </div>
      </div>

      <div className="space-y-3">
        {draftLetters.map((letter) => (
          <div
            key={letter.id}
            className="rounded-lg border border-slate-200 p-4 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <h3 className="font-medium text-slate-900 dark:text-white">
              {letter.title}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {letter.recipient}
            </p>
            <a
              href="#"
              className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Continue →
            </a>
          </div>
        ))}
      </div>
    </Card>
  );
}
