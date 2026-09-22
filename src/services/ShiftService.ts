import { TimeShift, TIME_SHIFTS } from '../types/schedule';
import { repo } from '../repositories';

export class ShiftService {
  public static async getAllShifts(): Promise<TimeShift[]> {
    return repo.getAllTimeShifts();
  }

  public static async getShiftById(id: number): Promise<TimeShift | null> {
    return repo.getTimeShiftById(id);
  }

  public static async updateShift(
    id: number,
    data: { shiftId?: number; startTime?: string; endTime?: string; name?: string; isActive?: boolean }
  ): Promise<TimeShift | null> {
    const targetId = data.shiftId !== undefined ? Number(data.shiftId) : id;
    const old = await repo.getTimeShiftById(targetId);
    if (!old) return null;

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

    await repo.updateTimeShift(updated);

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
    const all = await repo.getAllTimeShifts();
    let nextId: number;
    if (data.shiftNumber !== undefined && Number(data.shiftNumber) > 0) {
      nextId = Number(data.shiftNumber);
    } else {
      nextId = all.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    }

    const newShift: TimeShift = {
      id: nextId,
      name: data.name || ('Ca ' + nextId),
      startTime: data.startTime,
      endTime: data.endTime,
      durationHours: this.calcDuration(data.startTime, data.endTime),
      isActive: data.isActive !== undefined ? data.isActive : true,
    };

    await repo.createTimeShift(newShift);

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
    const old = await repo.getTimeShiftById(id);
    if (!old) return false;

    const ok = await repo.deleteTimeShift(id);
    if (ok) {
      await repo.addAuditLog({
        action: 'DELETE',
        userId: 'ADMIN001',
        userName: 'Quản trị viên',
        userRole: 'ADMIN',
        targetResource: 'SCHEDULE',
        targetId: 'SHIFT_' + id,
        details: 'Xóa ca học ' + old.name,
      });
    }
    return ok;
  }

  /**
   * Áp dụng Presets cấu hình nhanh số ca
   */
  public static async bulkUpdateShifts(newShifts: TimeShift[], syncFutureSlots: boolean = true): Promise<{ updatedShifts: TimeShift[], syncedSlotsCount: number }> {
    const current = await repo.getAllTimeShifts();
    const currentIds = new Set(current.map(s => s.id));
    const newIds = new Set(newShifts.map(s => s.id));

    // Xóa các ca không còn trong danh sách mới
    for (const s of current) {
      if (!newIds.has(s.id)) {
        await repo.deleteTimeShift(s.id);
      }
    }

    // Tạo hoặc cập nhật
    for (const s of newShifts) {
      if (currentIds.has(s.id)) {
        await repo.updateTimeShift(s);
      } else {
        await repo.createTimeShift(s);
      }
    }

    let syncedSlotsCount = 0;
    if (syncFutureSlots) {
      const today = new Date().toISOString().split('T')[0];
      const allSlots = await repo.getAllScheduleSlots();
      const futureSlots = allSlots.filter(slot => slot.date >= today && slot.status !== 'Đã hủy');
      const shiftMap = new Map(newShifts.map(s => [s.id, s]));

      for (const slot of futureSlots) {
        const matchingShift = shiftMap.get(slot.shiftId);
        if (matchingShift) {
          if (slot.startTime !== matchingShift.startTime || slot.endTime !== matchingShift.endTime) {
            slot.startTime = matchingShift.startTime;
            slot.endTime = matchingShift.endTime;
            await repo.updateScheduleSlot(slot);
            syncedSlotsCount++;
          }
        }
      }
    }

    await repo.addAuditLog({
      action: 'UPDATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: 'SHIFTS_BATCH',
      details: `Cập nhật hàng loạt ${newShifts.length} ca học, đồng bộ tự động ${syncedSlotsCount} ca học tương lai`,
    });

    return { updatedShifts: newShifts, syncedSlotsCount };
  }

  public static async applyPreset(presetType: '3_SHIFTS' | '2_SHIFTS' | '5_SHIFTS'): Promise<TimeShift[]> {
    const current = await repo.getAllTimeShifts();
    for (const s of current) {
      await repo.deleteTimeShift(s.id);
    }

    let presetShifts: TimeShift[] = [];
    if (presetType === '3_SHIFTS') {
      presetShifts = [
        { id: 1, name: 'Ca Sáng', startTime: '08:00', endTime: '11:00', durationHours: 3.0, isActive: true },
        { id: 2, name: 'Ca Chiều', startTime: '14:00', endTime: '17:00', durationHours: 3.0, isActive: true },
        { id: 3, name: 'Ca Tối', startTime: '18:30', endTime: '21:30', durationHours: 3.0, isActive: true },
      ];
    } else if (presetType === '2_SHIFTS') {
      presetShifts = [
        { id: 1, name: 'Ca Sáng', startTime: '08:30', endTime: '11:30', durationHours: 3.0, isActive: true },
        { id: 2, name: 'Ca Tối', startTime: '18:30', endTime: '21:30', durationHours: 3.0, isActive: true },
      ];
    } else {
      presetShifts = [...TIME_SHIFTS].map(s => ({ ...s, isActive: true }));
    }

    for (const s of presetShifts) {
      await repo.createTimeShift(s);
    }

    await repo.addAuditLog({
      action: 'UPDATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: 'PRESET_' + presetType,
      details: 'Áp dụng mẫu cấu hình khung giờ: ' + presetType + ' (' + presetShifts.length + ' ca/ngày)',
    });

    return presetShifts;
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

  public static async resetDefaults(): Promise<void> {
    await this.applyPreset('5_SHIFTS');
  }
}
