import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { BulkScheduleService } from '@/services/BulkScheduleService';
import { ShiftService } from '@/services/ShiftService';

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
    const {
      classId,
      teacherId,
      roomId,
      shiftId,
      meetingLink,
      actorId = 'ADMIN001'
    } = body;

    if (!classId) {
      return NextResponse.json({ error: 'Thiếu thông tin classId' }, { status: 400 });
    }

    const cls = await repo.getClassById(classId);
    if (!cls) {
      return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    let oldTeacherId = cls.teacherId;
    let newTeacher = null;

    if (teacherId && teacherId !== oldTeacherId) {
      newTeacher = await repo.getTeacherById(teacherId);
      if (!newTeacher) {
        return NextResponse.json({ error: 'Không tìm thấy giảng viên được chỉ định' }, { status: 404 });
      }
      cls.teacherId = teacherId;
    }

    if (roomId !== undefined) {
      cls.roomId = roomId;
    }

    if (shiftId !== undefined) {
      cls.shiftId = Number(shiftId);
    }

    if (meetingLink !== undefined) {
      cls.meetingLink = meetingLink;
    }

    await repo.updateClass(cls);

    // 2. Cập nhật danh sách assignedClassIds của giáo viên cũ và mới (nếu đổi GV)
    if (teacherId && teacherId !== oldTeacherId && newTeacher) {
      if (oldTeacherId) {
        const oldTeacher = await repo.getTeacherById(oldTeacherId);
        if (oldTeacher && oldTeacher.assignedClassIds) {
          oldTeacher.assignedClassIds = oldTeacher.assignedClassIds.filter(cid => cid !== classId);
          await repo.updateTeacher(oldTeacher);
        }
      }

      if (!newTeacher.assignedClassIds) newTeacher.assignedClassIds = [];
      if (!newTeacher.assignedClassIds.includes(classId)) {
        newTeacher.assignedClassIds.push(classId);
        await repo.updateTeacher(newTeacher);
      }
    }

    // 3. Đồng bộ 2 chiều: Khi Admin đổi teacherId, roomId, shiftId, hoặc meetingLink:
    // Quét tất cả ScheduleSlot của lớp đó có date >= today, cập nhật các thuộc tính mới
    const today = new Date().toISOString().split('T')[0];
    const allSlots = await repo.getAllScheduleSlots();
    
    // Tìm thông tin shift nếu shiftId thay đổi
    let shiftInfo = undefined;
    if (shiftId !== undefined) {
      const shifts = await ShiftService.getAllShifts();
      shiftInfo = shifts.find(s => s.id === Number(shiftId));
    }

    let syncedSlotsCount = 0;
    for (const slot of allSlots) {
      if (slot.classId === classId && slot.date >= today && slot.status !== 'Đã hủy') {
        let changed = false;

        if (teacherId !== undefined && slot.teacherId !== teacherId) {
          slot.teacherId = teacherId;
          changed = true;
        }

        if (roomId !== undefined && slot.roomId !== roomId) {
          slot.roomId = roomId;
          changed = true;
        }

        if (shiftId !== undefined) {
          const sNum = Number(shiftId);
          if (slot.shiftId !== sNum) {
            slot.shiftId = sNum;
            if (shiftInfo) {
              slot.startTime = shiftInfo.startTime;
              slot.endTime = shiftInfo.endTime;
            }
            changed = true;
          }
        }

        if (meetingLink !== undefined && slot.meetingLink !== meetingLink) {
          slot.meetingLink = meetingLink;
          changed = true;
        }

        if (changed) {
          await repo.updateScheduleSlot(slot);
          syncedSlotsCount++;
        }
      }
    }

    // 4. Ghi Audit Log
    await repo.addAuditLog({
      action: 'UPDATE',
      userId: actorId,
      userName: actorId === 'ADMIN001' ? 'Quản trị viên' : actorId,
      userRole: 'ADMIN',
      targetResource: 'CLASS_ASSIGNMENT',
      targetId: classId,
      details: `Cập nhật lớp ${classId} (${cls.name}) và đồng bộ ${syncedSlotsCount} ca học tương lai (date >= ${today})`,
    });

    return NextResponse.json({
      success: true,
      class: cls,
      syncedSlotsCount,
      message: `Đã cập nhật lớp ${cls.name} và đồng bộ ${syncedSlotsCount} ca học tương lai`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi cập nhật lớp học' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      subject,
      teacherId,
      roomId,
      shiftId = 1,
      scheduleDays = [2, 4, 6],
      tuitionFee = 1500000,
      meetingLink = '',
      autoGenerateSchedule = false,
      generateMonths = 1,
      actorId = 'ADMIN001',
    } = body;

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
      userId: actorId,
      userName: actorId === 'ADMIN001' ? 'Quản trị viên' : actorId,
      userRole: 'ADMIN',
      targetResource: 'CLASS',
      targetId: newId,
      details: `Tạo lớp học mới ${newId} - ${newClass.name} (${newClass.code}) phụ trách bởi ${teacher?.name || teacherId}`,
    });

    let bulkScheduleResult = null;
    // Nếu autoGenerateSchedule = true: sinh lịch tự động từ ngày hôm nay/ngày mai đến hết generateMonths tháng tới
    if (autoGenerateSchedule) {
      const bulkService = new BulkScheduleService(repo);
      const now = new Date();
      // Bắt đầu từ hôm nay
      const startDate = now.toISOString().split('T')[0];
      const endDateObj = new Date(now);
      const monthsToAdd = Math.max(1, Number(generateMonths) || 1);
      endDateObj.setMonth(endDateObj.getMonth() + monthsToAdd);
      const endDate = endDateObj.toISOString().split('T')[0];

      bulkScheduleResult = await bulkService.generateRecurringSlots({
        classIds: [newId],
        startDate,
        endDate,
        shiftId: newClass.shiftId,
        scheduleDays: newClass.scheduleDays,
        overwriteExisting: false,
        actorId,
      });
    }

    return NextResponse.json({
      success: true,
      class: newClass,
      bulkScheduleResult,
      message: `Tạo lớp ${newClass.name} (${newId}) thành công!${
        bulkScheduleResult ? ` Đã sinh tự động ${bulkScheduleResult.summary.createdCount} ca học.` : ''
      }`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi tạo lớp học' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const actorId = searchParams.get('actorId') || 'ADMIN001';

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

    // Tự động xóa (hoặc đánh dấu 'Đã hủy') tất cả ScheduleSlot của lớp đó có date >= today
    const today = new Date().toISOString().split('T')[0];
    const allSlots = await repo.getAllScheduleSlots();
    let cancelledSlotsCount = 0;

    for (const slot of allSlots) {
      if (slot.classId === id && slot.date >= today && slot.status !== 'Đã hủy') {
        slot.status = 'Đã hủy';
        await repo.updateScheduleSlot(slot);
        cancelledSlotsCount++;
      }
    }

    await repo.deleteClass(id);

    await repo.addAuditLog({
      action: 'DELETE',
      userId: actorId,
      userName: actorId === 'ADMIN001' ? 'Quản trị viên' : actorId,
      userRole: 'ADMIN',
      targetResource: 'CLASS',
      targetId: id,
      details: `Xóa lớp học ${id} - ${cls.name} (${cls.code}) và hủy ${cancelledSlotsCount} ca học tương lai (date >= ${today})`,
    });

    return NextResponse.json({
      success: true,
      cancelledSlotsCount,
      message: `Đã xóa lớp học ${id} (${cls.name}) và hủy ${cancelledSlotsCount} ca học tương lai thành công`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi xóa lớp học' }, { status: 500 });
  }
}
