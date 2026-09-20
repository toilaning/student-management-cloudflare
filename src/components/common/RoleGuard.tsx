'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Role } from '@/types/auth';
import { Loader2, ShieldAlert, ArrowRight } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { currentUser, isReady, isLoading } = useApp();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  const getTargetDashboard = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'TEACHER':
        return '/teacher/dashboard';
      case 'STUDENT':
        return '/student/dashboard';
      default:
        return '/login';
    }
  };

  const hasAccess = isReady && currentUser && allowedRoles.includes(currentUser.role);
  const targetDashboard = currentUser ? getTargetDashboard(currentUser.role) : '/login';

  useEffect(() => {
    if (isReady && !isLoading) {
      if (!currentUser) {
        // Chưa đăng nhập -> chuyển ngay về /login
        router.replace('/login');
        return;
      }

      if (!hasAccess) {
        const timer = setTimeout(() => {
          setRedirecting(true);
          router.push(targetDashboard);
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [isReady, isLoading, currentUser, hasAccess, targetDashboard, router]);

  // Loading skeleton state
  if (!isReady || isLoading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Loader2 size={32} className="animate-spin text-indigo-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Đang tải dữ liệu không gian làm việc...</h3>
            <p className="text-xs text-slate-500">Vui lòng chờ trong giây lát trong khi hệ thống xác thực vai trò</p>
          </div>
          <div className="w-full space-y-2 pt-2">
            <div className="h-3 bg-slate-100 rounded-full w-4/5 mx-auto animate-pulse"></div>
            <div className="h-3 bg-slate-100 rounded-full w-3/5 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in (handled by redirect in useEffect, but render blank or loading during transition)
  if (!currentUser) {
    return null;
  }

  // Access denied state
  if (!hasAccess) {
    const roleLabels: Record<Role, string> = {
      ADMIN: 'Quản trị viên (ADMIN)',
      TEACHER: 'Giáo viên (TEACHER)',
      STUDENT: 'Học viên (STUDENT)',
    };

    const allowedRolesStr = allowedRoles.map(r => roleLabels[r] || r).join(' hoặc ');
    const currentRoleStr = roleLabels[currentUser.role] || currentUser.role;

    return (
      <div className="flex-1 min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-sm p-8 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl items-center justify-center flex">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Không có quyền truy cập</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn không có quyền truy cập trang này (Yêu cầu vai trò: <strong>{allowedRolesStr}</strong>. Vai trò hiện tại: <strong>{currentRoleStr}</strong>)
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 w-full">
            {redirecting ? (
              <span className="flex items-center justify-center gap-2 text-indigo-600 font-medium">
                <Loader2 size={14} className="animate-spin" />
                Đang chuyển hướng về trang làm việc phù hợp...
              </span>
            ) : (
              <span>Tự động chuyển hướng về trang phù hợp sau 1.5s...</span>
            )}
          </div>

          <button
            onClick={() => {
              setRedirecting(true);
              router.push(targetDashboard);
            }}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Chuyển về trang phù hợp</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
