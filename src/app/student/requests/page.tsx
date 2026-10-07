'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Trang đơn từ của học sinh đã được gộp vào Thời khoá biểu
 * (nút "Xin vắng" ngay trên mỗi ca học). Trang cũ giờ chỉ chuyển hướng
 * về Thời khoá biểu để tránh rơi vào một trang mồ côi.
 */
export default function StudentRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student/schedule');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground text-sm">Đang chuyển đến Thời khoá biểu…</p>
      </div>
    </div>
  );
}
