'use client';

import React from 'react';
import { QuickRoleSwitcher } from './QuickRoleSwitcher';
import { useApp } from '@/context/AppContext';
import { Search, Compass, LogOut, Menu } from 'lucide-react';
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

  const getRoleTitle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'TEACHER':
        return 'Thầy Cô Giảng Dạy';
      case 'STUDENT':
        return 'Học Viên Xưởng';
      default:
        return 'Thành viên';
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs gap-3">
      {/* Brand & Page Info */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 md:hidden text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0"
          aria-label="Mở menu điều hướng"
        >
          <Menu size={20} />
        </button>

        <Link href="/" className="flex items-center gap-2 text-slate-900 font-bold shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 border border-slate-800 flex items-center justify-center shadow-2xs group-hover:bg-slate-800 transition">
            <Compass size={18} className="stroke-[2.2]" />
          </div>
          <span className="hidden sm:inline text-sm font-semibold tracking-tight text-slate-900">
            Atelier Studio
          </span>
        </Link>

        {(title || subtitle) && (
          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0"></div>
        )}

        <div className="min-w-0 flex-1 sm:flex-initial">
          {title && (
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate max-w-[130px] sm:max-w-[240px] md:max-w-none tracking-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="hidden md:block truncate text-[11px] text-slate-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Search quick button / input */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-slate-400 text-xs w-52 transition cursor-text">
          <Search size={14} className="text-slate-400 shrink-0" />
          <span className="text-[11px] font-medium truncate">Tìm kiếm phác thảo, hồ sơ...</span>
          <kbd className="ml-auto font-mono text-[9px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>

        {/* User Role Tag on Header */}
        {currentUser && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]">
            <span className="text-slate-400">Tài khoản:</span>
            <span className="font-semibold text-slate-800">{getRoleTitle(currentUser.role)}</span>
          </div>
        )}

        {/* Notifications */}
        <NotificationDropdown />

        {showDevSwitcher && (
          <>
            <div className="h-4 w-px bg-slate-200 shrink-0"></div>
            <QuickRoleSwitcher />
          </>
        )}

        <div className="h-4 w-px bg-slate-200 shrink-0"></div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Đăng xuất khỏi hệ thống"
          className="px-2.5 py-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};
