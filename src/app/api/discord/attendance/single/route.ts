import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { AttendanceRecord } from '@/types/attendance';
import { verifyDiscordSecret } from '@/lib/discordAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // 1. Authenticate secret token
  const auth = verifyDiscordSecret(request);
  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await request.json();
    const caId = body.ca_id || body.caId || body.slotId || body.scheduleSlotId;
    const discordId = body.discord_id || body.discordId;
    const studentId = body.student_id || body.studentId;
    const checkinTime = body.checkin_time || body.checkinTime || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const method = body.method || 'BOT_BUTTON';

    if (!caId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu ca_id' },
        { status: 400 }
      );
    }

    if (!discordId && !studentId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu discord_id hoặc student_id' },
        { status: 400 }
      );
    }

    // Find student
    const allStudents = await repo.getAllStudents();
    const student = allStudents.find(
      s => (discordId && s.discordId === discordId) || (studentId && s.id === studentId)
    );

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản Discord chưa được liên kết với hồ sơ học sinh' },
        { status: 404 }
      );
    }

    // Find slot or class info
    const allSlots = await repo.getAllScheduleSlots();
    const slot = allSlots.find(s => s.id === caId);
    const classId = slot ? slot.classId : (student.enrolledClassIds[0] || 'CLS01');

    // Check if already checked in
    const existingRecords = await repo.getAttendanceBySlotId(caId);
    const existing = existingRecords.find(r => r.studentId === student.id);

    const record: AttendanceRecord = {
      id: existing?.id || `ATT_BTN_${Date.now()}_${student.id}`,
      scheduleSlotId: caId,
      classId: classId,
      studentId: student.id,
      date: slot ? slot.date : checkinTime.substring(0, 10),
      status: 'Có mặt',
      checkinTime: checkinTime,
      method: 'BOT',
      updatedBy: 'ADMIN001',
      updatedAt: new Date().toISOString(),
    };

    await repo.saveAttendanceRecord(record);

    await repo.addAuditLog({
      userId: 'ADMIN001',
      userName: 'Discord Button Attendance',
      userRole: 'ADMIN' as any,
      action: 'ATTENDANCE_CHECK',
      targetResource: 'ATTENDANCE',
      targetId: caId,
      details: `Học sinh ${student.name} (${student.id}) điểm danh 1-Click qua Discord Button lúc ${checkinTime}`,
    });

    return NextResponse.json({
      success: true,
      message: existing ? 'Bạn đã cập nhật điểm danh thành công' : 'Điểm danh thành công',
      student_name: student.name,
      studentName: student.name,
      checkin_time: checkinTime,
      checkinTime: checkinTime,
      already_checked_in: !!existing,
      previous_checkin_time: existing?.checkinTime,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý điểm danh qua nút bấm' },
      { status: 500 }
    );
  }
}
