'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover shadow-primary active:scale-[0.98]',
  secondary:
    'bg-white text-foreground border border-line-strong hover:bg-muted active:scale-[0.98]',
  ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-danger text-white hover:brightness-95 active:scale-[0.98]',
  success: 'bg-success text-white hover:brightness-95 active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
  icon: 'h-11 w-11 justify-center',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-pill font-semibold transition-all duration-150 cursor-pointer select-none whitespace-nowrap',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0 [&_svg]:block">{icon}</span>
      )}
      {children}
    </button>
  );
};
