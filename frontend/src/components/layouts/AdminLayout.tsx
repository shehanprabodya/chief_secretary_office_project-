import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut,  Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';


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
      

      {/* Nav */}
        <nav className='mt-12'>
          {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-3  px-4 py-3  transition-all duration-200  ${
                      isActive
                        ? 'border-r-4 border-slate-600 bg-slate-200 text-black font-bold'
                        : 'border-r-4 border-transparent text-slate-100 font-medium hover:bg-slate-100'
                    }`
                  }
                >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
        </nav>
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
        

        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>

        
      </div>
    </div>
  );
}