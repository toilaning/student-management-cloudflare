'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Button, Field, Input } from '@/components/ui';
import {
  ShieldCheck,
  UserCheck,
  Users,
  ArrowRight,
  AlertCircle,
  Lock,
  User as UserIcon,
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
      setError('Nhập đủ tên đăng nhập và mật khẩu');
      return;
    }
    performLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="bg-card border border-line rounded-card shadow-card p-6 space-y-5">
          <div>
            <h1 className="text-base font-bold text-foreground">Đăng nhập</h1>
            <p className="text-[13px] text-muted-foreground">Dùng tài khoản được cấp để vào hệ thống.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-field bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Tên đăng nhập">
              <div className="relative">
                <UserIcon
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle-foreground pointer-events-none"
                />
                <Input
                  type="text"
                  required
                  disabled={isLoading}
                  placeholder="admin, gv001, st001..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Field>

            <Field label="Mật khẩu">
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle-foreground pointer-events-none"
                />
                <Input
                  type="password"
                  required
                  disabled={isLoading}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Field>

            <Button type="submit" size="lg" fullWidth loading={isLoading} icon={<ArrowRight size={16} />}>
              {isLoading ? 'Đang kiểm tra' : 'Đăng nhập'}
            </Button>
          </form>

          {showDevQuickLogin && (
            <div className="pt-4 border-t border-line space-y-2.5">
              <p className="text-[12px] font-semibold text-muted-foreground text-center">Đăng nhập nhanh (Dev)</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('admin', 'admin123')}
                  className="rounded-field border border-line bg-muted px-2 py-2.5 flex flex-col items-center gap-1 text-foreground transition hover:border-primary hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ShieldCheck size={17} className="text-primary" />
                  <span className="text-[12px] font-semibold">Quản trị</span>
                  <span className="text-[11px] text-muted-foreground">admin</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('gv001', 'teacher123')}
                  className="rounded-field border border-line bg-muted px-2 py-2.5 flex flex-col items-center gap-1 text-foreground transition hover:border-primary hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <UserCheck size={17} className="text-primary" />
                  <span className="text-[12px] font-semibold">Giáo viên</span>
                  <span className="text-[11px] text-muted-foreground">gv001</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin('st001', 'student123')}
                  className="rounded-field border border-line bg-muted px-2 py-2.5 flex flex-col items-center gap-1 text-foreground transition hover:border-primary hover:bg-primary-soft disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Users size={17} className="text-primary" />
                  <span className="text-[12px] font-semibold">Học sinh</span>
                  <span className="text-[11px] text-muted-foreground">st001</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[12px] text-subtle-foreground">Trung tâm luyện thi trực tuyến</p>
      </div>
    </div>
  );
}
