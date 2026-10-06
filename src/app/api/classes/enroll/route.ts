import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { getTodayDateStr, getTodayDateStrByDate, timeToMinutes } from '@/utils/date';
import { TimeShift } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { ShiftService } from '@/services/ShiftService';
import { BulkScheduleService } from '@/services/BulkScheduleService';

export const dynamic = 'force-dynamic';

const DAY_NAMES: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ Nhật',
};

/** Số tháng sinh lịch trước cho lớp mới mở khi học sinh đổi ca. */
const SHIFT_CLASS_MONTHS = 3;

/**
 * Tính khoảng giờ [startMins, endMins] của một lớp.
 * Nếu lớp có startTime/endTime riêng (custom) thì dùng trực tiếp, ngược lại fallback theo shiftId -> ca học trong DB.
 * startMins có thể > endMins cho ca qua nửa đêm.
 */
function getClassTimeRange(
  cls: ClassEntity,
  shifts: TimeShift[],
): { startMins: number; endMins: number; startLabel: string; endLabel: string } | null {
  let startTime: string | undefined = cls.startTime;
  let endTime: string | undefined = cls.endTime;

  if (!startTime || !endTime) {
    const shift = shifts.find(s => s.id === Number(cls.shiftId));
    if (!shift) return null;
    startTime = shift.startTime;
    endTime = shift.endTime;
  }

  return {
    startMins: timeToMinutes(startTime),
    endMins: timeToMinutes(endTime),
    startLabel: startTime,
    endLabel: endTime,
  };
}

/** Hai danh sách ngày học giống nhau (bỏ trùng, không phụ thuộc thứ tự). */
function sameScheduleDays(a: number[] = [], b: number[] = []): boolean {
  const setA = [...new Set(a.map(Number))].sort((x, y) => x - y);
  const setB = [...new Set(b.map(Number))].sort((x, y) => x - y);
  return setA.length === setB.length && setA.every((v, i) => v === setB[i]);
}

/**
 * Kiểm tra ca học target có trùng giờ với bất kỳ lớp nào student đã enrolled hay không.
 * Bỏ qua chính lớp đích và các lớp sẽ rời đi (excludeClassIds).
 * Trả về null nếu không trùng, hoặc đối tượng mô tả lớp bị trùng.
 */
async function findOverlappingEnrollment(
  studentId: string,
  targetClass: ClassEntity,
  shifts: TimeShift[],
  excludeClassIds: string[] = [],
): Promise<{ className: string; dayName: string; startLabel: string; endLabel: string } | null> {
  const targetRange = getClassTimeRange(targetClass, shifts);
  if (!targetRange) return null;

  const skipIds = new Set([targetClass.id, ...excludeClassIds]);
  const student = await repo.getStudentById(studentId);
  const enrolledIds = student?.enrolledClassIds || [];

  const targetDays = new Set(targetClass.scheduleDays || []);

  for (const enrolledId of enrolledIds) {
    if (skipIds.has(enrolledId)) continue;

    const enrolled = await repo.getClassById(enrolledId);
    if (!enrolled) continue;

    // 1. Kiểm tra trùng ngày: phải có ít nhất 1 ngày học chung
    const commonDays = (enrolled.scheduleDays || []).filter(d => targetDays.has(d));
    if (commonDays.length === 0) continue;

    // 2. Kiểm tra trùng giờ
    const enrolledRange = getClassTimeRange(enrolled, shifts);
    if (!enrolledRange) continue;

    const overlap = hasTimeOverlap(
      targetRange.startMins,
      targetRange.endMins,
      enrolledRange.startMins,
      enrolledRange.endMins,
    );

    if (overlap) {
      const firstCommonDay = commonDays[0];
      return {
        className: enrolled.name,
        dayName: DAY_NAMES[firstCommonDay] || `Thứ ${firstCommonDay}`,
        startLabel: enrolledRange.startLabel,
        endLabel: enrolledRange.endLabel,
      };
    }
  }

  return null;
}

/**
 * Xác định 2 khoảng thời gian có trùng nhau hay không, xử lý ca qua nửa đêm.
 * overlap xảy ra khi max(startA, startB) < min(endA, endB).
 * Với ca qua đêm (start > end), coi end = end + 1440.
 */
function hasTimeOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  let aStart = startA;
  let aEnd = endA;
  let bStart = startB;
  let bEnd = endB;

  if (aStart > aEnd) aEnd += 1440;
  if (bStart > bEnd) bEnd += 1440;

  const maxStart = Math.max(aStart, bStart);
  const minEnd = Math.min(aEnd, bEnd);

  return maxStart < minEnd;
}

/** Sinh mã lớp duy nhất cho lớp mới mở ở ca khác (ví dụ C1T2C1 -> C1T2C3). */
function buildShiftClassCode(sourceCode: string, shiftNum: number, takenCodes: string[]): string {
  const taken = new Set(takenCodes.map(c => String(c || '').trim().toUpperCase()));
  const base = String(sourceCode || '').trim().toUpperCase() || 'LOP';

  const candidates: string[] = [];
  const replaced = base.replace(/C(\d+)$/, `C${shiftNum}`);
  if (replaced !== base) candidates.push(replaced);
  candidates.push(`${base}-C${shiftNum}`);

  for (const candidate of candidates) {
    if (!taken.has(candidate)) return candidate;
  }

  const fallbackBase = `${base}-C${shiftNum}`;
  let suffix = 2;
  while (taken.has(`${fallbackBase}-${suffix}`)) suffix++;
  return `${fallbackBase}-${suffix}`;
}

/** Sinh ID lớp kế tiếp theo mẫu CLSxx. */
function buildNextClassId(allClasses: ClassEntity[]): string {
  const maxNum = allClasses.reduce((max, c) => {
    const match = String(c.id || '').match(/^CLS(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `CLS${(maxNum + 1).toString().padStart(2, '0')}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, studentId, action, actorId = 'ADMIN001', targetShiftId } = body;

    if (!classId || !studentId || !action) {
      return NextResponse.json({ error: 'Thiếu thông tin classId, studentId hoặc action' }, { status: 400 });
    }

    const cls = await repo.getClassById(classId);
    if (!cls) {
      return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    const student = await repo.getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Không tìm thấy học viên' }, { status: 404 });
    }

    const shifts = await ShiftService.getAllShifts();

    if (action === 'ENROLL') {
      // Kiểm tra trùng giờ với các lớp khác học sinh đã enrolled (trước khi thực hiện thay đổi)
      const enrollOverlap = await findOverlappingEnrollment(studentId, cls, shifts);
      if (enrollOverlap) {
        return NextResponse.json({
          error: `Ca học này trùng giờ với lớp ${enrollOverlap.className} bạn đã đăng ký (${enrollOverlap.dayName}, ${enrollOverlap.startLabel}-${enrollOverlap.endLabel}). Vui lòng chọn ca khác.`,
        }, { status: 409 });
      }

      if (!cls.studentIds.includes(studentId)) {
        cls.studentIds.push(studentId);
        await repo.updateClass(cls);
      }
      if (!student.enrolledClassIds.includes(classId)) {
        student.enrolledClassIds.push(classId);
        await repo.updateStudent(student);
      }
      await repo.addAuditLog({
        action: 'UPDATE',
        userId: actorId,
        userName: actorId,
        userRole: 'ADMIN',
        targetResource: 'CLASS_ENROLLMENT',
        targetId: classId,
        details: `Thêm học viên ${studentId} (${student.name}) vào lớp ${classId} (${cls.name})`,
      });
      return NextResponse.json({ success: true, message: `Đã thêm học viên ${student.name} vào lớp ${cls.name}` });
    } else if (action === 'UNENROLL') {
      cls.studentIds = cls.studentIds.filter(id => id !== studentId);
      await repo.updateClass(cls);

      student.enrolledClassIds = student.enrolledClassIds.filter(id => id !== classId);
      await repo.updateStudent(student);

      await repo.addAuditLog({
        action: 'UPDATE',
        userId: actorId,
        userName: actorId,
        userRole: 'ADMIN',
        targetResource: 'CLASS_ENROLLMENT',
        targetId: classId,
        details: `Xoá học viên ${studentId} (${student.name}) khỏi lớp ${classId} (${cls.name})`,
      });
      return NextResponse.json({ success: true, message: `Đã xoá học viên ${student.name} khỏi lớp ${cls.name}` });
    } else if (action === 'CHANGE_SHIFT') {
      // Đổi ca trực tiếp phía học sinh: KHÔNG tạo request chờ duyệt.
      // Nếu đã có lớp cùng môn, cùng ngày học ở ca mục tiêu thì chuyển sang lớp đó.
      // Nếu chưa có, hệ thống mở lớp mới cho ca đó rồi chuyển học sinh sang.
      if (targetShiftId === undefined || targetShiftId === null) {
        return NextResponse.json({ error: 'Thiếu thông tin ca mới (targetShiftId)' }, { status: 400 });
      }

      const shiftNum = Number(targetShiftId);
      const targetShift = shifts.find(s => s.id === shiftNum);
      if (!targetShift) {
        return NextResponse.json({ error: 'Ca học bạn chọn không tồn tại trong hệ thống' }, { status: 400 });
      }

      // Học sinh phải đang học lớp hiện tại này
      if (!cls.studentIds.includes(studentId)) {
        return NextResponse.json({ error: 'Học sinh không thuộc lớp này' }, { status: 400 });
      }

      const currentRange = getClassTimeRange(cls, shifts);
      const isSameTimeAsTarget =
        currentRange?.startLabel === targetShift.startTime && currentRange?.endLabel === targetShift.endTime;
      if (isSameTimeAsTarget) {
        return NextResponse.json({ error: 'Bạn đang học đúng ca này rồi. Chọn ca khác nhé.' }, { status: 400 });
      }

      // Tìm lớp đích: cùng môn, cùng ngày học, khác lớp hiện tại, đúng ca mục tiêu
      const subject = (cls.subject || '').trim().toLowerCase();
      const allClasses = await repo.getAllClasses();
      let targetClass: ClassEntity | null = allClasses.find(c =>
        c.id !== classId &&
        (c.subject || '').trim().toLowerCase() === subject &&
        Number(c.shiftId) === shiftNum &&
        sameScheduleDays(c.scheduleDays, cls.scheduleDays)
      ) || null;

      // Lớp đích dự kiến: dùng lớp đang có ở ca này, hoặc tạm lấy khung giờ của ca để kiểm tra trùng.
      const prospectiveTarget: ClassEntity = targetClass || {
        ...cls,
        id: '__SHIFT_TARGET__',
        shiftId: shiftNum,
        startTime: targetShift.startTime,
        endTime: targetShift.endTime,
      };

      // Kiểm tra trùng giờ trước khi tạo lớp, tránh mở lớp thừa khi ca bị chặn.
      const changeOverlap = await findOverlappingEnrollment(studentId, prospectiveTarget, shifts, [classId]);
      if (changeOverlap) {
        return NextResponse.json({
          error: `Ca học này trùng giờ với lớp ${changeOverlap.className} bạn đã đăng ký (${changeOverlap.dayName}, ${changeOverlap.startLabel}-${changeOverlap.endLabel}). Vui lòng chọn ca khác.`,
        }, { status: 409 });
      }

      // Chưa có lớp ở ca này -> mở lớp mới cùng môn/ngày học, giữ nguyên giảng viên và học phí
      let createdClass = false;
      if (!targetClass) {
        const shiftLabel = targetShift.name.split('(')[0].trim() || `Ca ${shiftNum}`;
        const newClass: ClassEntity = {
          id: buildNextClassId(allClasses),
          code: buildShiftClassCode(cls.code, shiftNum, allClasses.map(c => c.code)),
          name: `${cls.name} (${shiftLabel})`,
          subject: cls.subject,
          teacherId: cls.teacherId,
          roomId: cls.roomId,
          shiftId: shiftNum,
          startTime: targetShift.startTime,
          endTime: targetShift.endTime,
          scheduleDays: [...(cls.scheduleDays || [])],
          isRecurring: cls.isRecurring !== undefined ? cls.isRecurring : true,
          tuitionFee: cls.tuitionFee,
          meetingLink: cls.meetingLink || '',
          studentIds: [],
          status: 'Đang mở',
        };

        await repo.createClass(newClass);
        createdClass = true;
        targetClass = newClass;

        // Giảng viên phụ trách thêm lớp mới này
        const teacher = await repo.getTeacherById(newClass.teacherId);
        if (teacher) {
          if (!teacher.assignedClassIds) teacher.assignedClassIds = [];
          if (!teacher.assignedClassIds.includes(newClass.id)) {
            teacher.assignedClassIds.push(newClass.id);
            await repo.updateTeacher(teacher);
          }
        }

        await repo.addAuditLog({
          action: 'CREATE',
          userId: actorId,
          userName: student.name,
          userRole: 'STUDENT',
          targetResource: 'CLASS',
          targetId: newClass.id,
          details: `Mở lớp ${newClass.id} - ${newClass.name} (${newClass.code}) cho học viên ${studentId} đổi ca sang ${shiftLabel}`,
        });

        // Sinh lịch học các tuần tới cho lớp mới để học sinh thấy ngay trong thời khoá biểu
        try {
          const bulkService = new BulkScheduleService(repo);
          const startDate = getTodayDateStr();
          const endDateObj = new Date(`${startDate}T00:00:00+07:00`);
          endDateObj.setMonth(endDateObj.getMonth() + SHIFT_CLASS_MONTHS);
          await bulkService.generateRecurringSlots({
            classIds: [newClass.id],
            startDate,
            endDate: getTodayDateStrByDate(endDateObj),
            shiftId: newClass.shiftId,
            startTime: newClass.startTime,
            endTime: newClass.endTime,
            scheduleDays: newClass.scheduleDays,
            overwriteExisting: false,
            actorId,
          });
        } catch (scheduleError) {
          // Lớp đã tạo thành công; lỗi sinh lịch không nên chặn việc đổi ca.
          console.error('Không sinh được lịch cho lớp mới khi đổi ca:', scheduleError);
        }
      }

      // Chuyển học sinh: bỏ khỏi lớp cũ, thêm vào lớp đích
      cls.studentIds = cls.studentIds.filter(id => id !== studentId);
      await repo.updateClass(cls);

      if (!targetClass.studentIds.includes(studentId)) {
        targetClass.studentIds.push(studentId);
        await repo.updateClass(targetClass);
      }

      // Đồng bộ hồ sơ học sinh với lớp đích: xoá classId cũ, thêm classId mới (đồng bộ như UNENROLL)
      student.enrolledClassIds = student.enrolledClassIds.filter(id => id !== classId);
      if (!student.enrolledClassIds.includes(targetClass.id)) {
        student.enrolledClassIds.push(targetClass.id);
      }
      await repo.updateStudent(student);

      await repo.addAuditLog({
        action: 'SCHEDULE_CHANGE',
        userId: actorId,
        userName: student.name,
        userRole: 'STUDENT',
        targetResource: 'CLASS_ENROLLMENT',
        targetId: classId,
        details: `Học viên ${studentId} (${student.name}) đổi ca từ lớp ${cls.id} (${cls.name}) sang lớp ${targetClass.id} (${targetClass.name}, ca ${shiftNum}) - không cần duyệt`,
      });

      return NextResponse.json({
        success: true,
        message: createdClass
          ? `Đổi ca thành công. Hệ thống đã mở lớp ${targetClass.name} cho ca mới của bạn.`
          : `Đổi ca thành công sang lớp ${targetClass.name} (ca ${shiftNum})`,
        targetClassId: targetClass.id,
        targetShiftId: shiftNum,
        createdClass,
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi xử lý gán lớp' }, { status: 500 });
  }
}
