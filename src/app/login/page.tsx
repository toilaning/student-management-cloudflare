'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  Compass, 
  ShieldCheck, 
  UserCheck, 
  Users, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Lock, 
  User as UserIcon,
  Palette
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const showDevQuickLogin =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_SWITCHER === 'true';

  const performLogin = async (loginUsername: string, loginPassword: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác');
        return;
      }

      const user = data.user;
      login(user);

      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'TEACHER') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (quickUser: string, quickPass: string) => {
    setUsername(quickUser);
    setPassword(quickPass);
    performLogin(quickUser, quickPass);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác');
      return;
    }
    performLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Architectural Grid Accent */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-md w-full relative z-10">
        {/* Card Container */}
        <div className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200/80 p-8 space-y-6">
          
          {/* Header Brand */}
          <div className="text-center space-y-2.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 border border-slate-800 flex items-center justify-center mx-auto shadow-sm">
              <Compass size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Atelier Kiến Trúc • Mỹ Thuật
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Thuyết Studio — Cổng thông tin học viên & đào tạo
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Tên đăng nhập / Mã định danh
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon size={15} />
                </span>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  placeholder="VD: admin, gv001, st001..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-medium text-slate-900 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  placeholder="Nhập mật khẩu truy cập"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 font-medium text-slate-900 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin text-amber-400" />
                  <span>Đang xác thực thông tin...</span>
                </>
              ) : (
                <>
                  <span>Vào xưởng làm việc</span>
                  <ArrowRight size={14} className="text-amber-400" />
                </>
              )}
            </button>
          </form>

          {/* Quick Login Dev Mode */}
          {showDevQuickLogin && (
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 text-center">
                Đăng nhập nhanh 1-Click (Dev Mode)
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('admin', 'admin123')}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition flex flex-col items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck size={16} className="text-slate-800" />
                  <span className="font-semibold text-[11px]">Quản trị</span>
                  <span className="font-mono text-[9px] text-slate-400">admin</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('gv001', 'teacher123')}
                  className="p-2.5 bg-amber-50/50 hover:bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 transition flex flex-col items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserCheck size={16} className="text-amber-700" />
                  <span className="font-semibold text-[11px]">Giáo viên</span>
                  <span className="font-mono text-[9px] text-amber-700/70">gv001</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('st001', 'student123')}
                  className="p-2.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-900 transition flex flex-col items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users size={16} className="text-emerald-700" />
                  <span className="font-semibold text-[11px]">Học viên</span>
                  <span className="font-mono text-[9px] text-emerald-700/70">st001</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Subtext */}
          <div className="text-center pt-1 border-t border-slate-100">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <Palette size={13} className="text-amber-500" />
              <span>Không gian Luyện Thi Vẽ & Đồ Họa Atelier</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
