import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { ClassSection } from '@/types/classroom';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const studentId = searchParams.get('studentId');
  const teacherId = searchParams.get('teacherId');
  const id = searchParams.get('id');
  const classIdsParam = searchParams.get('classIds');
  const all = searchParams.get('all');

  if (id) {
    const sec = await repo.getSectionById(id);
    return NextResponse.json({ section: sec });
  }
  if (all === 'true') {
    const sections = await repo.getAllClassSections();
    return NextResponse.json({ sections });
  }
  if (classIdsParam) {
    const ids = classIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
    const sectionsByClass: Record<string, ClassSection[]> = {};
    for (const cid of ids) {
      sectionsByClass[cid] = await repo.getClassSections(cid);
    }
    return NextResponse.json({ sectionsByClass });
  }
  if (classId) {
    const sections = await repo.getClassSections(classId);
    return NextResponse.json({ sections });
  }
  if (studentId) {
    const sections = await repo.getSectionsByStudentId(studentId);
    return NextResponse.json({ sections });
  }
  if (teacherId) {
    const sections = await repo.getSectionsByTeacherId(teacherId);
    return NextResponse.json({ sections });
  }
  return NextResponse.json({ error: 'Thiếu classId, studentId hoặc teacherId' }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, name, shiftId, startTime, endTime, scheduleDays, teacherId, roomId } = body;
    if (!classId) {
      return NextResponse.json({ error: 'Thiếu classId' }, { status: 400 });
    }
    const cls = await repo.getClassById(classId);
    if (!cls) return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 });

    const existing = await repo.getClassSections(classId);
    const n = existing.length + 1;
    const id = 'SEC_' + classId + '_' + Date.now().toString().slice(-5);
    const startTimeResolved = startTime || cls.startTime || '18:30';
    const endTimeResolved = endTime || cls.endTime || '20:30';
    const section: ClassSection = {
      id,
      classId,
      name: name || 'Ca ' + n + ' (' + startTimeResolved + ' - ' + endTimeResolved + ')',
      shiftId: shiftId !== undefined ? Number(shiftId) : cls.shiftId,
      startTime: startTimeResolved,
      endTime: endTimeResolved,
      scheduleDays: Array.isArray(scheduleDays) ? scheduleDays.map(Number) : (cls.scheduleDays || []),
      teacherId: teacherId || cls.teacherId,
      roomId: roomId || cls.roomId,
      isActive: true,
      studentIds: [],
    };
    await repo.createClassSection(section);
    return NextResponse.json({ success: true, section });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi tạo ca học' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      sectionId,
      name,
      shiftId,
      startTime,
      endTime,
      scheduleDays,
      teacherId,
      roomId,
      isActive,
      syncFutureSlots = true,
      actorId = 'ADMIN001',
    } = body;
    if (!sectionId) return NextResponse.json({ error: 'Thiếu sectionId' }, { status: 400 });
    const sec = await repo.getSectionById(sectionId);
    if (!sec) return NextResponse.json({ error: 'Không tìm thấy ca học' }, { status: 404 });
    const oldTeacherId = sec.teacherId;
    const oldScheduleDays = sec.scheduleDays;
    if (name !== undefined) sec.name = name.trim();
    if (shiftId !== undefined) sec.shiftId = Number(shiftId);
    if (startTime !== undefined) sec.startTime = startTime;
    if (endTime !== undefined) sec.endTime = endTime;
    if (scheduleDays !== undefined && Array.isArray(scheduleDays)) sec.scheduleDays = scheduleDays.map(Number);
    if (teacherId !== undefined) sec.teacherId = teacherId || undefined;
    if (roomId !== undefined) sec.roomId = roomId;
    if (isActive !== undefined) sec.isActive = Boolean(isActive);
    await repo.updateClassSection(sec);

    // Khi đổi giáo viên của một ca: cập nhật assignedClassIds cho giáo viên cũ/mới
    // (chỉ khi chưa có ca nào khác của lớp đó do giáo viên này phụ trách).
    if (teacherId !== undefined && teacherId !== oldTeacherId) {
      const sectionsOfClass = await repo.getClassSections(sec.classId);
      if (teacherId && oldTeacherId && oldTeacherId !== teacherId) {
        const oldTeacher = await repo.getTeacherById(oldTeacherId);
        if (oldTeacher && Array.isArray(oldTeacher.assignedClassIds)) {
          const stillTeachingClass = sectionsOfClass.some(
            (s) => s.id !== sec.id && s.teacherId === oldTeacherId && s.isActive !== false
          );
          if (!stillTeachingClass) {
            oldTeacher.assignedClassIds = oldTeacher.assignedClassIds.filter((cid) => cid !== sec.classId);
            await repo.updateTeacher(oldTeacher);
          }
        }
      }
      if (teacherId) {
        const newTeacher = await repo.getTeacherById(teacherId);
        if (newTeacher) {
          if (!newTeacher.assignedClassIds) newTeacher.assignedClassIds = [];
          if (!newTeacher.assignedClassIds.includes(sec.classId)) {
            newTeacher.assignedClassIds.push(sec.classId);
            await repo.updateTeacher(newTeacher);
          }
        }
      }
    }

    // Đồng bộ các buổi học tương lai thuộc ca này (theo sectionId) lên thông tin mới.
    let syncedSlotsCount = 0;
    if (syncFutureSlots) {
      const today = new Date().toISOString().split('T')[0];
      const allSlots = await repo.getAllScheduleSlots();
      const daysChanged =
        scheduleDays !== undefined &&
        JSON.stringify(scheduleDays.map(Number)) !== JSON.stringify(oldScheduleDays || []);

      for (const slot of allSlots) {
        if (slot.sectionId !== undefined && slot.sectionId !== '' && slot.sectionId !== sec.id) continue;
        // Dữ liệu cũ chưa gắn sectionId: chỉ đồng bộ nếu giờ/phòng/giáo viên khớp ca cũ của lớp.
        if ((slot.sectionId === undefined || slot.sectionId === '') && slot.classId !== sec.classId) continue;
        if (slot.date < today || slot.status === 'Đã hủy') continue;

        let changed = false;
        if (teacherId !== undefined && slot.teacherId !== teacherId) {
          slot.teacherId = teacherId || sec.teacherId || slot.teacherId;
          changed = true;
        }
        if (roomId !== undefined && slot.roomId !== roomId) {
          slot.roomId = roomId;
          changed = true;
        }
        if (startTime !== undefined && slot.startTime !== startTime) {
          slot.startTime = startTime;
          changed = true;
        }
        if (endTime !== undefined && slot.endTime !== endTime) {
          slot.endTime = endTime;
          changed = true;
        }
        if (shiftId !== undefined && slot.shiftId !== Number(shiftId)) {
          slot.shiftId = Number(shiftId);
          changed = true;
        }
        if (slot.sectionId !== sec.id) {
          slot.sectionId = sec.id;
          changed = true;
        }
        if (changed) {
          await repo.updateScheduleSlot(slot);
          syncedSlotsCount++;
        }
      }

      // Khi thay đổi thứ (scheduleDays) của ca: các ngày cũ không còn thuộc ca nữa thì hủy,
      // còn ngày thuộc thứ mới thì để admin lên lịch lại bằng "Lên lịch cho lớp".
      if (daysChanged) {
        for (const slot of allSlots) {
          if (slot.sectionId !== sec.id) continue;
          if (slot.date < today || slot.status === 'Đã hủy') continue;
          const [yyyy, mm, dd] = slot.date.split('-').map(Number);
          const dow = new Date(Date.UTC(yyyy, mm - 1, dd)).getUTCDay();
          const dayOfWeek = dow === 0 ? 8 : dow + 1;
          if (!(sec.scheduleDays || []).includes(dayOfWeek)) {
            slot.status = 'Đã hủy';
            await repo.updateScheduleSlot(slot);
            syncedSlotsCount++;
          }
        }
      }
    }

    await repo.addAuditLog({
      action: 'UPDATE',
      userId: actorId,
      userName: actorId === 'ADMIN001' ? 'Quản trị viên' : actorId,
      userRole: 'ADMIN',
      targetResource: 'CLASS_SECTION',
      targetId: sec.id,
      details: `Cập nhật ca ${sec.id} (${sec.name}) lớp ${sec.classId}; đồng bộ ${syncedSlotsCount} buổi học tương lai`,
    });

    return NextResponse.json({ success: true, section: sec, syncedSlotsCount });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi cập nhật ca học' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const actorId = searchParams.get('actorId') || 'ADMIN001';
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    const sec = await repo.getSectionById(id);
    if (!sec) return NextResponse.json({ error: 'Không tìm thấy ca học' }, { status: 404 });

    // Hủy các buổi học tương lai của ca thay vì xóa cứng, giữ lịch sử.
    const today = new Date().toISOString().split('T')[0];
    const allSlots = await repo.getAllScheduleSlots();
    let cancelledSlotsCount = 0;
    for (const slot of allSlots) {
      if (slot.sectionId !== id) continue;
      if (slot.date < today || slot.status === 'Đã hủy') continue;
      slot.status = 'Đã hủy';
      await repo.updateScheduleSlot(slot);
      cancelledSlotsCount++;
    }

    // Nếu giáo viên của ca không còn ca nào khác trong lớp thì gỡ lớp khỏi assignedClassIds.
    if (sec.teacherId) {
      const remainSections = await repo.getClassSections(sec.classId);
      const stillTeaching = remainSections.some(
        (s) => s.id !== sec.id && s.teacherId === sec.teacherId && s.isActive !== false
      );
      if (!stillTeaching) {
        const teacher = await repo.getTeacherById(sec.teacherId);
        if (teacher && Array.isArray(teacher.assignedClassIds)) {
          teacher.assignedClassIds = teacher.assignedClassIds.filter((cid) => cid !== sec.classId);
          await repo.updateTeacher(teacher);
        }
      }
    }

    await repo.deleteClassSection(id);

    await repo.addAuditLog({
      action: 'DELETE',
      userId: actorId,
      userName: actorId === 'ADMIN001' ? 'Quản trị viên' : actorId,
      userRole: 'ADMIN',
      targetResource: 'CLASS_SECTION',
      targetId: id,
      details: `Xóa ca ${id} (${sec.name}) lớp ${sec.classId}; hủy ${cancelledSlotsCount} buổi học tương lai`,
    });

    return NextResponse.json({ success: true, cancelledSlotsCount });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi xóa ca học' }, { status: 500 });
  }
}
