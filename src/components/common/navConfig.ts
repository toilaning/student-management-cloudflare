import {
  LayoutDashboard,
  CalendarDays,
  UserCheck,
  Inbox,
  BookOpen,
  GraduationCap,
  Users,
  CreditCard,
  Coins,
  KeyRound,
  History,
  HelpCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types/auth';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Menu đầy đủ trên thanh bên, gom theo nhóm công việc. */
export const NAV_GROUPS: Record<Role, NavGroup[]> = {
  ADMIN: [
    {
      title: 'Tổng quan',
      items: [{ label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Vận hành',
      items: [
        { label: 'Lịch học trung tâm', href: '/admin/calendar', icon: CalendarDays },
        { label: 'Điểm danh', href: '/admin/attendance', icon: UserCheck },
        { label: 'Đơn từ', href: '/admin/requests', icon: Inbox },
      ],
    },
    {
      title: 'Danh mục',
      items: [
        { label: 'Lớp học', href: '/admin/classes', icon: BookOpen },
        { label: 'Giáo viên', href: '/admin/teachers', icon: GraduationCap },
        { label: 'Học viên', href: '/admin/students', icon: Users },
      ],
    },
    {
      title: 'Tài chính',
      items: [
        { label: 'Học phí & combo', href: '/admin/tuition', icon: CreditCard },
        { label: 'Thu chi', href: '/admin/finance', icon: Coins },
      ],
    },
    {
      title: 'Hệ thống',
      items: [
        { label: 'Tài khoản', href: '/admin/accounts', icon: KeyRound },
        { label: 'Nhật ký', href: '/admin/audit', icon: History },
        { label: 'Hướng dẫn', href: '/admin/guides', icon: HelpCircle },
      ],
    },
  ],
  TEACHER: [
    {
      title: 'Tổng quan',
      items: [{ label: 'Bàn làm việc', href: '/teacher/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Vận hành',
      items: [
        { label: 'Lịch dạy', href: '/teacher/schedule', icon: CalendarDays },
        { label: 'Điểm danh', href: '/teacher/attendance', icon: UserCheck },
        { label: 'Đơn từ', href: '/teacher/requests', icon: Inbox },
      ],
    },
    {
      title: 'Danh mục',
      items: [{ label: 'Lớp phụ trách', href: '/teacher/classes', icon: BookOpen }],
    },
    {
      title: 'Hệ thống',
      items: [{ label: 'Cài đặt', href: '/teacher/settings', icon: Settings }],
    },
  ],
  STUDENT: [
    {
      title: 'Tổng quan',
      items: [{ label: 'Trang chủ', href: '/student/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Vận hành',
      items: [
        { label: 'Thời khoá biểu', href: '/student/schedule', icon: CalendarDays },
        { label: 'Điểm danh', href: '/student/attendance', icon: UserCheck },
        { label: 'Đơn từ', href: '/student/requests', icon: Inbox },
      ],
    },
    {
      title: 'Học tập',
      items: [
        { label: 'Lớp của tôi', href: '/student/classes', icon: BookOpen },
        { label: 'Học phí', href: '/student/tuition', icon: CreditCard },
      ],
    },
    {
      title: 'Hệ thống',
      items: [{ label: 'Hồ sơ', href: '/student/settings', icon: Settings }],
    },
  ],
};

/** Thanh điều hướng dưới cùng trên mobile, tối đa 5 mục. */
export const MOBILE_NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Lịch', href: '/admin/calendar', icon: CalendarDays },
    { label: 'Điểm danh', href: '/admin/attendance', icon: UserCheck },
    { label: 'Học phí', href: '/admin/tuition', icon: CreditCard },
    { label: 'Học viên', href: '/admin/students', icon: Users },
  ],
  TEACHER: [
    { label: 'Trang chủ', href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Lịch dạy', href: '/teacher/schedule', icon: CalendarDays },
    { label: 'Điểm danh', href: '/teacher/attendance', icon: UserCheck },
    { label: 'Lớp', href: '/teacher/classes', icon: BookOpen },
    { label: 'Cài đặt', href: '/teacher/settings', icon: Settings },
  ],
  STUDENT: [
    { label: 'Trang chủ', href: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Lịch học', href: '/student/schedule', icon: CalendarDays },
    { label: 'Điểm danh', href: '/student/attendance', icon: UserCheck },
    { label: 'Học phí', href: '/student/tuition', icon: CreditCard },
    { label: 'Hồ sơ', href: '/student/settings', icon: Settings },
  ],
};

/** Tiêu đề cổng theo vai trò. */
export const PORTAL_META: Record<Role, { title: string; tag: string }> = {
  ADMIN: { title: 'Quản trị trung tâm', tag: 'Quản trị viên' },
  TEACHER: { title: 'Bàn làm việc giáo viên', tag: 'Giáo viên' },
  STUDENT: { title: 'Góc học tập', tag: 'Học viên' },
};

/** Tìm mục menu khớp với đường dẫn hiện tại (khớp dài nhất thắng). */
export function findActiveNav(groups: NavGroup[], pathname: string): NavItem | undefined {
  const all = groups.flatMap((g) => g.items);
  return all
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
