import React from 'react';
import { cn } from '@/lib/cn';

export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { padded?: boolean; interactive?: boolean }
> = ({ className, padded = true, interactive = false, children, ...rest }) => (
  <div
    className={cn(
      'bg-card border border-line rounded-card shadow-card',
      padded && 'p-5 sm:p-6',
      interactive && 'transition-all duration-150 hover:shadow-pop cursor-pointer',
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, icon, className }) => (
  <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
    <div className="flex items-start gap-3 min-w-0">
      {icon && (
        <span className="w-10 h-10 rounded-field bg-primary-soft text-primary-ink flex items-center justify-center shrink-0 [&_svg]:block">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-foreground leading-tight truncate">{title}</h3>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/** Khối thống kê nhỏ gọn dùng ở đầu các trang. */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}> = ({ label, value, hint, icon, tone = 'primary', className }) => {
  const tones: Record<string, string> = {
    primary: 'bg-primary-soft text-primary-ink',
    success: 'bg-success-soft text-foreground',
    warning: 'bg-warning-soft text-foreground',
    danger: 'bg-danger-soft text-foreground',
    info: 'bg-info-soft text-foreground',
  };
  return (
    <Card className={cn('flex items-center gap-4', className)}>
      {icon && (
        <span className={cn('w-11 h-11 rounded-field flex items-center justify-center shrink-0 [&_svg]:block', tones[tone])}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-extrabold text-foreground tabular leading-tight">{value}</p>
        {hint && <p className="text-[12px] text-muted-foreground truncate">{hint}</p>}
      </div>
    </Card>
  );
};
