import { useState } from 'react';
import { Menu, Bell, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopNavbarProps {
  onMenuClick: () => void;
}

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between px-6 py-4 lg:px-8">
        {/* Left - Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu className="h-6 w-6 text-slate-900 dark:text-white" />
        </button>

        {/* Center - Title */}
        <h1 className="hidden lg:block text-xl font-semibold text-slate-900 dark:text-white">
          Development Division
        </h1>

        {/* Right - Actions */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Language Selector */}
          <button className="flex items-center gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <Globe className="h-5 w-5" />
            <span className="text-sm hidden sm:inline">English</span>
          </button>

          {/* Notifications */}
          <button className="relative p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}