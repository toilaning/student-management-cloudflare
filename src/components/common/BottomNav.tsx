'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/cn';
import { MOBILE_NAV } from './navConfig';

/** Thanh điều hướng dưới cùng, chỉ hiện trên mobile. */
export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { currentUser } = useApp();

  if (pathname === '/login' || !currentUser) return null;

  const items = MOBILE_NAV[currentUser.role];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-nav bg-card/95 backdrop-blur border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 min-h-[56px] py-2 transition-colors',
                isActive ? 'text-primary' : 'text-subtle-foreground'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-9 h-6 rounded-pill transition-colors',
                  isActive && 'bg-primary-soft'
                )}
              >
                <Icon size={19} />
              </span>
              <span className={cn('text-[10.5px] leading-none', isActive ? 'font-bold' : 'font-medium')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
