import React from 'react';
import { cn } from '@/lib/cn';
import type { AttendanceStatus } from '@/types/attendance';
import type { TuitionStatus } from '@/types/finance';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/*
  Chữ trong nhãn luôn dùng màu mực đậm để đọc rõ trên nền pastel.
  Màu trạng thái được giữ ở phần nền và ở chấm tròn phía trước.
*/
const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-primary-soft text-foreground',
  success: 'bg-success-soft text-foreground',
  warning: 'bg-warning-soft text-foreground',
  danger: 'bg-danger-soft text-foreground',
  info: 'bg-info-soft text-foreground',
};

const dotTones: Record<Tone, string> = {
  neutral: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export const Badge: React.FC<{
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}> = ({ tone = 'neutral', children, className, dot = false }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[12px] font-semibold whitespace-nowrap',
      tones[tone],
      className
    )}
  >
    {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotTones[tone])} />}
    {children}
  </span>
);

/** Màu trạng thái điểm danh dùng chung cho mọi cổng. */
export const ATTENDANCE_TONE: Record<AttendanceStatus, Tone> = {
  'Có mặt': 'success',
  'Đi muộn': 'warning',
  'Vắng có phép': 'info',
  'Vắng không phép': 'danger',
  'Điểm danh bù': 'primary',
};

/** Màu trạng thái học phí dùng chung cho mọi cổng. */
export const TUITION_TONE: Record<string, Tone> = {
  'Đã nộp': 'success',
  DA_NOP: 'success',
  'Còn nợ': 'warning',
  CON_NO: 'warning',
  'Quá hạn': 'danger',
  'Miễn giảm': 'info',
  'CHƯA_NỘP': 'neutral',
  'ĐÃ_NỘP': 'success',
  'CÒN_NỢ': 'warning',
};

export const AttendanceBadge: React.FC<{ status: AttendanceStatus; className?: string }> = ({
  status,
  className,
}) => (
  <Badge tone={ATTENDANCE_TONE[status] ?? 'neutral'} dot className={className}>
    {status}
  </Badge>
);

export const TuitionBadge: React.FC<{ status: TuitionStatus | string; className?: string }> = ({
  status,
  className,
}) => (
  <Badge tone={TUITION_TONE[status] ?? 'neutral'} dot className={className}>
    {status}
  </Badge>
);
