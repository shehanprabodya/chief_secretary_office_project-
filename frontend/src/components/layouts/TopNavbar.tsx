import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Globe, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.svg';

interface TopNavbarProps {
  onMenuClick: () => void;
  pageTitle?: string;
  showMenuButton?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  officer: 'Development Officer',
  dept_head: 'Department Head',
  deputy: 'Deputy Secretary',
  chief_secretary: 'Chief Secretary',
  external_officer: 'External Officer',
};

export default function TopNavbar({ onMenuClick, pageTitle = 'Development Division', showMenuButton = true }: TopNavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'si' | 'en'>('en');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    navigate('/', { replace: true });
  };

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-white/10 bg-[var(--color-primary)]">
      <div className="flex h-full items-center justify-between px-4 lg:px-8">
        {/* Left - Menu Button (mobile) + Page Title */}
        <div className="flex items-center gap-3">
          {showMenuButton && <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-white transition hover:bg-white/10 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-6 w-6" />
          </button>}
          <img
            src={logo}
            alt="Sri Lanka Emblem"
            className="h-10 w-10 object-contain"
          />
          <h1 className="hidden text-lg font-semibold text-white lg:block">
            {pageTitle}
          </h1>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2 text-white">
          {/* Language Switcher */}
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <Globe size={16} />
            <button
              onClick={() => setLanguage('si')}
              className={`text-sm transition ${
                language === 'si' ? 'font-semibold text-white' : 'text-white/60'
              }`}
            >
              සිංහල
            </button>
            <span className="text-white/40">|</span>
            <button
              onClick={() => setLanguage('en')}
              className={`text-sm transition ${
                language === 'en' ? 'font-semibold text-white' : 'text-white/60'
              }`}
            >
              English
            </button>
          </div>

          {/* Notifications */}
          <button
            className="relative rounded-lg p-2 transition hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                {initials}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-white/70 transition-transform ${
                  showUserMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {user?.full_name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{user?.email}</p>
                  {user?.role && (
                    <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
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
