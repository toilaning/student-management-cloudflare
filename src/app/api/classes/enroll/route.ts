import { NextResponse } from 'next/server';
import { repo } from '@/repositories';

export const dynamic = 'force-dynamic';

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
      // Đổi ca trực tiếp phía học sinh: KHÔNG tạo request chờ duyệt, KHÔNG chặn sĩ số.
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

      // Chuyển học sinh: bỏ khỏi lớp cũ, thêm vào lớp đích (KHÔNG kiểm tra sĩ số)
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
