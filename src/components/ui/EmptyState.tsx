import React from 'react';
import { cn } from '@/lib/cn';

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
    {icon && (
      <span className="w-14 h-14 rounded-card bg-primary-soft text-primary flex items-center justify-center mb-3 [&_svg]:block">
        {icon}
      </span>
    )}
    <p className="text-[15px] font-bold text-foreground">{title}</p>
    {description && (
      <p className="text-[13px] text-muted-foreground mt-1 max-w-sm leading-snug">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
