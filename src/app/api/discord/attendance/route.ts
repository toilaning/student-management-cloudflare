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

    // Check if this is a single attendance request or batch voice attendance
    const caId = body.ca_id || body.caId || body.slotId || body.scheduleSlotId;
    const checkinTime = body.checkin_time || body.checkinTime || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const method = body.method || 'BOT';

    if (!caId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu ca_id hoặc scheduleSlotId' },
        { status: 400 }
      );
    }

    // Support single check-in payload if provided directly to /api/discord/attendance
    const singleDiscordId = body.discord_id || body.discordId;
    const singleStudentId = body.student_id || body.studentId;

    if (singleDiscordId || singleStudentId) {
      const allStudents = await repo.getAllStudents();
      const student = allStudents.find(
        s => (singleDiscordId && s.discordId === singleDiscordId) || (singleStudentId && s.id === singleStudentId)
      );

      if (!student) {
        return NextResponse.json(
          { success: false, error: 'Tài khoản Discord chưa được liên kết với học sinh' },
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
        id: existing?.id || `ATT_DISCORD_${Date.now()}_${student.id}`,
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
        userName: 'Discord Attendance Bot',
        userRole: 'ADMIN' as any,
        action: 'ATTENDANCE_CHECK',
        targetResource: 'ATTENDANCE',
        targetId: caId,
        details: `Bot điểm danh cho học sinh ${student.name} (${student.id}) lúc ${checkinTime}`,
      });

      return NextResponse.json({
        success: true,
        message: existing ? 'Cập nhật điểm danh thành công' : 'Điểm danh thành công',
        student_name: student.name,
        studentName: student.name,
        checkin_time: checkinTime,
        checkinTime: checkinTime,
        already_checked_in: !!existing,
      });
    }

    // Otherwise, handle batch voice check-in
    const presentDiscordIds: string[] = body.present_discord_ids || body.presentDiscordIds || [];
    const allStudents = await repo.getAllStudents();

    // Determine students belonging to this ca_id/class
    const allSlots = await repo.getAllScheduleSlots();
    const slot = allSlots.find(s => s.id === caId);
    let classId = slot?.classId;
    let enrolledStudents = allStudents.filter(s => classId && s.enrolledClassIds.includes(classId));

    if (enrolledStudents.length === 0) {
      // Fallback: If caId doesn't match a known slot directly or has no enrolled students,
      // use all students who have a discordId or matched discord IDs
      enrolledStudents = allStudents.filter(s => s.discordId && presentDiscordIds.includes(s.discordId));
      if (enrolledStudents.length === 0) {
        enrolledStudents = allStudents.slice(0, 15);
      }
      classId = classId || enrolledStudents[0]?.enrolledClassIds[0] || 'CLS01';
    }

    const presentStudents: { name: string; discord_id?: string; student_id: string }[] = [];
    const absentStudents: { name: string; discord_id?: string; student_id: string }[] = [];
    const recordsToSave: AttendanceRecord[] = [];

    for (const st of enrolledStudents) {
      const isPresent = st.discordId ? presentDiscordIds.includes(st.discordId) : false;
      const rec: AttendanceRecord = {
        id: `ATT_BOT_${caId}_${st.id}`,
        scheduleSlotId: caId,
        classId: classId!,
        studentId: st.id,
        date: slot ? slot.date : checkinTime.substring(0, 10),
        status: isPresent ? 'Có mặt' : 'Vắng không phép',
        checkinTime: isPresent ? checkinTime : undefined,
        method: 'BOT',
        updatedBy: 'ADMIN001',
        updatedAt: new Date().toISOString(),
      };
      recordsToSave.push(rec);

      if (isPresent) {
        presentStudents.push({ name: st.name, discord_id: st.discordId, student_id: st.id });
      } else {
        absentStudents.push({ name: st.name, discord_id: st.discordId, student_id: st.id });
      }
    }

    await repo.saveAttendanceBatch(recordsToSave);

    await repo.addAuditLog({
      userId: 'ADMIN001',
      userName: 'Discord Voice Attendance Bot',
      userRole: 'ADMIN' as any,
      action: 'ATTENDANCE_CHECK',
      targetResource: 'ATTENDANCE',
      targetId: caId,
      details: `Bot điểm danh Voice ca ${caId}: ${presentStudents.length} có mặt, ${absentStudents.length} vắng mặt lúc ${checkinTime}`,
    });

    return NextResponse.json({
      success: true,
      ca_id: caId,
      caId: caId,
      total: enrolledStudents.length,
      present_count: presentStudents.length,
      presentCount: presentStudents.length,
      absent_count: absentStudents.length,
      absentCount: absentStudents.length,
      present_students: presentStudents,
      presentStudents: presentStudents,
      absent_students: absentStudents,
      absentStudents: absentStudents,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý điểm danh Discord' },
      { status: 500 }
    );
  }
}
