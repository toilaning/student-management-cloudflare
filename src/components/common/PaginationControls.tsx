'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
  showPageSizeSelector = true,
  itemLabel = 'mục',
}) => {
  if (totalItems === 0) {
    return (
      <div className={`p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center ${className}`}>
        Không có {itemLabel} nào phù hợp.
      </div>
    );
  }

  const validTotalPages = Math.max(1, totalPages);
  const validCurrentPage = Math.min(Math.max(1, currentPage), validTotalPages);

  const startItem = (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate pagination items with ellipses
  const getPaginationItems = (): (number | string)[] => {
    if (validTotalPages <= 7) {
      return Array.from({ length: validTotalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const leftEdge = 1;
    const rightEdge = validTotalPages;

    if (validCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push('ellipsis-right');
      pages.push(rightEdge);
    } else if (validCurrentPage >= validTotalPages - 3) {
      pages.push(leftEdge);
      pages.push('ellipsis-left');
      for (let i = validTotalPages - 4; i <= validTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(leftEdge);
      pages.push('ellipsis-left');
      pages.push(validCurrentPage - 1);
      pages.push(validCurrentPage);
      pages.push(validCurrentPage + 1);
      pages.push('ellipsis-right');
      pages.push(rightEdge);
    }

    return pages;
  };

  const paginationItems = getPaginationItems();

  return (
    <div
      className={`px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 ${className}`}
    >
      {/* Thông tin tiến trình & chọn PageSize */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
        <div className="font-medium text-slate-600 text-center sm:text-left">
          Hiển thị từ <strong className="text-slate-900 font-semibold">{startItem}</strong> -{' '}
          <strong className="text-slate-900 font-semibold">{endItem}</strong> trên tổng số{' '}
          <strong className="text-slate-900 font-semibold">{totalItems}</strong> {itemLabel}
        </div>

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="hidden xs:inline">|</span>
            <span>Hiển thị:</span>
            <select
              aria-label={`Số ${itemLabel} trên mỗi trang`}
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-semibold text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:bg-slate-100 transition"
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cụm nút điều hướng */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Nút trang đầu */}
        <button
          onClick={() => onPageChange(1)}
          disabled={validCurrentPage <= 1}
          title="Trang đầu tiên"
          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:cursor-not-allowed transition"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Nút trang trước */}
        <button
          onClick={() => onPageChange(validCurrentPage - 1)}
          disabled={validCurrentPage <= 1}
          title="Trang trước"
          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Số trang */}
        <div className="flex items-center gap-1">
          {paginationItems.map((item, idx) => {
            if (typeof item === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-slate-400 font-bold select-none text-xs"
                >
                  ...
                </span>
              );
            }

            const isActive = item === validCurrentPage;
            return (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center text-xs font-semibold rounded-lg transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Nút trang sau */}
        <button
          onClick={() => onPageChange(validCurrentPage + 1)}
          disabled={validCurrentPage >= validTotalPages}
          title="Trang tiếp theo"
          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={16} />
        </button>

        {/* Nút trang cuối */}
        <button
          onClick={() => onPageChange(validTotalPages)}
          disabled={validCurrentPage >= validTotalPages}
          title="Trang cuối cùng"
          className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:cursor-not-allowed transition"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
