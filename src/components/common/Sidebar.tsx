'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Coins, 
  FileCheck, 
  History, 
  CreditCard,
  Inbox,
  UserCheck,
  Building2,
  Receipt,
  KeyRound,
  HelpCircle,
  LogOut,
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
    { label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Lịch học trung tâm', href: '/admin/calendar', icon: CalendarDays },
    { label: 'Sổ Điểm danh Toàn trường', href: '/admin/attendance', icon: UserCheck },
    { label: 'Duyệt đơn & Đổi ca', href: '/admin/requests', icon: Inbox },
    { label: 'Quản lý Lớp học', href: '/admin/classes', icon: BookOpen },
    { label: 'Đội ngũ Giáo viên', href: '/admin/teachers', icon: UserCheck },
    { label: 'Danh sách Học viên', href: '/admin/students', icon: Users },
    { label: 'Bảng lương GV', href: '/admin/payroll', icon: Coins },
    { label: 'Công nợ & Học phí', href: '/admin/tuition', icon: Receipt },
    { label: 'Tài khoản & Mật khẩu', href: '/admin/accounts', icon: KeyRound },
    { label: 'Nhật ký Hệ thống', href: '/admin/audit', icon: History },
    { label: 'Hướng dẫn tích hợp', href: '/admin/guides', icon: HelpCircle },
  ];

  const teacherNav = [
    { label: 'Bàn làm việc', href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Lịch dạy của tôi', href: '/teacher/schedule', icon: CalendarDays },
    { label: 'Lớp học phụ trách', href: '/teacher/classes', icon: BookOpen },
    { label: 'Sổ Điểm danh', href: '/teacher/attendance', icon: FileCheck },
    { label: 'Duyệt đơn xin nghỉ/đổi ca', href: '/teacher/requests', icon: Inbox },
  ];

  const studentNav = [
    { label: 'Góc học tập', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Thời khóa biểu', href: '/student/schedule', icon: CalendarDays },
    { label: 'Đăng ký Lớp học', href: '/student/classes', icon: BookOpen },
    { label: 'Lịch sử Chuyên cần', href: '/student/attendance', icon: FileCheck },
    { label: 'Đơn xin nghỉ / Đổi ca', href: '/student/requests', icon: Inbox },
    { label: 'Học phí & Thanh toán', href: '/student/tuition', icon: CreditCard },
  ];

  let currentNav = adminNav;
  let portalTitle = 'Admin Portal';
  let portalColor = 'text-purple-600';
  let roleBadge = 'bg-purple-50 text-purple-700 border-purple-200';

  if (role === 'TEACHER') {
    currentNav = teacherNav;
    portalTitle = 'Teacher Portal';
    portalColor = 'text-blue-600';
    roleBadge = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (role === 'STUDENT') {
    currentNav = studentNav;
    portalTitle = 'Student Portal';
    portalColor = 'text-emerald-600';
    roleBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  return (
    <>
      {/* Backdrop for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed md:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 min-h-screen transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-none text-base">EduLocal</div>
              <div className={`text-[11px] font-semibold tracking-wide uppercase mt-1 ${portalColor}`}>{portalTitle}</div>
            </div>
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 md:hidden text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

      {/* User Mini Profile */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm ring-2 ring-white shadow-xs">
            {currentUser.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${roleBadge}`}>
                {currentUser.id}
              </span>
              <span className="text-xs text-slate-400 truncate">{currentUser.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Menu chức năng
        </div>
        {currentNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              <span className="truncate whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Kỳ học:</span>
          <span className="font-semibold text-slate-600">Tháng 09/2026</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Môi trường:</span>
          <span className="text-emerald-600 font-semibold">Local In-Memory</span>
        </div>
      </div>
    </aside>
    </>
  );
};
