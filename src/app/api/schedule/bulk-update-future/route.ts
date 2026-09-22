import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { ShiftService } from '@/services/ShiftService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, fromDate, targetShiftId, targetRoomId, targetTeacherId, targetMeetingLink } = body;

    if (!classId || !fromDate) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp classId và fromDate' }, { status: 400 });
    }

    const cls = await repo.getClassById(classId);
    if (!cls) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    let targetShift: any = null;
    if (targetShiftId !== undefined) {
      targetShift = await ShiftService.getShiftById(Number(targetShiftId));
    }

    const allSlots = await repo.getAllScheduleSlots();
    const futureSlots = allSlots.filter(s => s.classId === classId && s.date >= fromDate && s.status !== 'Đã hủy');

    let updatedCount = 0;
    for (const slot of futureSlots) {
      if (targetShiftId !== undefined && targetShift) {
        slot.shiftId = Number(targetShiftId);
        slot.startTime = targetShift.startTime;
        slot.endTime = targetShift.endTime;
      }
      if (targetRoomId) {
        slot.roomId = targetRoomId;
      }
      if (targetTeacherId) {
        slot.teacherId = targetTeacherId;
      }
      if (targetMeetingLink !== undefined) {
        slot.meetingLink = targetMeetingLink;
      }

      await repo.updateScheduleSlot(slot);
      updatedCount++;
    }

    // Cập nhật lại thông tin mặc định của lớp học
    if (targetShiftId !== undefined) cls.shiftId = Number(targetShiftId);
    if (targetRoomId) cls.roomId = targetRoomId;
    if (targetTeacherId) cls.teacherId = targetTeacherId;
    if (targetMeetingLink !== undefined) cls.meetingLink = targetMeetingLink;
    await repo.updateClass(cls);

    await repo.addAuditLog({
      action: 'UPDATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: classId,
      details: `Thay đổi hàng loạt lịch từ ngày ${fromDate} của lớp ${classId} (${cls.name}): ${updatedCount} ca học đã được cập nhật`,
    });

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Đã cập nhật thành công ${updatedCount} ca học từ ngày ${fromDate} của lớp ${cls.name}`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
