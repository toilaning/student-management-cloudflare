'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Tìm kiếm', className }) => (
  <div className={cn('relative', className)}>
    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle-foreground pointer-events-none" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 pl-10 pr-9 rounded-pill bg-card border border-line text-sm text-foreground placeholder:text-subtle-foreground transition focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        aria-label="Xoá tìm kiếm"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground hover:text-foreground transition cursor-pointer"
      >
        <X size={15} />
      </button>
    )}
  </div>
);
