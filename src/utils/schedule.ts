import { ClassEntity } from '@/types/classroom';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';

/** Rút gọn 'HH:mm:ss' hoặc 'HH:mm' về đúng 5 ký tự 'HH:mm'. */
export function toHHMM(time?: string | null): string {
  return time ? String(time).substring(0, 5) : '';
}

/**
 * Khung giờ hiển thị của một lớp: ưu tiên giờ riêng của lớp,
 * chỉ rơi về ca mẫu khi lớp chưa đặt giờ.
 */
export function getClassTimeRange(
  cls: Pick<ClassEntity, 'startTime' | 'endTime' | 'shiftId'>,
  shifts: TimeShift[] = TIME_SHIFTS,
): { startTime: string; endTime: string; shift: TimeShift | null } {
  const shift = shifts.find((s) => s.id === cls.shiftId) || null;
  const startTime = toHHMM(cls.startTime) || toHHMM(shift?.startTime);
  const endTime = toHHMM(cls.endTime) || toHHMM(shift?.endTime);
  return { startTime, endTime, shift };
}

/**
 * Ca mẫu khớp đúng khung giờ đang dùng. Trả về null khi lớp dùng giờ riêng
 * lệch khỏi mọi ca mẫu, để giao diện không hiện nhãn "Ca N" sai giờ.
 */
export function findShiftByTime(
  startTime?: string | null,
  endTime?: string | null,
  shifts: TimeShift[] = TIME_SHIFTS,
): TimeShift | null {
  const start = toHHMM(startTime);
  const end = toHHMM(endTime);
  if (!start || !end) return null;
  return shifts.find((s) => toHHMM(s.startTime) === start && toHHMM(s.endTime) === end) || null;
}

/** Nhãn ca học kèm khung giờ, ví dụ "Ca 3 (13:30 – 15:30)"; lớp giờ riêng thì chỉ hiện khung giờ. */
export function formatClassTimeLabel(
  cls: Pick<ClassEntity, 'startTime' | 'endTime' | 'shiftId'>,
  shifts: TimeShift[] = TIME_SHIFTS,
): string {
  const { startTime, endTime } = getClassTimeRange(cls, shifts);
  const matchedShift = findShiftByTime(startTime, endTime, shifts);
  const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : startTime || endTime || 'Chưa đặt giờ';
  return matchedShift ? `Ca ${matchedShift.id} (${timeRange})` : timeRange;
}

/**
 * Nhãn ca của một buổi học cụ thể. Buổi học có giờ riêng nên nhãn "Ca N" chỉ
 * hiện khi giờ của buổi khớp đúng một ca mẫu.
 */
export function formatSlotTimeLabel(
  slot: Pick<ScheduleSlot, 'startTime' | 'endTime' | 'shiftId'>,
  shifts: TimeShift[] = TIME_SHIFTS,
): string {
  const startTime = toHHMM(slot.startTime);
  const endTime = toHHMM(slot.endTime);
  const matchedShift = findShiftByTime(startTime, endTime, shifts);
  const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : startTime || endTime || 'Chưa đặt giờ';
  return matchedShift ? `Ca ${matchedShift.id} (${timeRange})` : timeRange;
}

/**
 * Nhãn ngắn của một buổi học cho tab, huy hiệu: "Ca 3" nếu giờ khớp ca mẫu,
 * ngược lại hiện khung giờ "13:30 – 15:30".
 */
export function formatSlotShortLabel(
  slot: Pick<ScheduleSlot, 'startTime' | 'endTime' | 'shiftId'>,
  shifts: TimeShift[] = TIME_SHIFTS,
): string {
  const startTime = toHHMM(slot.startTime);
  const endTime = toHHMM(slot.endTime);
  const matchedShift = findShiftByTime(startTime, endTime, shifts);
  if (matchedShift) return `Ca ${matchedShift.id}`;
  return startTime && endTime ? `${startTime} – ${endTime}` : startTime || endTime || 'Chưa đặt giờ';
}
