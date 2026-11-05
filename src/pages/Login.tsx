import { useState } from 'react';
import type { FormEvent } from 'react';
import { BarChart3, LogIn, User, Lock } from 'lucide-react';
import { login } from '../utils/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const account = login(username, password);
    if (account) {
      // 整页跳转，重置内存中的练习数据，按新账户命名空间重新加载
      window.location.href = '/';
    } else {
      setError('用户名或密码错误');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1121] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-white tracking-wide"
            style={{ fontFamily: 'Georgia, "Noto Serif SC", serif' }}
          >
            统计精练
          </h1>
          <p className="text-xs text-slate-500 mt-1">Statistics Mastery</p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#0F1420] border border-white/5 rounded-xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">用户名</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-sm font-medium rounded-lg py-2.5 transition-all"
          >
            <LogIn className="w-4 h-4" />
            登 录
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-600 mt-4">
          每位学员使用独立账户，练习数据互不可见
        </p>
      </div>
    </div>
  );
}
