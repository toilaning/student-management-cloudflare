import { IRepository } from '@/repositories/IRepository';
import { repo as defaultRepo } from '@/repositories';
import { ShiftService } from './ShiftService';
import { ConflictEngine } from './ConflictEngine';
import { ScheduleSlot, ScheduleConflict } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';

export interface BulkGenerateParams {
  classIds: string[]; // ['CLS01', ...] hoặc ['all']
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  shiftId?: number;
  startTime?: string;
  endTime?: string;
  scheduleDays?: number[];
  overwriteExisting?: boolean;
  actorId?: string;
}

export interface BulkGenerateConflictItem {
  classId: string;
  date: string;
  shiftId: number;
  conflicts: ScheduleConflict[];
}

export interface BulkGenerateResult {
  summary: {
    totalAttempted: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    conflictCount: number;
  };
  createdSlots: ScheduleSlot[];
  conflicts: BulkGenerateConflictItem[];
}

export class BulkScheduleService {
  constructor(private repo: IRepository = defaultRepo) {}

  public async generateRecurringSlots(params: BulkGenerateParams): Promise<BulkGenerateResult> {
    const {
      classIds,
      startDate,
      endDate,
      shiftId: overrideShiftId,
      startTime: overrideStartTime,
      endTime: overrideEndTime,
      scheduleDays: overrideScheduleDays,
      overwriteExisting = false,
      actorId = 'ADMIN001',
    } = params;

    // 1. Đọc danh sách lớp học cần sinh lịch
    const allClasses = await this.repo.getAllClasses();
    let targetClasses: ClassEntity[] = [];

    const isAll = classIds.length === 0 || classIds.includes('all') || classIds.includes('ALL');
    if (isAll) {
      targetClasses = allClasses.filter(c => c.status === 'Đang mở');
    } else {
      const idSet = new Set(classIds);
      targetClasses = allClasses.filter(c => idSet.has(c.id));
    }

    if (targetClasses.length === 0) {
      return {
        summary: {
          totalAttempted: 0,
          createdCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          conflictCount: 0,
        },
        createdSlots: [],
        conflicts: [],
      };
    }

    const conflictEngine = new ConflictEngine(this.repo);
    const shifts = await ShiftService.getAllShifts();
    const shiftMap = new Map<number, (typeof shifts)[0]>();
    shifts.forEach(s => shiftMap.set(s.id, s));

    // Lấy trước max id của ScheduleSlot để sinh ID tăng dần duy nhất
    const initialSlots = await this.repo.getAllScheduleSlots();
    let maxNum = initialSlots.reduce((max, s) => {
      const match = String(s.id || '').match(/^SCH(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);

    // Chuẩn bị danh sách ngày từ startDate đến endDate
    const dateList: string[] = [];
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);
    const curr = new Date(Date.UTC(sY, sM - 1, sD));
    const end = new Date(Date.UTC(eY, eM - 1, eD));

    while (curr <= end) {
      const y = curr.getUTCFullYear();
      const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
      const d = String(curr.getUTCDate()).padStart(2, '0');
      dateList.push(`${y}-${m}-${d}`);
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    let totalAttempted = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let conflictCount = 0;

    const createdSlots: ScheduleSlot[] = [];
    const conflicts: BulkGenerateConflictItem[] = [];

    // Duyệt qua từng ngày
    for (const dateStr of dateList) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      const jsDay = dateObj.getUTCDay(); // 0: CN, 1: T2, 2: T3, ..., 6: T7
      const dayOfWeek = jsDay === 0 ? 8 : jsDay + 1; // 2..7 cho T2..T7, 8 cho CN

      for (const cls of targetClasses) {
        const classDays = overrideScheduleDays && overrideScheduleDays.length > 0
          ? overrideScheduleDays
          : cls.scheduleDays || [];

        // Kiểm tra xem thứ của ngày hiện tại có nằm trong lịch học của lớp không (2..8)
        if (!classDays.includes(dayOfWeek)) {
          continue;
        }

        totalAttempted++;

        const currentShiftId = overrideShiftId !== undefined && overrideShiftId !== null
          ? Number(overrideShiftId)
          : cls.shiftId || 1;

        const defaultShift = shiftMap.get(currentShiftId) || shifts[0] || {
          id: currentShiftId,
          startTime: '18:30',
          endTime: '20:30',
        };

        const slotStartTime = overrideStartTime || cls.startTime || defaultShift.startTime || '18:30';
        const slotEndTime = overrideEndTime || cls.endTime || defaultShift.endTime || '20:30';

        // Lấy tất cả slot hiện có để kiểm tra lớp đã có ca ngày đó chưa
        const currentSlots = await this.repo.getAllScheduleSlots();
        const existingSlot = currentSlots.find(
          s => s.classId === cls.id && s.date === dateStr && s.status !== 'Đã hủy'
        );

        if (existingSlot) {
          if (overwriteExisting) {
            // Cập nhật slot hiện có
            const updatedSlot: ScheduleSlot = {
              ...existingSlot,
              teacherId: cls.teacherId,
              roomId: cls.roomId,
              shiftId: currentShiftId,
              startTime: slotStartTime,
              endTime: slotEndTime,
              subject: cls.subject || existingSlot.subject,
              meetingLink: cls.meetingLink || existingSlot.meetingLink,
              status: 'Đã lên lịch',
            };

            // Kiểm tra xung đột trước khi update (ngoại trừ chính existingSlot.id)
            const check = await conflictEngine.checkScheduleConflict(updatedSlot, existingSlot.id);
            if (check.hasConflict) {
              conflictCount++;
              conflicts.push({
                classId: cls.id,
                date: dateStr,
                shiftId: currentShiftId,
                conflicts: check.conflicts,
              });
            } else {
              await this.repo.updateScheduleSlot(updatedSlot);
              updatedCount++;
              createdSlots.push(updatedSlot);
            }
          } else {
            // Bỏ qua nếu đã có và không cho phép ghi đè
            skippedCount++;
          }
          continue;
        }

        // Trường hợp chưa có slot: Kiểm tra xung đột
        const candidateSlot: Omit<ScheduleSlot, 'id'> = {
          classId: cls.id,
          teacherId: cls.teacherId,
          roomId: cls.roomId,
          date: dateStr,
          shiftId: currentShiftId,
          startTime: slotStartTime,
          endTime: slotEndTime,
          subject: cls.subject || cls.name,
          topic: `Buổi học định kỳ - ${cls.name}`,
          meetingLink: cls.meetingLink || '',
          status: 'Đã lên lịch',
        };

        const conflictResult = await conflictEngine.checkScheduleConflict(candidateSlot);

        if (conflictResult.hasConflict) {
          conflictCount++;
          conflicts.push({
            classId: cls.id,
            date: dateStr,
            shiftId: currentShiftId,
            conflicts: conflictResult.conflicts,
          });
        } else {
          maxNum++;
          const newSlotId = `SCH${maxNum.toString().padStart(4, '0')}`;
          const newSlot: ScheduleSlot = {
            id: newSlotId,
            ...candidateSlot,
          };
          await this.repo.createScheduleSlot(newSlot);
          createdCount++;
          createdSlots.push(newSlot);
        }
      }
    }

    // Ghi nhận Audit Log tổng kết
    await this.repo.addAuditLog({
      action: 'CREATE',
      userId: actorId,
      userName: actorId === 'ADMIN001' ? 'Quản trị viên' : actorId,
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: 'BULK_GENERATE',
      details: `Sinh lịch lặp dài hạn từ ${startDate} đến ${endDate}: Tạo mới ${createdCount}, Cập nhật ${updatedCount}, Bỏ qua ${skippedCount}, Xung đột ${conflictCount} (Tổng quét: ${totalAttempted}) cho ${targetClasses.length} lớp.`,
    });

    return {
      summary: {
        totalAttempted,
        createdCount,
        updatedCount,
        skippedCount,
        conflictCount,
      },
      createdSlots,
      conflicts,
    };
  }
}
