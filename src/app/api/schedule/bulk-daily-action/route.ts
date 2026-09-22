import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { ShiftService } from '@/services/ShiftService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currentDate, action, targetDate, fromShiftId, toShiftId, targetRoomId, targetTeacherId } = body;

    if (!currentDate || !action) {
      return NextResponse.json({ success: false, error: 'Thiếu currentDate hoặc action' }, { status: 400 });
    }

    const allSlots = await repo.getAllScheduleSlots();
    const daySlots = allSlots.filter(s => s.date === currentDate && s.status !== 'Đã hủy');

    let updatedCount = 0;

    if (action === 'RESCHEDULE_DAY') {
      if (!targetDate) {
        return NextResponse.json({ success: false, error: 'Thiếu targetDate khi dời ngày' }, { status: 400 });
      }
      for (const slot of daySlots) {
        slot.date = targetDate;
        await repo.updateScheduleSlot(slot);
        updatedCount++;
      }
    } else if (action === 'SHIFT_MIGRATION') {
      if (fromShiftId === undefined || toShiftId === undefined) {
        return NextResponse.json({ success: false, error: 'Thiếu fromShiftId hoặc toShiftId' }, { status: 400 });
      }
      const targetShift = await ShiftService.getShiftById(Number(toShiftId));
      if (!targetShift) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy ca học đích' }, { status: 404 });
      }

      for (const slot of daySlots) {
        if (slot.shiftId === Number(fromShiftId)) {
          slot.shiftId = Number(toShiftId);
          slot.startTime = targetShift.startTime;
          slot.endTime = targetShift.endTime;
          await repo.updateScheduleSlot(slot);
          updatedCount++;
        }
      }
    } else if (action === 'ROOM_MIGRATION') {
      if (!targetRoomId) {
        return NextResponse.json({ success: false, error: 'Thiếu targetRoomId' }, { status: 400 });
      }
      for (const slot of daySlots) {
        slot.roomId = targetRoomId;
        await repo.updateScheduleSlot(slot);
        updatedCount++;
      }
    } else if (action === 'CANCEL_DAY') {
      for (const slot of daySlots) {
        slot.status = 'Đã hủy';
        await repo.updateScheduleSlot(slot);
        updatedCount++;
      }
    } else {
      return NextResponse.json({ success: false, error: 'Action không hợp lệ' }, { status: 400 });
    }

    await repo.addAuditLog({
      action: 'UPDATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: 'DAILY_' + currentDate,
      details: `Thao tác hàng loạt trên ngày ${currentDate} (${action}): ${updatedCount} ca học bị ảnh hưởng`,
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Đã thực hiện thành công thao tác ${action} trên ${updatedCount} ca học ngày ${currentDate}`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
