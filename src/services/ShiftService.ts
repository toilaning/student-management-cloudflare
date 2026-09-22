import { TimeShift, TIME_SHIFTS } from '../types/schedule';
import { repo } from '../repositories';

export class ShiftService {
  private static shifts: TimeShift[] = [...TIME_SHIFTS];

  public static async getAllShifts(): Promise<TimeShift[]> {
    return [...this.shifts];
  }

  public static async updateShift(id: number, data: Partial<TimeShift>): Promise<TimeShift | null> {
    const idx = this.shifts.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const old = this.shifts[idx];
    const updated: TimeShift = {
      ...old,
      ...data,
      id: old.id, // preserve id
      durationHours: data.startTime && data.endTime ? this.calcDuration(data.startTime, data.endTime) : old.durationHours
    };
    this.shifts[idx] = updated;

    await repo.addAuditLog({
      action: 'UPDATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: 'SHIFT_' + id,
      details: 'Cập nhật khung giờ ' + updated.name + ': ' + updated.startTime + ' - ' + updated.endTime,
    });

    return updated;
  }

  public static async createShift(data: { name: string; startTime: string; endTime: string }): Promise<TimeShift> {
    const nextId = this.shifts.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    const newShift: TimeShift = {
      id: nextId,
      name: data.name || ('Ca ' + nextId),
      startTime: data.startTime,
      endTime: data.endTime,
      durationHours: this.calcDuration(data.startTime, data.endTime)
    };
    this.shifts.push(newShift);

    await repo.addAuditLog({
      action: 'CREATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: 'SHIFT_' + nextId,
      details: 'Tạo ca học mới ' + newShift.name + ' (' + newShift.startTime + ' - ' + newShift.endTime + ')',
    });

    return newShift;
  }

  private static calcDuration(start: string, end: string): number {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      return Math.max(0.5, Math.round(((endMin - startMin) / 60) * 10) / 10);
    } catch {
      return 2.0;
    }
  }

  public static resetDefaults(): void {
    this.shifts = [...TIME_SHIFTS];
  }
}
