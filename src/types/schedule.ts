export interface TimeShift {
  id: number; // 1..5
  name: string; // Ca 1..Ca 5
  startTime: string; // "08:00"
  endTime: string;   // "10:00"
  durationHours: number; // 2.0
}

export const TIME_SHIFTS: TimeShift[] = [
  { id: 1, name: 'Ca 1 (08:00 - 10:00)', startTime: '08:00', endTime: '10:00', durationHours: 2.0 },
  { id: 2, name: 'Ca 2 (10:15 - 12:15)', startTime: '10:15', endTime: '12:15', durationHours: 2.0 },
  { id: 3, name: 'Ca 3 (13:30 - 15:30)', startTime: '13:30', endTime: '15:30', durationHours: 2.0 },
  { id: 4, name: 'Ca 4 (15:45 - 17:45)', startTime: '15:45', endTime: '17:45', durationHours: 2.0 },
  { id: 5, name: 'Ca 5 (18:30 - 20:30)', startTime: '18:30', endTime: '20:30', durationHours: 2.0 },
];

export interface ScheduleSlot {
  id: string; // SCH001...
  classId: string;
  teacherId: string;
  roomId: string;
  date: string; // YYYY-MM-DD (e.g. "2026-09-01")
  shiftId: number; // 1..5
  startTime: string; // "08:00"
  endTime: string;   // "10:00"
  subject: string;
  topic?: string;
  meetingLink?: string; // Link phòng học Discord / Room Link
  status: 'Đã lên lịch' | 'Đã hoàn thành' | 'Đã hủy' | 'Đổi lịch';
}

export interface ScheduleConflict {
  type: 'TEACHER_CONFLICT' | 'ROOM_CONFLICT' | 'CLASS_CONFLICT';
  message: string;
  conflictingSlot: ScheduleSlot;
}

export type RequestType = 'XIN_NGHI' | 'DOI_LICH';
export type RequestStatus = 'CHỜ_DUYỆT' | 'ĐÃ_DUYỆT' | 'TỪ_CHỐI';

export interface ClassRequest {
  id: string; // REQ001..
  studentId: string;
  classId: string;
  scheduleSlotId: string;
  type: RequestType;
  reason: string;
  targetScheduleSlotId?: string; // Khi đổi lịch
  status: RequestStatus;
  reviewedBy?: string; // GV001...
  reviewNote?: string;
  createdAt: string;
}
