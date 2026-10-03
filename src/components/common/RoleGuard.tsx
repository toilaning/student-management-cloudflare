'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Role } from '@/types/auth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

const dashboardFor: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  TEACHER: '/teacher/dashboard',
  STUDENT: '/student/dashboard',
};

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { currentUser, isReady, isLoading } = useApp();
  const router = useRouter();

  const hasAccess = !!currentUser && allowedRoles.includes(currentUser.role);
  const target = currentUser ? dashboardFor[currentUser.role] : '/login';

  useEffect(() => {
    if (!isReady || isLoading) return;
    if (!currentUser) {
      router.replace('/login');
    } else if (!hasAccess) {
      const timer = setTimeout(() => router.replace(target), 1200);
      return () => clearTimeout(timer);
    }
  }, [isReady, isLoading, currentUser, hasAccess, target, router]);

  if (!isReady || isLoading) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-[13px] font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  if (!hasAccess) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-sm w-full flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-card bg-danger-soft text-danger flex items-center justify-center">
            <ShieldAlert size={26} />
          </span>
          <h2 className="text-base font-bold text-foreground">Không có quyền truy cập</h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Trang này dành cho vai trò khác. Hệ thống sẽ đưa bạn về trang phù hợp.
          </p>
          <Button fullWidth onClick={() => router.replace(target)}>
            Về trang phù hợp
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
