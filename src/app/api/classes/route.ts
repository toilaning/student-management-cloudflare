import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { BulkScheduleService } from '@/services/BulkScheduleService';
import { ShiftService } from '@/services/ShiftService';
import { ClassSection } from '@/types/classroom';

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
      name,
      subject,
      teacherId,
      // Không mặc định 'ONLINE': giáo viên nhận ca (chỉ gửi classId + teacherId) sẽ vô tình ghi đè phòng thật.
      roomId,
      shiftId,
      startTime,
      endTime,
      scheduleDays,
      isRecurring,
      tuitionFee,
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

    if (name !== undefined) cls.name = name.trim();
    if (subject !== undefined) cls.subject = subject.trim();
    if (tuitionFee !== undefined) cls.tuitionFee = Number(tuitionFee);

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

    if (startTime !== undefined) {
      cls.startTime = startTime;
    }

    if (endTime !== undefined) {
      cls.endTime = endTime;
    }

    if (scheduleDays !== undefined && Array.isArray(scheduleDays)) {
      cls.scheduleDays = scheduleDays.map(Number);
    }

    if (isRecurring !== undefined) {
      cls.isRecurring = Boolean(isRecurring);
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

    // 3. Đồng bộ 2 chiều: Khi Admin đổi teacherId, roomId: roomId || "ONLINE", startTime, endTime, scheduleDays, shiftId, hoặc meetingLink:
    // Quét tất cả ScheduleSlot của lớp đó có date >= today, cập nhật các thuộc tính mới
    const today = new Date().toISOString().split('T')[0];
    const allSlots = await repo.getAllScheduleSlots();
    
    // Tìm thông tin shift nếu shiftId thay đổi mà không có startTime/endTime custom
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

        if (startTime !== undefined && slot.startTime !== startTime) {
          slot.startTime = startTime;
          changed = true;
        }

        if (endTime !== undefined && slot.endTime !== endTime) {
          slot.endTime = endTime;
          changed = true;
        }

        if (shiftId !== undefined) {
          const sNum = Number(shiftId);
          if (slot.shiftId !== sNum) {
            slot.shiftId = sNum;
            if (!startTime && !cls.startTime && shiftInfo) {
              slot.startTime = shiftInfo.startTime;
            }
            if (!endTime && !cls.endTime && shiftInfo) {
              slot.endTime = shiftInfo.endTime;
            }
            changed = true;
          }
        }

        if (cls.subject && slot.subject !== cls.subject) {
          slot.subject = cls.subject;
          changed = true;
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
      subject,
      teacherId,
      roomId,
      shiftId = 1,
      startTime = '18:30',
      endTime = '20:30',
      scheduleDays = [2, 4, 6],
      isRecurring = true,
      tuitionFee = 1500000,
      meetingLink = '',
      autoGenerateSchedule = true,
      generateMonths = 3,
      actorId = 'ADMIN001',
      sections = [],
    } = body;

    if (!name || !subject || !teacherId) {
      return NextResponse.json({ error: 'Vui lòng điền đủ Tên lớp, Môn học và Giảng viên phụ trách' }, { status: 400 });
    }

    const parsedStartTime = (startTime || '18:30').trim();
    const parsedEndTime = (endTime || '20:30').trim();
    const parsedIsRecurring = isRecurring !== undefined ? Boolean(isRecurring) : true;

    // Nếu khung giờ gửi lên khớp đúng một ca mẫu thì dùng ca đó; lớp dùng giờ
    // riêng vẫn giữ shift_id để lọc theo ca, nhưng giao diện luôn ưu tiên giờ thật.
    const shifts = await ShiftService.getAllShifts();
    const matchedShift = shifts.find(
      (s) => s.startTime === parsedStartTime && s.endTime === parsedEndTime
    );
    const resolvedShiftId = matchedShift ? matchedShift.id : Number(shiftId) || 1;

    const allClasses = await repo.getAllClasses();
    const maxNum = allClasses.reduce((max, c) => {
      const match = String(c.id || '').match(/^CLS(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNum = maxNum + 1;
    const newId = `CLS${nextNum.toString().padStart(2, '0')}`;

    const newClass = {
      id: newId,
      name: name.trim(),
      subject: subject.trim(),
      teacherId,
      roomId,
      shiftId: resolvedShiftId,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      scheduleDays: Array.isArray(scheduleDays) ? scheduleDays.map(Number) : [2, 4, 6],
      isRecurring: parsedIsRecurring,
      tuitionFee: Number(tuitionFee) || 0,
      meetingLink: meetingLink?.trim() || '',
      studentIds: [],
      status: 'Đang mở' as const,
      createdAt: new Date().toISOString(),
    };

    await repo.createClass(newClass);

    // Danh sách ca học cần tạo. Ưu tiên ca admin khai báo tường minh (nhiều ca);
    // nếu không có thì tạo 1 ca mặc định kế thừa lịch của lớp.
    const sectionInputs: Array<{
      name?: string;
      shiftId?: number;
      startTime?: string;
      endTime?: string;
      scheduleDays?: number[];
      teacherId?: string;
      roomId?: string;
    }> = Array.isArray(sections) && sections.length > 0
      ? sections
      : [
          {
            name:
              (matchedShift?.name || 'Ca ' + resolvedShiftId) +
              ' (' + parsedStartTime + ' - ' + parsedEndTime + ')',
            shiftId: resolvedShiftId,
            startTime: parsedStartTime,
            endTime: parsedEndTime,
            scheduleDays: newClass.scheduleDays,
            teacherId,
            roomId,
          },
        ];

    const createdSections: ClassSection[] = [];
    for (let i = 0; i < sectionInputs.length; i++) {
      const input = sectionInputs[i];
      const secStart = (input.startTime || parsedStartTime).trim();
      const secEnd = (input.endTime || parsedEndTime).trim();
      const secShiftId = input.shiftId !== undefined ? Number(input.shiftId) : resolvedShiftId;
      const secId = 'SEC_' + newId + '_' + Date.now().toString().slice(-5) + '_' + i;
      const section: ClassSection = {
        id: secId,
        classId: newId,
        name: input.name || 'Ca ' + (i + 1) + ' (' + secStart + ' - ' + secEnd + ')',
        shiftId: secShiftId,
        startTime: secStart,
        endTime: secEnd,
        scheduleDays: Array.isArray(input.scheduleDays) && input.scheduleDays.length > 0
          ? input.scheduleDays.map(Number)
          : newClass.scheduleDays,
        teacherId: input.teacherId || teacherId,
        roomId: input.roomId || roomId,
        isActive: true,
        studentIds: [],
      };
      await repo.createClassSection(section);
      createdSections.push(section);
    }

    // Cập nhật assignedClassIds cho mọi giảng viên phụ trách các ca của lớp.
    const sectionTeacherIds = [...new Set(createdSections.map((s) => s.teacherId).filter(Boolean))] as string[];
    for (const tid of sectionTeacherIds) {
      const teacher = await repo.getTeacherById(tid);
      if (teacher) {
        if (!teacher.assignedClassIds) teacher.assignedClassIds = [];
        if (!teacher.assignedClassIds.includes(newId)) {
          teacher.assignedClassIds.push(newId);
          await repo.updateTeacher(teacher);
        }
      }
    }
    const teacher = await repo.getTeacherById(teacherId);

    await repo.addAuditLog({
      action: 'CREATE',
      userId: actorId,
      userName: actorId === 'ADMIN001' ? 'Quản trị viên' : actorId,
      userRole: 'ADMIN',
      targetResource: 'CLASS',
      targetId: newId,
      details: `Tạo lớp học mới ${newId} - ${newClass.name} phụ trách bởi ${teacher?.name || teacherId}`,
    });

    let bulkScheduleResult = null;
    // Nếu isRecurring = true hoặc autoGenerateSchedule = true: sinh lịch tự động từ ngày hôm nay đến hết generateMonths tháng tới (mặc định 3 tháng)
    const shouldGenerate = parsedIsRecurring || autoGenerateSchedule;
    if (shouldGenerate) {
      const bulkService = new BulkScheduleService(repo);
      const now = new Date();
      const startDate = now.toISOString().split('T')[0];
      const endDateObj = new Date(now);
      const monthsToAdd = Math.max(1, Number(generateMonths) || (parsedIsRecurring ? 3 : 1));
      endDateObj.setMonth(endDateObj.getMonth() + monthsToAdd);
      const endDate = endDateObj.toISOString().split('T')[0];

      // Khi lớp có nhiều ca, không gửi override ở mức lớp để ca nào giữ lịch riêng của ca đó.
      const hasMultipleSections = createdSections.length > 1;
      bulkScheduleResult = await bulkService.generateRecurringSlots({
        classIds: [newId],
        startDate,
        endDate,
        shiftId: hasMultipleSections ? undefined : newClass.shiftId,
        startTime: hasMultipleSections ? undefined : newClass.startTime,
        endTime: hasMultipleSections ? undefined : newClass.endTime,
        scheduleDays: hasMultipleSections ? undefined : newClass.scheduleDays,
        overwriteExisting: false,
        actorId,
      });
    }

    return NextResponse.json({
      success: true,
      class: newClass,
      bulkScheduleResult,
      sectionCount: createdSections.length,
      message: `Tạo lớp ${newClass.name} (${newId}) với ${createdSections.length} ca học thành công!${
        bulkScheduleResult ? ` Đã tự động sinh ${bulkScheduleResult.summary.createdCount} buổi học cho các ngày tới.` : ''
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
      details: `Xóa lớp học ${id} - ${cls.name} và hủy ${cancelledSlotsCount} ca học tương lai (date >= ${today})`,
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
