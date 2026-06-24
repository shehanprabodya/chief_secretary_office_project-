import {LayoutDashboard,Calendar,CheckCircle,FileText,Users,Files,BarChart3,LogOut,X,} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/Srilankaemblem.png';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/officer' },
  { icon: Calendar, label: 'Meetings', href: '/meetings' },
  { icon: CheckCircle, label: 'Approvals', href: '/approvals' },
  { icon: FileText, label: 'Minutes', href: '/minutes' },
  { icon: Users, label: 'Attendance', href: '/attendance' },
  { icon: Files, label: 'Documents', href: '/documents' },
  { icon: BarChart3, label: 'Reports', href: '/reports' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-slate-900 text-white transition-transform duration-300 lg:relative lg:translate-x-0 z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-8 w-8" />
            <span className="font-semibold">MMCS</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-slate-800 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        {navigationItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
          <item.icon className="h-5 w-5" />
          <span className="font-medium">{item.label}</span>
        </NavLink>
      ))}

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}