import {
  LayoutDashboard,
  Calendar,
  CheckCircle,
  FileText,
  Users,
  Files,
  BarChart3,
} from "lucide-react";

export const navigation = {
  admin: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/admin",
    },
    {
      icon: Users,
      label: "Users",
      href: "/admin/users",
    },
  ],

  officer: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/officer",
    },
    {
      icon: Calendar,
      label: "Meetings",
      href: "/meetings",
    },
    {
      icon: CheckCircle,
      label: "Approvals",
      href: "/approvals",
    },
    {
      icon: FileText,
      label: "Minutes",
      href: "/minutes",
    },
    {
      icon: Users,
      label: "Attendance",
      href: "/attendance",
    },
    {
      icon: Files,
      label: "Documents",
      href: "/documents",
    },
    {
      icon: BarChart3,
      label: "Reports",
      href: "/reports",
    },
  ],

  chief_secretary: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/chief-secretary",
    },
    {
      icon: CheckCircle,
      label: "Approvals",
      href: "/approvals",
    },
  ],

  deputy: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/deputy",
    },
    {
      icon: CheckCircle,
      label: "Approvals",
      href: "/approvals",
    },
  ],

  dept_head: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/dept-head",
    },
    {
      icon: CheckCircle,
      label: "Approvals",
      href: "/approvals",
    },
  ],

  external_officer: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/external-officer",
    },
    {
      icon: Calendar,
      label: "My Meetings",
      href: "/dashboard/external-officer#meetings",
    },
    {
      icon: FileText,
      label: "Meeting Letters",
      href: "/dashboard/external-officer#letters",
    },
  ],
};
