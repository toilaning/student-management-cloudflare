import { repo } from '@/repositories';
import { NextResponse } from 'next/server';
import { ConflictEngine } from '@/services/ConflictEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const studentId = searchParams.get('studentId');
  const classId = searchParams.get('classId');
  const date = searchParams.get('date');

  let slots = await repo.getAllScheduleSlots();
  // Enrich normalized schedule rows with class-owned subject and Discord Room URL.
  const allClasses = await repo.getAllClasses();
  const classMap = new Map(allClasses.map(cls => [cls.id, cls]));
  slots = slots.map(slot => {
    const cls = classMap.get(slot.classId);
    return {
      ...slot,
      subject: slot.subject || cls?.subject || cls?.name || '',
      meetingLink: slot.meetingLink || cls?.meetingLink || '',
    };
  });
  if (teacherId) {
    slots = slots.filter(s => s.teacherId === teacherId);
  }
  if (classId) {
    slots = slots.filter(s => s.classId === classId);
  }
  if (studentId) {
    const studentClasses = await repo.getClassesByStudentId(studentId);
    const classIds = new Set(studentClasses.map(c => c.id));
    slots = slots.filter(s => classIds.has(s.classId));
  }
  if (date) {
    slots = slots.filter(s => s.date === date);
  }

  return NextResponse.json({ slots });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const conflictEngine = new ConflictEngine(repo);
    const conflictResult = await conflictEngine.checkScheduleConflict(body, body.id);

    if (conflictResult.hasConflict) {
      return NextResponse.json({ 
        success: false, 
        error: conflictResult.message,
        conflicts: conflictResult.conflicts 
      }, { status: 400 });
    }

    let saved;
    if (body.id) {
      saved = await repo.updateScheduleSlot(body);
      await repo.addAuditLog({
        action: 'UPDATE',
        userId: 'ADMIN001',
        userName: 'Quản trị viên',
        userRole: 'ADMIN',
        targetResource: 'SCHEDULE',
        targetId: body.id,
        details: `Cập nhật nhanh ca học ${body.id} - Lớp ${body.classId} (${body.date} Ca ${body.shiftId})`,
      });
    } else {
      const allSlots = await repo.getAllScheduleSlots();
      const maxScheduleNumber = allSlots.reduce((max, slot) => {
        const match = String(slot.id || '').match(/^SCH(\d+)$/i);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0);
      const newId = `SCH${(maxScheduleNumber + 1).toString().padStart(4, '0')}`;
      saved = await repo.createScheduleSlot({ ...body, id: newId });
      await repo.addAuditLog({
        action: 'CREATE',
        userId: 'ADMIN001',
        userName: 'Quản trị viên',
        userRole: 'ADMIN',
        targetResource: 'SCHEDULE',
        targetId: newId,
        details: `Tạo mới ca học ${newId} - Lớp ${body.classId} (${body.date} Ca ${body.shiftId})`,
      });
    }

    return NextResponse.json({ success: true, slot: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã ca học cần xoá' }, { status: 400 });
    }

    const slot = await repo.getScheduleSlotById(id);
    if (!slot) {
      return NextResponse.json({ error: 'Không tìm thấy ca học' }, { status: 404 });
    }

    slot.status = 'Đã hủy';
    await repo.updateScheduleSlot(slot);

    await repo.addAuditLog({
      action: 'DELETE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'SCHEDULE',
      targetId: id,
      details: `Hủy ca học ${id} của lớp ${slot.classId} ngày ${slot.date}`,
    });

    return NextResponse.json({ success: true, message: `Đã hủy ca học ${id}` });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi khi hủy ca học' }, { status: 500 });
  }
}
