import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { StudentService } from '@/services/StudentService';

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

  // Tự động đồng bộ đối soát: Quét tất cả user có role STUDENT, nếu thiếu trong hồ sơ students thì tự động bổ sung ngay
  try {
    const allUsers = await repo.getAllUsers();
    const studentUsers = allUsers.filter(u => u.role === 'STUDENT');
    let existingStudents = await repo.getAllStudents();
    const existingStudentIds = new Set(existingStudents.map(s => s.id));

    for (const u of studentUsers) {
      if (!existingStudentIds.has(u.id)) {
        try {
          const syncedStudent = {
            id: u.id,
            name: u.name,
            email: u.email || `${u.username}@student.local`,
            phone: '0900000000',
            dateOfBirth: '2008-01-01',
            gender: 'Nam' as const,
            address: 'TP. Hồ Chí Minh',
            status: 'Đang học' as const,
            enrolledClassIds: [],
            createdAt: new Date().toISOString(),
          };
          await repo.createStudent(syncedStudent);
          existingStudentIds.add(u.id);
        } catch (e) {
          console.warn('[AUTO-HEAL-STUDENT] Bỏ qua lỗi đồng bộ hồ sơ cho', u.id, e);
        }
      }
    }
  } catch (healErr) {
    console.warn('[AUTO-HEAL-SYNC-ERROR]:', healErr);
  }

  let students = await repo.getAllStudents();
  // Class membership is normalized in the ClassStudents sheet, không trùng lặp trong Students.
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
      (s.phone && s.phone.includes(search)) ||
      (s.email && s.email.toLowerCase().includes(search)) ||
      (s.discordId && s.discordId.includes(search)) ||
      (s.discordUsername && s.discordUsername.toLowerCase().includes(search))
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
    const {
      name,
      phone,
      discordId,
      discordUsername,
      dateOfBirth,
      gender = 'Nam',
      email,
      address,
      enrolledClassIds = [],
      fastOnboarding = false,
      actorId = 'ADMIN001',
      actorName = 'Quản trị viên',
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Vui lòng cung cấp họ và tên học sinh' }, { status: 400 });
    }

    const studentService = new StudentService(repo);

    // Hỗ trợ Fast Onboarding hoặc Full Form
    const result = await studentService.createStudentFastOnboarding({
      name: name.trim(),
      phone: phone || '',
      discordId,
      discordUsername,
      actorId,
      actorName,
    });

    const student = result.student;

    // Nếu form gửi các trường mở rộng (ngày sinh, giới tính, địa chỉ, lớp học...)
    let updatedDetails = false;
    if (dateOfBirth && dateOfBirth !== '2008-01-01') {
      student.dateOfBirth = dateOfBirth;
      updatedDetails = true;
    }
    if (gender && gender !== 'Nam') {
      student.gender = gender;
      updatedDetails = true;
    }
    if (address && address !== 'TP. Hồ Chí Minh') {
      student.address = address;
      updatedDetails = true;
    }
    if (email && email.trim()) {
      student.email = email.trim();
      updatedDetails = true;
    }

    if (updatedDetails) {
      await repo.updateStudent(student);
    }

    // Gán học sinh vào các lớp nếu có chọn
    if (enrolledClassIds && Array.isArray(enrolledClassIds) && enrolledClassIds.length > 0) {
      for (const classId of enrolledClassIds) {
        const cls = await repo.getClassById(classId);
        if (cls && !cls.studentIds.includes(student.id)) {
          cls.studentIds.push(student.id);
          await repo.updateClass(cls);
        }
      }
      student.enrolledClassIds = enrolledClassIds;
    }

    return NextResponse.json({
      success: true,
      student,
      defaultPassword: result.defaultPassword,
      message: `Thêm học viên ${student.id} (${student.name}) thành công`,
    });
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
    for (const classId of student.enrolledClassIds || []) {
      const cls = await repo.getClassById(classId);
      if (cls) {
        cls.studentIds = cls.studentIds.filter(stId => stId !== id);
        await repo.updateClass(cls);
      }
    }

    await repo.deleteStudent(id);

    // Cũng có thể xóa hoặc khóa tài khoản user tương ứng nếu có
    try {
      await repo.deleteUser(id);
    } catch (e) {
      // bỏ qua nếu không có user
    }

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
