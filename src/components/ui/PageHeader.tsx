import React from 'react';
import { cn } from '@/lib/cn';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className }) => (
  <div className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5', className)}>
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="text-[13px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
  </div>
);
