'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Compass, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { NAV_GROUPS, PORTAL_META, findActiveNav } from './navConfig';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();

  if (pathname === '/login' || !currentUser) return null;

  const role = currentUser.role;
  const groups = NAV_GROUPS[role];
  const meta = PORTAL_META[role];
  const active = findActiveNav(groups, pathname);

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-nav md:hidden animate-in-fade"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed md:static top-0 bottom-0 left-0 z-nav w-[264px] bg-card border-r border-line flex flex-col shrink-0 min-h-screen transition-transform duration-300 ease-out',
          isMobileMenuOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Thương hiệu */}
        <div className="h-16 px-4 flex items-center justify-between shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="w-9 h-9 rounded-field bg-primary text-white flex items-center justify-center shrink-0 shadow-primary">
              <Compass size={19} className="stroke-[2.2]" />
            </span>
            <span className="min-w-0">
              <span className="block font-extrabold text-foreground text-[13.5px] tracking-tight leading-tight truncate">
                Luyện Thi Kiến Trúc
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground truncate">
                Mỹ thuật & Kiến trúc
              </span>
            </span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 md:hidden text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hồ sơ người dùng */}
        <div className="px-3 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 p-2.5 rounded-card bg-primary-soft/60 border border-primary-soft">
            <Avatar name={currentUser.name} src={currentUser.avatar} size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-foreground truncate leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-primary-ink font-semibold truncate">{meta.tag}</div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 pb-3 overflow-y-auto no-scrollbar">
          {groups.map((group) => (
            <div key={group.title} className="mb-1.5">
              <div className="px-3 pt-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-subtle-foreground">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active?.href === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-2.5 px-3 h-10 rounded-field text-[13px] transition-colors',
                        isActive
                          ? 'bg-primary-soft text-primary-ink font-bold'
                          : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />
                      )}
                      <Icon
                        size={17}
                        className={cn('shrink-0', isActive ? 'text-primary' : 'text-subtle-foreground')}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Chân trang */}
        <div className="p-3 border-t border-line shrink-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Niên khoá 2026–2027</span>
            <span className="inline-flex items-center gap-1.5 text-success font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Đang hoạt động
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
