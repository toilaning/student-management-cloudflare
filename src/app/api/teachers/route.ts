import { NextResponse } from 'next/server';
import { repo } from '@/repositories';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const teacher = await repo.getTeacherById(id);
    return NextResponse.json({ teacher });
  }

  const teachers = await repo.getAllTeachers();
  return NextResponse.json({ teachers });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, specialty, hourlyRate = 300000, phone, email, bio } = body;

    if (!name || !specialty || !phone) {
      return NextResponse.json({ error: 'Vui lòng điền đủ họ tên, chuyên môn và số điện thoại' }, { status: 400 });
    }

    const allTeachers = await repo.getAllTeachers();
    const maxTeacherNumber = allTeachers.reduce((max, teacher) => {
      const match = String(teacher.id || '').match(/^GV(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNum = maxTeacherNumber + 1;
    const newId = `GV${nextNum.toString().padStart(3, '0')}`;

    const newTeacher = {
      id: newId,
      name,
      specialty,
      hourlyRate: Number(hourlyRate) || 300000,
      phone,
      email: email?.trim() ? email.trim() : `${newId.toLowerCase()}@teacher.local`,
      bio: bio || `Giảng viên phụ trách bộ môn ${specialty}`,
      status: 'Đang dạy' as const,
      assignedClassIds: [],
      createdAt: new Date().toISOString(),
    };

    await repo.createTeacher(newTeacher);

    await repo.addAuditLog({
      action: 'CREATE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'TEACHER',
      targetId: newId,
      details: `Thêm giảng viên mới ${newId} - ${name} (${specialty})`,
    });

    return NextResponse.json({ success: true, teacher: newTeacher, message: `Thêm giảng viên ${newId} thành công` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi tạo giảng viên' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã giảng viên cần xoá' }, { status: 400 });
    }

    const teacher = await repo.getTeacherById(id);
    if (!teacher) {
      return NextResponse.json({ error: 'Không tìm thấy giảng viên' }, { status: 404 });
    }

    await repo.deleteTeacher(id);

    await repo.addAuditLog({
      action: 'DELETE',
      userId: 'ADMIN001',
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'TEACHER',
      targetId: id,
      details: `Xoá giảng viên ${id} - ${teacher.name}`,
    });

    return NextResponse.json({ success: true, message: `Đã xoá giảng viên ${id} (${teacher.name})` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Lỗi khi xoá giảng viên' }, { status: 500 });
  }
}
