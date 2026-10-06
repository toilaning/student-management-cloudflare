'use client';

import React from 'react';
import { Pager } from '@/components/ui/DataTable';

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  showPageSizeSelector?: boolean;
  itemLabel?: string;
}

/**
 * Lớp tương thích cho các trang còn dùng <PaginationControls>.
 * Chuyển tiếp sang <Pager> để toàn hệ thống dùng một kiểu phân trang.
 */
export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
  showPageSizeSelector = true,
}) => (
  <Pager
    page={currentPage}
    pageSize={pageSize}
    total={totalItems}
    onPageChange={onPageChange}
    onPageSizeChange={showPageSizeSelector ? onPageSizeChange : undefined}
    className={className}
  />
);
