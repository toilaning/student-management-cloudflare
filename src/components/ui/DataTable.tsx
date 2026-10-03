'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
  /** Ẩn cột này trên màn nhỏ (chỉ còn thấy trong thẻ mobile nếu khai báo mobilePrimary). */
  hideOnMobile?: boolean;
}

/**
 * Bảng dữ liệu dùng chung: bảng cuộn ngang trên desktop, tự chuyển thành thẻ trên mobile.
 * Khi truyền renderMobile, mỗi dòng hiển thị theo bố cục thẻ để tránh bảng tràn màn hình.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription,
  emptyIcon,
  onRowClick,
  renderMobile,
  footer,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  renderMobile?: (row: T) => React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn('bg-card border border-line rounded-card shadow-card p-4 space-y-2.5', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-field bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cn('bg-card border border-line rounded-card shadow-card', className)}>
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={cn('bg-card border border-line rounded-card shadow-card overflow-hidden', className)}>
      {/* Bảng cho màn hình vừa và lớn */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-muted/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    !c.align && 'text-left',
                    c.headerClassName
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-line last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-primary-soft/40'
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-4 py-3 text-foreground align-middle',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.className
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Thẻ cho màn hình nhỏ */}
      <div className="md:hidden divide-y divide-line">
        {rows.map((row, i) => (
          <div
            key={rowKey(row, i)}
            onClick={() => onRowClick?.(row)}
            className={cn('p-4', onRowClick && 'cursor-pointer active:bg-primary-soft/40')}
          >
            {renderMobile ? renderMobile(row) : (
              <dl className="space-y-1.5">
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((c) => (
                    <div key={c.key} className="flex items-start justify-between gap-3">
                      <dt className="text-[12px] font-medium text-muted-foreground shrink-0">{c.header}</dt>
                      <dd className="text-[13px] text-foreground text-right min-w-0">{c.render(row)}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
        ))}
      </div>

      {footer && <div className="border-t border-line px-4 py-3">{footer}</div>}
    </div>
  );
}

/** Thanh phân trang gọn, dùng chung cho mọi bảng. */
export const Pager: React.FC<{
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  className?: string;
}> = ({ page, pageSize, total, onPageChange, onPageSizeChange, className }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-[12px] text-muted-foreground tabular">
        {from}–{to} trong {total}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-9 rounded-field bg-muted border border-line px-2 text-[13px] text-foreground cursor-pointer focus:outline-none focus:border-primary"
            aria-label="Số dòng mỗi trang"
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>
                {s} dòng
              </option>
            ))}
          </select>
        )}
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="text-[13px] font-semibold text-foreground tabular px-1">
          {page}/{totalPages}
        </span>
        <Button
          size="icon"
          variant="secondary"
          className="h-9 w-9"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};
