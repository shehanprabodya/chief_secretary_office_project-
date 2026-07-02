import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut,  Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/Srilankaemblem.png';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
];

export default function AdminLayout({ children, pageTitle }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const Sidebar = (
    <div className="flex h-full w-56 flex-col bg-[var(--color-primary)] text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 p-5">
        <img src={logo} alt="Logo" className="h-8 w-8" />
        <div>
          <p className="text-sm font-bold">MMCS</p>
          <p className="text-[10px] text-white/50">v2.4.1</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-white text-[var(--color-primary)]' : 'text-white/80 hover:bg-white/10'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <p className="px-4 text-xs text-white/40">Office of the Chief Secretary</p>
        <p className="px-4 text-[10px] text-white/30">© 2024 Southern Provincial Council</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">{Sidebar}</div>

      {/* Sidebar - mobile */}
      <div
        className={`fixed left-0 top-0 z-50 h-full transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {Sidebar}
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-[var(--color-primary)] px-6">
          <button onClick={() => setSidebarOpen(true)} className="text-white lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden text-sm font-medium text-white lg:block">{pageTitle}</span>
          <div className="ml-auto flex items-center gap-4 text-white">
            <button className="text-sm font-medium">English</button>
            <button>🔔</button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user?.full_name ?? 'Admin'}</span>
              <button onClick={handleLogout} title="Logout">
                <LogOut className="h-4 w-4 text-white/70 hover:text-white" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>

        <footer className="border-t border-slate-200 bg-white px-8 py-3 text-xs text-slate-400 flex justify-between">
          <span>MMCS v2.4.1 © 2024 Office of the Chief Secretary - Southern Provincial Council. All Rights Reserved.</span>
          <div className="flex gap-4">
            <button className="hover:underline">Accessibility</button>
            <button className="hover:underline">Privacy Policy</button>
            <button className="hover:underline">Technical Support</button>
          </div>
        </footer>
      </div>
    </div>
  );
}