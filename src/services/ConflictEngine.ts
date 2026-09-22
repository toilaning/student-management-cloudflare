import { IRepository } from '@/repositories/IRepository';
import { ScheduleSlot, ScheduleConflict } from '@/types/schedule';

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ScheduleConflict[];
  message?: string;
}

export class ConflictEngine {
  constructor(private repo: IRepository) {}

  /**
   * Helper chuyển đổi HH:mm thành số phút trong ngày để so sánh
   */
  private static parseTimeToMinutes(timeStr?: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  /**
   * Kiểm tra xem 2 khoảng thời gian có giao nhau không (Time Interval Overlap)
   */
  private static isTimeOverlap(startA?: string, endA?: string, startB?: string, endB?: string): boolean {
    if (!startA || !endA || !startB || !endB) return false;
    const sA = ConflictEngine.parseTimeToMinutes(startA);
    const eA = ConflictEngine.parseTimeToMinutes(endA);
    const sB = ConflictEngine.parseTimeToMinutes(startB);
    const eB = ConflictEngine.parseTimeToMinutes(endB);
    return Math.max(sA, sB) < Math.min(eA, eB);
  }

  /**
   * Kiểm tra trùng lịch toàn diện:
   * 1. Giáo viên có bị trùng lịch trong cùng ngày và cùng khoảng thời gian không?
   * 2. Phòng học có bị trùng lịch trong cùng ngày và cùng khoảng thời gian không? (Bỏ qua phòng 'ONLINE')
   * 3. Lớp học có bị xếp 2 ca/môn cùng ngày và cùng khoảng thời gian không?
   */
  public async checkScheduleConflict(
    newSlot: Omit<ScheduleSlot, 'id'>, 
    excludeSlotId?: string
  ): Promise<ConflictCheckResult> {
    const allSlots = await this.repo.getAllScheduleSlots();
    const conflicts: ScheduleConflict[] = [];

    for (const slot of allSlots) {
      // Bỏ qua chính slot đang cập nhật hoặc slot đã bị hủy
      if (excludeSlotId && slot.id === excludeSlotId) continue;
      if (slot.status === 'Đã hủy') continue;

      // Phải cùng ngày học
      if (slot.date !== newSlot.date) continue;

      // Kiểm tra trùng thời gian: Giao nhau theo giờ thực tế HOẶC cùng shiftId (nếu thiếu giờ)
      const hasTimeCollision = (slot.startTime && slot.endTime && newSlot.startTime && newSlot.endTime)
        ? ConflictEngine.isTimeOverlap(slot.startTime, slot.endTime, newSlot.startTime, newSlot.endTime)
        : (slot.shiftId === newSlot.shiftId);

      if (hasTimeCollision) {
        // 1. Trùng giáo viên
        if (slot.teacherId && newSlot.teacherId && slot.teacherId === newSlot.teacherId) {
          conflicts.push({
            type: 'TEACHER_CONFLICT',
            message: `Giáo viên mã [${newSlot.teacherId}] đã có lịch dạy lớp [${slot.classId}] vào ngày ${slot.date} (${slot.startTime} - ${slot.endTime})!`,
            conflictingSlot: slot,
          });
        }

        // 2. Trùng phòng học (Bỏ qua nếu là phòng 'ONLINE' hoặc rỗng)
        const isOnlineRoom = !slot.roomId || !newSlot.roomId || 
          slot.roomId.toUpperCase() === 'ONLINE' || 
          newSlot.roomId.toUpperCase() === 'ONLINE';

        if (!isOnlineRoom && slot.roomId === newSlot.roomId) {
          conflicts.push({
            type: 'ROOM_CONFLICT',
            message: `Phòng học [${newSlot.roomId}] đã được sử dụng bởi lớp [${slot.classId}] vào ngày ${slot.date} (${slot.startTime} - ${slot.endTime})!`,
            conflictingSlot: slot,
          });
        }

        // 3. Trùng lớp học
        if (slot.classId && newSlot.classId && slot.classId === newSlot.classId) {
          conflicts.push({
            type: 'CLASS_CONFLICT',
            message: `Lớp học [${newSlot.classId}] đã có tiết học môn [${slot.subject}] vào ngày ${slot.date} (${slot.startTime} - ${slot.endTime})!`,
            conflictingSlot: slot,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      const summaryMsg = conflicts.map(c => c.message).join('; ');
      return {
        hasConflict: true,
        conflicts,
        message: `Phát hiện xung đột lịch học: ${summaryMsg}`,
      };
    }

    return {
      hasConflict: false,
      conflicts: [],
    };
  }
}
