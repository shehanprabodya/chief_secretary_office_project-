import {
  LayoutDashboard,
  Calendar,
  CheckCircle,
  FileText,
  History,
  Users,
  Files,
  BookOpen,
  ImageUp,
  HardDriveDownload,
} from "lucide-react";

export const navigation = {
  admin: [
    {
      icon: LayoutDashboard,
      labelKey: 'nav.dashboard',
      href: "/dashboard/admin",
    },
    {
      icon: Users,
      labelKey: 'nav.users',
      href: "/admin/users",
    },
    {
      icon: BookOpen,
      labelKey: 'nav.subjects',
      href: "/admin/subjects",
    },
    {
      icon: ImageUp,
      labelKey: 'nav.signatureUpload',
      href: "/admin/signatures",
    },
    {
      icon: HardDriveDownload,
      labelKey: 'nav.backups',
      href: "/admin/backups",
    },
  ],

  officer: [
    {
      icon: LayoutDashboard,
      labelKey: 'nav.dashboard',
      href: "/dashboard/officer",
    },
    {
      icon: Calendar,
      labelKey: 'nav.meetings',
      href: "/meetings",
    },
    {
      icon: CheckCircle,
      labelKey: 'nav.approvals',
      href: "/approvals",
    },
    {
      icon: History,
      labelKey: 'nav.activityLog',
      href: '/activity-log',
    },
    {
      icon: FileText,
      labelKey: 'nav.minutes',
      href: "/minutes",
    },
    {
      icon: Users,
      labelKey: 'nav.attendance',
      href: "/attendance",
    },
    
  ],

  chief_secretary: [
    {
      icon: LayoutDashboard,
      labelKey: 'nav.dashboard',
      href: "/dashboard/chief-secretary",
    },
    {
      icon: CheckCircle,
      labelKey: 'nav.approvals',
      href: "/approvals",
    },
    {
      icon: History,
      labelKey: 'nav.activityLog',
      href: '/activity-log',
    },
  ],

  deputy: [
    {
      icon: LayoutDashboard,
      labelKey: 'nav.dashboard',
      href: "/dashboard/deputy",
    },
    {
      icon: CheckCircle,
      labelKey: 'nav.approvals',
      href: "/approvals",
    },
    {
      icon: History,
      labelKey: 'nav.activityLog',
      href: '/activity-log',
    },
    {
      icon: Files,
      labelKey: 'nav.meetingLetters',
      href: "/dept-head/letters",
    },
    {
      icon: Users,
      labelKey: 'nav.attendance',
      href: "/dept-head/attendance",
    },
    {
      icon: FileText,
      labelKey: 'nav.minutes',
      href: "/dept-head/minutes",
    },
  ],

  dept_head: [
    {
      icon: LayoutDashboard,
      labelKey: 'nav.dashboard',
      href: "/dashboard/dept-head",
    },
    {
      icon: CheckCircle,
      labelKey: 'nav.approvals',
      href: "/approvals",
    },
    {
      icon: History,
      labelKey: 'nav.activityLog',
      href: '/activity-log',
    },
    {
      icon: Files,
      labelKey: 'nav.meetingLetters',
      href: "/dept-head/letters",
    },
    {
      icon: Users,
      labelKey: 'nav.attendance',
      href: "/dept-head/attendance",
    },
    {
      icon: FileText,
      labelKey: 'nav.minutes',
      href: "/dept-head/minutes",
    },
  ],

  external_officer: [
    {
      icon: LayoutDashboard,
      labelKey: 'nav.dashboard',
      href: "/dashboard/external-officer",
    },
    {
      icon: Calendar,
      labelKey: 'nav.myMeetings',
      href: "/dashboard/external-officer#meetings",
    },
    {
      icon: FileText,
      labelKey: 'nav.minutes',
      href: "/dashboard/external-officer#minutes",
    },
    
  ],
};
