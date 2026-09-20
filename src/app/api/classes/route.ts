import { NextResponse } from 'next/server';
import { repo } from '@/repositories';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const studentId = searchParams.get('studentId');
  const id = searchParams.get('id');

  if (id) {
    const cls = await repo.getClassById(id);
    return NextResponse.json({ class: cls });
  }

  let classes = await repo.getAllClasses();
  if (teacherId) {
    classes = classes.filter(c => c.teacherId === teacherId);
  }
  if (studentId) {
    classes = classes.filter(c => c.studentIds.includes(studentId));
  }

  return NextResponse.json({ classes });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { classId, teacherId, meetingLink, actorId = 'ADMIN001' } = body;

    if (!classId) {
      return NextResponse.json({ error: 'Thiếu thông tin classId' }, { status: 400 });
    }

    const cls = await repo.getClassById(classId);
    if (!cls) {
      return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    const newTeacher = await repo.getTeacherById(teacherId);
    if (!newTeacher) {
      return NextResponse.json({ error: 'Không tìm thấy giảng viên được chỉ định' }, { status: 404 });
    }

    let oldTeacherId = cls.teacherId;

    if (meetingLink !== undefined) {
      cls.meetingLink = meetingLink;
    }

    if (teacherId && teacherId !== oldTeacherId) {
      const newTeacher = await repo.getTeacherById(teacherId);
      if (!newTeacher) {
        return NextResponse.json({ error: 'Không tìm thấy giảng viên được chỉ định' }, { status: 404 });
      }
      cls.teacherId = teacherId;
    }

    await repo.updateClass(cls);

    // 2. Cập nhật danh sách assignedClassIds của giáo viên cũ và mới
    if (oldTeacherId && oldTeacherId !== teacherId) {
      const oldTeacher = await repo.getTeacherById(oldTeacherId);
      if (oldTeacher) {
        oldTeacher.assignedClassIds = oldTeacher.assignedClassIds.filter(cid => cid !== classId);
        await repo.updateTeacher(oldTeacher);
      }
    }

    if (!newTeacher.assignedClassIds.includes(classId)) {
      newTeacher.assignedClassIds.push(classId);
      await repo.updateTeacher(newTeacher);
    }

    // 3. Đồng bộ cập nhật teacherId và meetingLink cho các ScheduleSlots thuộc lớp học này
    const allSlots = await repo.getAllScheduleSlots();
    for (const slot of allSlots) {
      if (slot.classId === classId) {
        if (teacherId) slot.teacherId = teacherId;
        if (meetingLink !== undefined) slot.meetingLink = meetingLink;
        await repo.updateScheduleSlot(slot);
      }
    }

    // 4. Ghi Audit Log
    await repo.addAuditLog({
      action: 'UPDATE',
      userId: actorId,
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'CLASS_ASSIGNMENT',
      targetId: classId,
      details: `Đổi giáo viên phụ trách lớp ${classId} (${cls.name}) từ ${oldTeacherId} sang ${teacherId} (${newTeacher.name})`,
    });

    return NextResponse.json({
      success: true,
      class: cls,
      message: `Đã đổi giáo viên phụ trách lớp ${cls.name} sang ${newTeacher.name} (${teacherId})`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi cập nhật giáo viên phụ trách lớp' }, { status: 500 });
  }
}
