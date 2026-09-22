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

  // Tự động đồng bộ đối soát: Quét tất cả user có role TEACHER, nếu thiếu trong hồ sơ teachers thì tự động bổ sung ngay
  try {
    const allUsers = await repo.getAllUsers();
    const teacherUsers = allUsers.filter(u => u.role === 'TEACHER');
    let existingTeachers = await repo.getAllTeachers();
    const existingTeacherIds = new Set(existingTeachers.map(t => t.id));

    for (const u of teacherUsers) {
      if (!existingTeacherIds.has(u.id)) {
        try {
          const syncedTeacher = {
            id: u.id,
            name: u.name,
            email: u.email || `${u.username}@edu.vn`,
            phone: '0901234567',
            specialty: 'Bộ môn chung',
            hourlyRate: 300000,
            ratePerSession: 250000,
            status: 'Đang dạy' as const,
            assignedClassIds: [],
            createdAt: new Date().toISOString(),
          };
          await repo.createTeacher(syncedTeacher);
          existingTeacherIds.add(u.id);
        } catch (e) {
          console.warn('[AUTO-HEAL-TEACHER] Bỏ qua lỗi đồng bộ hồ sơ cho', u.id, e);
        }
      }
    }
  } catch (healErr) {
    console.warn('[AUTO-HEAL-SYNC-ERROR]:', healErr);
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
      email: email?.trim() || undefined,
      ratePerSession: Number(body.ratePerSession) || 250000,
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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, specialty, phone, email, bio, status } = body;

    if (!id || !name || !specialty) {
      return NextResponse.json({ error: "Vui lòng cung cấp ID, họ tên và chuyên môn" }, { status: 400 });
    }

    const existing = await repo.getTeacherById(id);
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy giảng viên" }, { status: 404 });
    }

    const updatedTeacher = {
      ...existing,
      name,
      specialty,
      phone: phone || existing.phone,
      email: email || existing.email,
      bio: bio !== undefined ? bio : existing.bio,
      status: status || existing.status,
    };
    const updated = await repo.updateTeacher(updatedTeacher);

    // Đồng bộ ngược lại bảng Users nếu có thay đổi tên/email
    try {
      const u = await repo.getUserById(id);
      if (u) {
        let uChanged = false;
        if (name && u.name !== name) { u.name = name; uChanged = true; }
        if (email && u.email !== email) { u.email = email; uChanged = true; }
        if (uChanged) await repo.updateUser(u);
      }
    } catch (err) {
      console.error('[SYNC-TEACHER-TO-USER-ERROR]:', err);
    }

    await repo.addAuditLog({
      action: "UPDATE",
      userId: "ADMIN001",
      userName: "Quản trị viên",
      userRole: "ADMIN",
      targetResource: "TEACHER",
      targetId: id,
      details: "Cập nhật thông tin giảng viên " + id + " - " + name + " (Chuyên môn: " + specialty + ")",
    });

    return NextResponse.json({ success: true, teacher: updated, message: "Cập nhật giảng viên " + id + " thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Lỗi khi cập nhật giảng viên" }, { status: 500 });
  }
}
