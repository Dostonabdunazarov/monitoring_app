import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, LogOut, User } from 'lucide-react';
import Sidebar from '../Sidebar/Sidebar';
import { useAuthStore } from '../../store/authStore';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top navbar */}
        <header className="flex items-center justify-between px-6 h-14 bg-gray-900 border-b border-gray-800 shrink-0">
          <h1 className="text-sm font-medium text-gray-300">IoT Monitoring</h1>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
              <Bell size={18} />
            </button>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User size={16} />
              <span className="hidden sm:block">{user?.name ?? user?.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
