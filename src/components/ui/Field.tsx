'use client';

import React from 'react';
import { cn } from '@/lib/cn';

/** Bao nhãn + ghi chú + thông báo lỗi quanh một ô nhập. */
export const Field: React.FC<{
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, error, required, children, className }) => (
  <div className={cn('space-y-1.5', className)}>
    {label && (
      <label className="block text-[13px] font-semibold text-foreground">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="text-[12px] text-danger font-medium">{error}</p>
    ) : (
      hint && <p className="text-[12px] text-muted-foreground">{hint}</p>
    )}
  </div>
);

const baseField =
  'w-full rounded-field bg-muted border border-line px-3.5 text-sm text-foreground placeholder:text-subtle-foreground transition focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }> = ({
  className,
  invalid,
  ...rest
}) => (
  <input
    className={cn(baseField, 'h-11', invalid && 'border-danger focus:border-danger focus:ring-danger/20', className)}
    {...rest}
  />
);

export const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
> = ({ className, invalid, ...rest }) => (
  <textarea
    className={cn(baseField, 'py-2.5 min-h-[88px] resize-y', invalid && 'border-danger', className)}
    {...rest}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }> = ({
  className,
  invalid,
  children,
  ...rest
}) => (
  <select
    className={cn(
      baseField,
      'h-11 pr-9 cursor-pointer appearance-none bg-no-repeat',
      invalid && 'border-danger',
      className
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a8aa3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundPosition: 'right 12px center',
    }}
    {...rest}
  >
    {children}
  </select>
);
