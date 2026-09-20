import { NextResponse } from 'next/server';
import { repo } from '@/repositories';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, studentId, action, actorId = 'ADMIN001' } = body;

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
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi xử lý gán lớp' }, { status: 500 });
  }
}
