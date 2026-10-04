'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, isReady } = useApp();

  useEffect(() => {
    if (!isReady) return;

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (currentUser.role === 'ADMIN') {
      router.replace('/admin/dashboard');
    } else if (currentUser.role === 'TEACHER') {
      router.replace('/teacher/dashboard');
    } else if (currentUser.role === 'STUDENT') {
      router.replace('/student/dashboard');
    }
  }, [currentUser, isReady, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground text-sm">Đang tải…</p>
      </div>
    </div>
  );
}
