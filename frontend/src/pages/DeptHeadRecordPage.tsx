import type { LucideIcon } from 'lucide-react';
import { FileText, Files, Users } from 'lucide-react';
import DashboardLayout from '../components/layouts/DashboardLayout';

type RecordPageKind = 'letters' | 'attendance' | 'minutes';

interface RecordPageConfig {
  title: string;
  description: string;
  icon: LucideIcon;
}

const PAGE_CONFIG: Record<RecordPageKind, RecordPageConfig> = {
  letters: {
    title: 'Meeting Letters',
    description: 'View meeting letters submitted by officers across all departments.',
    icon: Files,
  },
  attendance: {
    title: 'Attendance',
    description: 'View attendance records submitted by officers for their meetings.',
    icon: Users,
  },
  minutes: {
    title: 'Meeting Minutes',
    description: 'View meeting minutes, decisions, and action items recorded by officers.',
    icon: FileText,
  },
};

interface DeptHeadRecordPageProps {
  kind: RecordPageKind;
}

export default function DeptHeadRecordPage({ kind }: DeptHeadRecordPageProps) {
  const page = PAGE_CONFIG[kind];
  const Icon = page.icon;

  return (
    <DashboardLayout pageTitle={page.title}>
      <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{page.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{page.description}</p>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
