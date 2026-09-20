export type AttendanceStatus = 'Có mặt' | 'Vắng có phép' | 'Vắng không phép' | 'Đi muộn' | 'Điểm danh bù';

export interface AttendanceRecord {
  id: string; // ATT0001...
  scheduleSlotId: string;
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkinTime?: string;
  note?: string;
  originalSlotId?: string;
  makeupReason?: string;
  method?: 'BOT' | 'MANUAL';
  updatedBy: string; // GV001 hoặc ADMIN001
  updatedAt: string;
}
