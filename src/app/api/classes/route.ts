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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, subject, teacherId, roomId, shiftId = 1, scheduleDays = [2, 4, 6], tuitionFee = 1500000, meetingLink = '' } = body;

    if (!name || !code || !subject || !teacherId || !roomId) {
      return NextResponse.json({ error: 'Vui lòng điền đủ Tên lớp, Mã môn, Môn học, Giảng viên và Phòng học' }, { status: 400 });
    }

    const allClasses = await repo.getAllClasses();
    const maxNum = allClasses.reduce((max, c) => {
      const match = String(c.id || '').match(/^CLS(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNum = maxNum + 1;
    const newId = `CLS${nextNum.toString().padStart(2, '0')}`;

    const newClass = {
      id: newId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      subject: subject.trim(),
      teacherId,
      roomId,
      shiftId: Number(shiftId) || 1,
      scheduleDays: Array.isArray(scheduleDays) ? scheduleDays.map(Number) : [2, 4, 6],
      tuitionFee: Number(tuitionFee) || 0,
      meetingLink: meetingLink?.trim() || '',
      studentIds: [],
      status: 'Đang mở' as const,
      createdAt: new Date().toISOString(),
    };

    await repo.createClass(newClass);

    // Cập nhật assignedClassIds của giảng viên
    const teacher = await repo.getTeacherById(teacherId);
    if (teacher) {
      if (!teacher.assignedClassIds) teacher.assignedClassIds = [];
      if (!teacher.assignedClassIds.includes(newId)) {
        teacher.assignedClassIds.push(newId);
        await repo.updateTeacher(teacher);
      }
    }

    await repo.addAuditLog({
      action: 'CREATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'CLASS',
      targetId: newId,
      details: `Tạo lớp học mới ${newId} - ${newClass.name} (${newClass.code}) phụ trách bởi ${teacher?.name || teacherId}`,
    });

    return NextResponse.json({ success: true, class: newClass, message: `Tạo lớp ${newClass.name} (${newId}) thành công!` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi tạo lớp học' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã lớp học cần xóa' }, { status: 400 });
    }

    const cls = await repo.getClassById(id);
    if (!cls) {
      return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    // Bỏ lớp khỏi assignedClassIds của giáo viên
    if (cls.teacherId) {
      const teacher = await repo.getTeacherById(cls.teacherId);
      if (teacher && teacher.assignedClassIds) {
        teacher.assignedClassIds = teacher.assignedClassIds.filter(cid => cid !== id);
        await repo.updateTeacher(teacher);
      }
    }

    await repo.deleteClass(id);

    await repo.addAuditLog({
      action: 'DELETE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'CLASS',
      targetId: id,
      details: `Xóa lớp học ${id} - ${cls.name} (${cls.code})`,
    });

    return NextResponse.json({ success: true, message: `Đã xóa lớp học ${id} (${cls.name}) thành công` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi xóa lớp học' }, { status: 500 });
  }
}
