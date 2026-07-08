import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
     <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Top Navbar */}
      <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

      {/* Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
