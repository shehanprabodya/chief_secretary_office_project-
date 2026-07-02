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
      href: "/dashboard/chief",
    },
    {
      icon: CheckCircle,
      label: "Approvals",
      href: "/chief/approvals",
    },
  ],

  deputy: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/deputy",
    },
  ],

  dept_head: [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard/head",
    },
  ],
};