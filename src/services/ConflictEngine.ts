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
   * Kiểm tra trùng lịch toàn diện:
   * 1. Giáo viên có bị trùng lịch trong cùng ngày và cùng ca học không?
   * 2. Phòng học có bị trùng lịch trong cùng ngày và cùng ca học không?
   * 3. Lớp học có bị xếp 2 ca/môn cùng ngày và cùng ca học không?
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

      // Cùng ngày và cùng ca học (shiftId)
      if (slot.date === newSlot.date && slot.shiftId === newSlot.shiftId) {
        // 1. Trùng giáo viên
        if (slot.teacherId === newSlot.teacherId) {
          conflicts.push({
            type: 'TEACHER_CONFLICT',
            message: `Giáo viên mã [${newSlot.teacherId}] đã có lịch dạy lớp [${slot.classId}] vào ngày ${slot.date} (${slot.startTime} - ${slot.endTime})!`,
            conflictingSlot: slot,
          });
        }

        // 2. Trùng phòng học
        if (slot.roomId === newSlot.roomId) {
          conflicts.push({
            type: 'ROOM_CONFLICT',
            message: `Phòng học [${newSlot.roomId}] đã được sử dụng bởi lớp [${slot.classId}] vào ngày ${slot.date} (${slot.startTime} - ${slot.endTime})!`,
            conflictingSlot: slot,
          });
        }

        // 3. Trùng lớp học
        if (slot.classId === newSlot.classId) {
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
