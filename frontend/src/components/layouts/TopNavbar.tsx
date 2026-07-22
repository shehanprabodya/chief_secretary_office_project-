import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Globe, ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import type { AppNotification } from '../../types/notification';
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadNotifications = async () => {
      try {
        const result = await notificationService.list();
        if (active) {
          setNotifications(result.notifications);
          setUnreadCount(result.unreadCount);
        }
      } catch {
        // Notifications should never interrupt the main dashboard experience.
      }
    };

    void loadNotifications();
    const timer = window.setInterval(loadNotifications, 30_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user]);

  const openNotifications = async () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);
    setShowUserMenu(false);

    if (nextOpen) {
      try {
        const result = await notificationService.list();
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch {
        // Keep the last successfully loaded list.
      }
    }
  };

  const openNotification = async (notification: AppNotification) => {
    if (!notification.read_at) {
      await notificationService.markRead(notification.notification_id);
      setNotifications((items) => items.map((item) =>
        item.notification_id === notification.notification_id
          ? { ...item, read_at: new Date().toISOString() }
          : item
      ));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setShowNotifications(false);
    if (notification.action_url) navigate(notification.action_url);
  };

  const markAllNotificationsRead = async () => {
    await notificationService.markAllRead();
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    navigate('/', { replace: true });
  };

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
          <div className="relative" ref={notificationRef}>
            <button
              onClick={openNotifications}
              className="relative rounded-lg p-2 transition hover:bg-white/10"
              aria-label={`${unreadCount} unread notifications`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[var(--color-secondary)] px-1 text-[10px] font-bold leading-5 text-[var(--color-primary)] shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                  <div>
                    <h2 className="text-sm font-bold">Notifications</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} unread</p>
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllNotificationsRead} className="text-xs font-semibold text-[var(--color-primary)] hover:underline dark:text-blue-300">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No notifications yet.</p>
                  ) : notifications.map((notification) => (
                    <button
                      key={notification.notification_id}
                      onClick={() => openNotification(notification)}
                      className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${notification.read_at ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/70 dark:bg-blue-950/40'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? 'bg-slate-200 dark:bg-slate-600' : notification.priority === 'urgent' ? 'bg-red-500' : 'bg-[var(--color-primary)] dark:bg-blue-400'}`} />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-600 dark:text-slate-300">{notification.message}</span>
                          <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">{new Date(notification.created_at).toLocaleString()}</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-white/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
                <UserRound className="h-5 w-5" aria-hidden="true" />
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
