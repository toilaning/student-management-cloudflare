'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { GraduationCap, ShieldCheck, UserCheck, Users, LogIn, AlertCircle, Loader2 } from 'lucide-react';

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
    } catch (err) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng Nhập Hệ Thống</h1>
          <p className="text-xs text-slate-500">Quản Lý Đào Tạo & Lớp Học Trực Tuyến EduLocal</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Tên đăng nhập / Mã định danh</label>
            <input
              type="text"
              required
              disabled={isLoading}
              placeholder="VD: admin, gv001, st001..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Mật khẩu</label>
            <input
              type="password"
              required
              disabled={isLoading}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Đăng nhập ngay</span>
              </>
            )}
          </button>
        </form>

        {showDevQuickLogin && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Hoặc đăng nhập nhanh bằng 1-Click (Dev Mode)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className="p-2.5 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 text-purple-700 rounded-xl font-bold text-[11px] transition flex flex-col items-center gap-1 border border-purple-100 disabled:cursor-not-allowed"
              >
                <ShieldCheck size={16} />
                <span>Admin</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('gv001', 'teacher123')}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 rounded-xl font-bold text-[11px] transition flex flex-col items-center gap-1 border border-blue-100 disabled:cursor-not-allowed"
              >
                <UserCheck size={16} />
                <span>Giáo viên</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('st001', 'student123')}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 rounded-xl font-bold text-[11px] transition flex flex-col items-center gap-1 border border-emerald-100 disabled:cursor-not-allowed"
              >
                <Users size={16} />
                <span>Học viên</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
