import React from 'react';

/**
 * Skeleton dùng chung cho các trang (dùng trong file loading.tsx).
 * Hiển thị ngay khi chuyển trang để cải thiện tốc độ cảm nhận,
 * thay vì chờ hydration + fetch dữ liệu xong mới vẽ giao diện.
 */
export const PageSkeleton: React.FC<{
  cards?: number;
  rows?: number;
  showHeader?: boolean;
}> = ({ cards = 4, rows = 6, showHeader = true }) => {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {showHeader && (
        <div className="h-16 border-b border-line px-4 sm:px-6 flex items-center gap-3">
          <div className="w-40 h-5 rounded-field bg-muted animate-pulse" />
          <div className="hidden sm:block w-64 h-3.5 rounded-field bg-muted animate-pulse" />
        </div>
      )}
      <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
        {cards > 0 && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: cards }).map((_, i) => (
              <div key={i} className="h-24 rounded-card bg-muted animate-pulse border border-line" />
            ))}
          </section>
        )}
        {rows > 0 && (
          <section className="rounded-card border border-line bg-card p-4 space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="h-12 rounded-field bg-muted animate-pulse" />
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default PageSkeleton;
