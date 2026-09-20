'use client';

import React from 'react';
import { QuickRoleSwitcher } from './QuickRoleSwitcher';
import { useApp } from '@/context/AppContext';
import { Search, GraduationCap, LogOut, Menu } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import Link from 'next/link';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { currentUser, logout, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();
  const showDevSwitcher =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_SWITCHER === 'true';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 md:hidden text-slate-600 hover:bg-slate-100 rounded-lg transition shrink-0"
          aria-label="Mở menu"
        >
          <Menu size={20} />
        </button>
        <Link href="/" className="flex items-center gap-2 text-indigo-600 font-bold shrink-0">
          <GraduationCap className="w-6 h-6" />
          <span className="hidden sm:inline">EduLocal</span>
        </Link>
        <div className="min-w-0 flex-1 sm:flex-initial">
          {title && (
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 leading-tight truncate max-w-[130px] sm:max-w-[220px] md:max-w-none">
              {title}
            </h1>
          )}
          {subtitle && <p className="hidden md:block truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-400 text-xs w-56">
          <Search size={14} />
          <span>Tìm kiếm nhanh (Ctrl+K)...</span>
        </div>

        <NotificationDropdown />

        {showDevSwitcher && (
          <>
            <div className="h-5 w-px bg-slate-200 mx-0.5 sm:mx-1 shrink-0"></div>
            <QuickRoleSwitcher />
          </>
        )}

        <div className="h-5 w-px bg-slate-200 mx-0.5 sm:mx-1 shrink-0"></div>

        <button
          onClick={logout}
          title="Đăng xuất khỏi hệ thống"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};
