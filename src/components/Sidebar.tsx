import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  FileText,
  Library,
  X,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import { useExamStore } from '../stores/examStore';
import { getCurrentUser, logout } from '../utils/auth';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '知识看板' },
  { path: '/practice', icon: BookOpen, label: '练习中心' },
  { path: '/exam', icon: FileText, label: '套卷考试' },
  { path: '/questions', icon: Library, label: '题库浏览' },
  { path: '/wrong-questions', icon: AlertTriangle, label: '错题本' },
  { path: '/weakness', icon: TrendingUp, label: '薄弱分析' },
  { path: '/insights', icon: Sparkles, label: '书籍精华' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const totalAttempts = useExamStore((s) => {
    const data = s.masteryData;
    return data.reduce((sum, m) => sum + m.totalAttempts, 0);
  });
  const overallAccuracy = useExamStore((s) => {
    const data = s.masteryData;
    const total = data.reduce((sum, m) => sum + m.totalAttempts, 0);
    const correct = data.reduce((sum, m) => sum + m.correctCount, 0);
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  });
  const weakKp = useExamStore((s) => {
    return s.masteryData.filter((m) => m.masteryRate < 60).length;
  });

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    onClose();
  };

  const handleLogout = () => {
    logout();
    // 整页跳转，清空内存中的练习数据
    window.location.href = '/login';
  };

  return (
    <aside className={`fixed left-0 top-0 h-full w-60 bg-[#0F1420] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-7 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}>
              统计精练
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Statistics Mastery</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
              <span className="font-medium tracking-wide">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-amber-400" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Stats */}
      <div className="px-4 py-4 border-t border-white/5">
        {/* 当前账户 */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-xs text-slate-300 truncate">{getCurrentUser()?.displayName || '未登录'}</span>
          </div>
          <button
            onClick={handleLogout}
            title="退出登录"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">总答题</span>
            <span className="text-sm font-semibold text-white">{totalAttempts}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">正确率</span>
            <span className={`text-sm font-semibold ${overallAccuracy >= 70 ? 'text-emerald-400' : overallAccuracy >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {overallAccuracy}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">薄弱点</span>
            <span className="text-sm font-semibold text-red-400">{weakKp}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
