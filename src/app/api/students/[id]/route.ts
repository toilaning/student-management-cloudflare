import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { StudentService } from '@/services/StudentService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const student = await repo.getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Không tìm thấy học sinh' }, { status: 404 });
    }

    const enrolledClasses = await repo.getClassesByStudentId(studentId);
    return NextResponse.json({
      student: {
        ...student,
        enrolledClassIds: enrolledClasses.map(c => c.id),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const body = await request.json();
    const { discordId, discordUsername, actorId, actorRole, phone, email, address, name } = body;

    const student = await repo.getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Không tìm thấy học sinh' }, { status: 404 });
    }

    const studentService = new StudentService(repo);

    // Cập nhật Discord ID / Discord Username
    if (discordId !== undefined || discordUsername !== undefined) {
      await studentService.updateDiscordInfo(studentId, {
        discordId,
        discordUsername,
        actorId,
        actorRole,
      });
    }

    // Cập nhật các trường thông tin cơ bản khác nếu có gửi kèm
    let needUpdate = false;
    if (phone !== undefined) {
      student.phone = phone.trim();
      needUpdate = true;
    }
    if (email !== undefined) {
      student.email = email.trim();
      needUpdate = true;
    }
    if (address !== undefined) {
      student.address = address.trim();
      needUpdate = true;
    }
    if (name !== undefined) {
      student.name = name.trim();
      needUpdate = true;
    }

    if (needUpdate) {
      await repo.updateStudent(student);
    }

    const updatedStudent = await repo.getStudentById(studentId);

    return NextResponse.json({
      success: true,
      student: updatedStudent,
      message: `Cập nhật thông tin học sinh [${studentId}] thành công`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi cập nhật học sinh' }, { status: 500 });
  }
}
