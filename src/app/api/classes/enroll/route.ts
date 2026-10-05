import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { timeToMinutes } from '@/utils/date';
import { TIME_SHIFTS } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';

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

/**
 * Tính khoảng giờ [startMins, endMins] của một lớp.
 * Nếu lớp có startTime/endTime riêng (custom) thì dùng trực tiếp, ngược lại fallback theo shiftId -> TIME_SHIFTS.
 * startMins có thể > endMins cho ca qua nửa đêm.
 */
function getClassTimeRange(cls: ClassEntity): { startMins: number; endMins: number; startLabel: string; endLabel: string } | null {
  let startTime: string | undefined = cls.startTime;
  let endTime: string | undefined = cls.endTime;

  if (!startTime || !endTime) {
    const shift = TIME_SHIFTS.find(s => s.id === cls.shiftId);
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

/**
 * Kiểm tra ca học target có trùng giờ với bất kỳ lớp nào student đã enrolled hay không.
 * Trả về null nếu không trùng, hoặc đối tượng mô tả lớp bị trùng.
 */
async function findOverlappingEnrollment(
  studentId: string,
  targetClass: ClassEntity,
): Promise<{ className: string; dayName: string; startLabel: string; endLabel: string } | null> {
  const targetRange = getClassTimeRange(targetClass);
  if (!targetRange) return null; // Lớp không có thông tin ca học -> không thể xác định trùng giờ

  const student = await repo.getStudentById(studentId);
  const enrolledIds = student?.enrolledClassIds || [];

  const targetDays = new Set(targetClass.scheduleDays || []);

  for (const enrolledId of enrolledIds) {
    if (enrolledId === targetClass.id) continue; // Bỏ qua chính lớp đang xét

    const enrolled = await repo.getClassById(enrolledId);
    if (!enrolled) continue;

    // 1. Kiểm tra trùng ngày: phải có ít nhất 1 ngày học chung
    const commonDays = (enrolled.scheduleDays || []).filter(d => targetDays.has(d));
    if (commonDays.length === 0) continue;

    // 2. Kiểm tra trùng giờ
    const enrolledRange = getClassTimeRange(enrolled);
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

    if (action === 'ENROLL') {
      // Kiểm tra trùng giờ với các lớp khác học sinh đã enrolled (trước khi thực hiện thay đổi)
      const enrollOverlap = await findOverlappingEnrollment(studentId, cls);
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
      // Tìm lớp cùng môn (subject) đang chạy ca mục tiêu (targetShiftId), rồi chuyển học sinh sang lớp đó.
      if (targetShiftId === undefined || targetShiftId === null) {
        return NextResponse.json({ error: 'Thiếu thông tin ca mới (targetShiftId)' }, { status: 400 });
      }

      const shiftNum = Number(targetShiftId);

      // Học sinh phải đang học lớp hiện tại này
      if (!cls.studentIds.includes(studentId)) {
        return NextResponse.json({ error: 'Học sinh không thuộc lớp này' }, { status: 400 });
      }

      // Tìm lớp đích: cùng subject, khác lớp hiện tại, đúng shift mục tiêu
      const subject = (cls.subject || '').trim().toLowerCase();
      const allClasses = await repo.getAllClasses();
      const targetClass = allClasses.find(c =>
        c.id !== classId &&
        (c.subject || '').trim().toLowerCase() === subject &&
        Number(c.shiftId) === shiftNum
      );

      if (!targetClass) {
        return NextResponse.json({ error: 'Không tìm thấy ca học mục tiêu cùng môn học' }, { status: 404 });
      }

      // Kiểm tra trùng giờ với các lớp khác học sinh đã enrolled (trước khi chuyển)
      const changeOverlap = await findOverlappingEnrollment(studentId, targetClass);
      if (changeOverlap) {
        return NextResponse.json({
          error: `Ca học này trùng giờ với lớp ${changeOverlap.className} bạn đã đăng ký (${changeOverlap.dayName}, ${changeOverlap.startLabel}-${changeOverlap.endLabel}). Vui lòng chọn ca khác.`,
        }, { status: 409 });
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
        userName: actorId,
        userRole: 'STUDENT',
        targetResource: 'CLASS_ENROLLMENT',
        targetId: classId,
        details: `Học viên ${studentId} (${student.name}) đổi ca từ lớp ${cls.id} (${cls.name}) sang lớp ${targetClass.id} (${targetClass.name}, ca ${shiftNum}) - không cần duyệt`,
      });

      return NextResponse.json({
        success: true,
        message: `Đổi ca thành công sang lớp ${targetClass.name} (ca ${shiftNum})`,
        targetClassId: targetClass.id,
        targetShiftId: shiftNum,
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi xử lý gán lớp' }, { status: 500 });
  }
}
