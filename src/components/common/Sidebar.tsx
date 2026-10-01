'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  BookOpen, 
  Coins, 
  FileCheck, 
  History, 
  CreditCard,
  Inbox,
  Settings,
  UserCheck,
  Receipt,
  KeyRound,
  HelpCircle,
  Compass,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentUser, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();

  // Ẩn hoàn toàn Sidebar trên trang Đăng nhập hoặc khi chưa có currentUser
  if (pathname === '/login' || !currentUser) {
    return null;
  }

  const role = currentUser.role;

  const adminNav = [
    { label: 'Trang Chủ', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Học Viên', href: '/admin/students', icon: Users },
    { label: 'Điểm Danh', href: '/admin/attendance', icon: UserCheck },
    { label: 'Nhật Ký Đổi Ca', href: '/admin/requests', icon: Inbox },
    { label: 'Thu - Chi & Học Phí', href: '/admin/finance', icon: Coins },
  ];

  const teacherNav = [
    { label: 'Bàn Làm Việc', href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Sổ Điểm Danh', href: '/teacher/attendance', icon: FileCheck },
    { label: 'Nhật Ký Đổi Ca', href: '/teacher/requests', icon: Inbox },
    { label: 'Lịch Dạy & Lớp', href: '/teacher/schedule', icon: CalendarDays },
  ];

  const studentNav = [
    { label: 'Góc Học Tập', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Đổi Ca Học', href: '/student/requests', icon: Inbox },
    { label: 'Học Phí & VietQR', href: '/student/tuition', icon: CreditCard },
    { label: 'Lịch Học', href: '/student/schedule', icon: CalendarDays },
  ];

  let currentNav = adminNav;
  let portalTitle = 'Cổng Quản Trị Hệ Thống';
  let portalRoleTag = 'Quản trị viên';
  let roleBadgeClass = 'bg-slate-100 text-slate-800 border-slate-200';

  if (role === 'TEACHER') {
    currentNav = teacherNav;
    portalTitle = 'Bàn Làm Việc Giảng Viên';
    portalRoleTag = 'Thầy Cô Giảng Dạy';
    roleBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (role === 'STUDENT') {
    currentNav = studentNav;
    portalTitle = 'Góc Học Tập Xưởng Vẽ';
    portalRoleTag = 'Học Viên Xưởng';
    roleBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }

  return (
    <>
      {/* Backdrop for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed md:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 min-h-screen transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="h-16 px-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/40">
          <Link href="/" className="flex items-center gap-2.5 min-w-0" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-amber-400 border border-slate-800 flex items-center justify-center shrink-0 shadow-xs">
              <Compass size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm tracking-tight leading-snug truncate">
                Atelier Kiến Trúc
              </div>
              <div className="text-[10.5px] font-medium text-slate-500 truncate leading-none mt-0.5">
                Thuyết Studio • Mỹ Thuật
              </div>
            </div>
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 md:hidden text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Mini Profile */}
        <div className="p-3 mx-3 mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {currentUser.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate leading-snug">{currentUser.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200 shadow-2xs">
                  {currentUser.id}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${roleBadgeClass}`}>
                  {portalRoleTag}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav List */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {portalTitle}
          </div>
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'border-l-2 border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon 
                  size={18} 
                  className={`shrink-0 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} 
                />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/40 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Niên khóa:</span>
            <span className="font-mono font-medium text-slate-700">2026 - 2027</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Hệ thống:</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Atelier Sẵn sàng
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
