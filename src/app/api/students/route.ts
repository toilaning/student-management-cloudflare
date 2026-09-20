import { AuthService } from '@/services/AuthService';
import { NextResponse } from 'next/server';
import { repo } from '@/repositories';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const search = searchParams.get('search')?.toLowerCase();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  if (id) {
    const student = await repo.getStudentById(id);
    if (!student) return NextResponse.json({ student: null });
    const enrolledClasses = await repo.getClassesByStudentId(id);
    return NextResponse.json({
      student: { ...student, enrolledClassIds: enrolledClasses.map(c => c.id) },
    });
  }

  let students = await repo.getAllStudents();
  // Class membership is normalized in the ClassStudents sheet, not duplicated in Students.
  const allClasses = await repo.getAllClasses();
  const classIdsByStudent = new Map<string, string[]>();
  allClasses.forEach(cls => (cls.studentIds || []).forEach(studentId => {
    const ids = classIdsByStudent.get(studentId) || [];
    ids.push(cls.id);
    classIdsByStudent.set(studentId, ids);
  }));
  students = students.map(student => ({
    ...student,
    enrolledClassIds: classIdsByStudent.get(student.id) || [],
  }));
  if (search) {
    students = students.filter(s => 
      s.id.toLowerCase().includes(search) ||
      s.name.toLowerCase().includes(search) ||
      s.phone.includes(search) ||
      s.email.toLowerCase().includes(search)
    );
  }

  const total = students.length;
  const paginated = students.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    students: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, dateOfBirth, gender = 'Nam', phone, email, address, enrolledClassIds = [] } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Vui lòng cung cấp đầy đủ họ tên và số điện thoại' }, { status: 400 });
    }

    const allStudents = await repo.getAllStudents();
    const maxStudentNumber = allStudents.reduce((max, student) => {
      const match = String(student.id || '').match(/^ST(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNum = maxStudentNumber + 1;
    const newId = `ST${nextNum.toString().padStart(3, '0')}`;

    const studentEmail = email?.trim() ? email.trim() : `${newId.toLowerCase()}@student.local`;

    const newStudent = {
      id: newId,
      name,
      dateOfBirth: dateOfBirth || '2008-01-01',
      gender,
      phone,
      email: studentEmail,
      address: address || 'TP. Hồ Chí Minh',
      status: 'Đang học' as const,
      enrolledClassIds,
      createdAt: new Date().toISOString(),
    };

    await repo.createStudent(newStudent);

    // Đồng bộ 2 chiều: Tự động tạo tài khoản người dùng cho học sinh nếu chưa tồn tại
    try {
      const existingUser = await repo.getUserById(newId);
      if (!existingUser) {
        const authService = new AuthService(repo);
        const newUser = {
          id: newId,
          username: newId.toLowerCase(),
          passwordHash: authService.hashPassword('student123'),
          role: 'STUDENT' as const,
          name: newStudent.name,
          email: studentEmail,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        await repo.createUser(newUser);

        await repo.addAuditLog({
          action: 'CREATE',
          userId: 'ADMIN001',
          userName: 'Quản trị viên',
          userRole: 'ADMIN',
          targetResource: 'USER_ACCOUNT',
          targetId: newId,
          details: `Tự động tạo tài khoản người dùng [${newId}] cho học viên ${newStudent.name}`,
        });
      }
    } catch (userSyncErr: any) {
      console.error(`[SYNC-USER-ERROR] Không thể tự động tạo tài khoản cho học viên ${newId}:`, userSyncErr);
    }

    // Gán học sinh vào các lớp nếu có chọn
    for (const classId of enrolledClassIds) {
      const cls = await repo.getClassById(classId);
      if (cls && !cls.studentIds.includes(newId)) {
        cls.studentIds.push(newId);
        await repo.updateClass(cls);
      }
    }

    await repo.addAuditLog({
      action: 'CREATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'STUDENT',
      targetId: newId,
      details: `Thêm học viên mới ${newId} - ${name}`,
    });

    return NextResponse.json({ success: true, student: newStudent, message: `Thêm học viên ${newId} thành công` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi tạo học viên' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã học viên cần xoá' }, { status: 400 });
    }

    const student = await repo.getStudentById(id);
    if (!student) {
      return NextResponse.json({ error: 'Không tìm thấy học viên' }, { status: 404 });
    }

    // Xoá học viên khỏi các lớp học liên quan
    for (const classId of student.enrolledClassIds) {
      const cls = await repo.getClassById(classId);
      if (cls) {
        cls.studentIds = cls.studentIds.filter(stId => stId !== id);
        await repo.updateClass(cls);
      }
    }

    await repo.deleteStudent(id);

    await repo.addAuditLog({
      action: 'DELETE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'STUDENT',
      targetId: id,
      details: `Xoá học viên ${id} - ${student.name}`,
    });

    return NextResponse.json({ success: true, message: `Đã xoá học viên ${id} (${student.name})` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi xoá học viên' }, { status: 500 });
  }
}
