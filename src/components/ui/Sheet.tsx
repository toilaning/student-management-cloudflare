'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdropClick?: boolean;
}

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
};

/**
 * Hộp thoại dùng chung: trượt từ đáy lên trên mobile, hiện giữa màn trên desktop.
 */
export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-sheet flex items-end sm:items-center justify-center sm:p-4 bg-foreground/40 backdrop-blur-[2px] animate-in-fade"
      onClick={() => closeOnBackdropClick && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          'relative w-full bg-card shadow-pop flex flex-col max-h-[92vh] sm:max-h-[88vh] rounded-t-card sm:rounded-card animate-in-sheet sm:animate-in-up',
          sizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 sm:hidden shrink-0" />
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-4 pb-3 shrink-0">
          <div className="min-w-0">
            {title && <h2 className="text-base font-bold text-foreground leading-tight">{title}</h2>}
            {description && (
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 -mr-1.5 -mt-1 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition shrink-0 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 sm:px-6 pb-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-line flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 shrink-0 bg-card rounded-b-card">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
