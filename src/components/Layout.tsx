import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B1121]">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-12 bg-[#0F1420] border-b border-white/5 flex items-center px-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="ml-3 text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
          统计精练
        </h1>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="ml-0 lg:ml-60 min-h-screen pt-14 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 py-5 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
