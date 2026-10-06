'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

/** Dải chọn dạng viên thuốc, dùng cho bộ lọc trạng thái và chuyển chế độ xem. */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1.5 p-1 bg-muted rounded-pill overflow-x-auto no-scrollbar', className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn(
              'px-3.5 h-8 rounded-pill text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer',
              active ? 'bg-primary text-white shadow-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span className={cn('ml-1.5 tabular', active ? 'text-white/80' : 'text-subtle-foreground')}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const Tabs: React.FC<{
  items: TabItem[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}> = ({ items, value, onChange, className }) => (
  <div className={cn('flex gap-5 border-b border-line overflow-x-auto no-scrollbar', className)}>
    {items.map((it) => {
      const active = it.value === value;
      return (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            'relative pb-2.5 pt-1 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer',
            active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {it.label}
          {typeof it.count === 'number' && (
            <span className="ml-1.5 text-[12px] tabular text-subtle-foreground">{it.count}</span>
          )}
          {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-primary" />}
        </button>
      );
    })}
  </div>
);
