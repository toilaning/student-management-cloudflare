import { TimeShift, TIME_SHIFTS } from '../types/schedule';
import { repo } from '../repositories';

export class ShiftService {
  private static shifts: TimeShift[] = [...TIME_SHIFTS].map(s => ({ ...s, isActive: true }));

  public static async getAllShifts(): Promise<TimeShift[]> {
    return [...this.shifts];
  }

  public static async getShiftById(id: number): Promise<TimeShift | undefined> {
    return this.shifts.find(s => s.id === id);
  }

  public static async updateShift(
    id: number,
    data: { shiftId?: number; startTime?: string; endTime?: string; name?: string; isActive?: boolean }
  ): Promise<TimeShift | null> {
    const targetId = data.shiftId !== undefined ? Number(data.shiftId) : id;
    const idx = this.shifts.findIndex(s => s.id === targetId || s.id === id);
    if (idx === -1) return null;

    const old = this.shifts[idx];
    const updated: TimeShift = {
      ...old,
      name: data.name !== undefined ? data.name : old.name,
      startTime: data.startTime !== undefined ? data.startTime : old.startTime,
      endTime: data.endTime !== undefined ? data.endTime : old.endTime,
      isActive: data.isActive !== undefined ? data.isActive : old.isActive ?? true,
      durationHours: (data.startTime || data.endTime) 
        ? this.calcDuration(data.startTime || old.startTime, data.endTime || old.endTime)
        : old.durationHours
    };
    this.shifts[idx] = updated;

    await repo.addAuditLog({
      action: 'UPDATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: 'SHIFT_' + updated.id,
      details: 'Cập nhật khung giờ ' + updated.name + ': ' + updated.startTime + ' - ' + updated.endTime,
    });

    return updated;
  }

  public static async createShift(data: {
    shiftNumber?: number;
    name?: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }): Promise<TimeShift> {
    let nextId: number;
    if (data.shiftNumber !== undefined && Number(data.shiftNumber) > 0) {
      nextId = Number(data.shiftNumber);
    } else {
      nextId = this.shifts.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    }

    const newShift: TimeShift = {
      id: nextId,
      name: data.name || ('Ca ' + nextId),
      startTime: data.startTime,
      endTime: data.endTime,
      durationHours: this.calcDuration(data.startTime, data.endTime),
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    const existingIdx = this.shifts.findIndex(s => s.id === nextId);
    if (existingIdx !== -1) {
      this.shifts[existingIdx] = newShift;
    } else {
      this.shifts.push(newShift);
    }

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

public static async deleteShift(id: number): Promise<boolean> {
    const idx = this.shifts.findIndex(s => s.id === id);
    if (idx === -1) return false;

    const oldShift = this.shifts[idx];
    this.shifts.splice(idx, 1);

    await repo.addAuditLog({
      action: 'DELETE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: 'SHIFT_' + id,
      details: 'Xóa ca học ' + oldShift.name,
    });

    return true;
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
    this.shifts = [...TIME_SHIFTS].map(s => ({ ...s, isActive: true }));
  }
}
