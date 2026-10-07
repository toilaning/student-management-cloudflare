import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { ClassSection } from '@/types/classroom';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  const studentId = searchParams.get('studentId');
  const id = searchParams.get('id');

  if (id) {
    const sec = await repo.getSectionById(id);
    return NextResponse.json({ section: sec });
  }
  if (classId) {
    const sections = await repo.getClassSections(classId);
    return NextResponse.json({ sections });
  }
  if (studentId) {
    const sections = await repo.getSectionsByStudentId(studentId);
    return NextResponse.json({ sections });
  }
  return NextResponse.json({ error: 'Thiếu classId hoặc studentId' }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, name, shiftId, startTime, endTime, scheduleDays, teacherId, roomId } = body;
    if (!classId) {
      return NextResponse.json({ error: 'Thiếu classId' }, { status: 400 });
    }
    const cls = await repo.getClassById(classId);
    if (!cls) return NextResponse.json({ error: 'Không tìm thấy lớp học' }, { status: 404 });

    const existing = await repo.getClassSections(classId);
    const n = existing.length + 1;
    const id = 'SEC_' + classId + '_' + Date.now().toString().slice(-5);
    const startTimeResolved = startTime || cls.startTime || '18:30';
    const endTimeResolved = endTime || cls.endTime || '20:30';
    const section: ClassSection = {
      id,
      classId,
      name: name || 'Ca ' + n + ' (' + startTimeResolved + ' - ' + endTimeResolved + ')',
      shiftId: shiftId !== undefined ? Number(shiftId) : cls.shiftId,
      startTime: startTimeResolved,
      endTime: endTimeResolved,
      scheduleDays: Array.isArray(scheduleDays) ? scheduleDays.map(Number) : (cls.scheduleDays || []),
      teacherId: teacherId || cls.teacherId,
      roomId: roomId || cls.roomId,
      isActive: true,
      studentIds: [],
    };
    await repo.createClassSection(section);
    return NextResponse.json({ success: true, section });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi tạo ca học' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sectionId, name, shiftId, startTime, endTime, scheduleDays, teacherId, roomId, isActive } = body;
    if (!sectionId) return NextResponse.json({ error: 'Thiếu sectionId' }, { status: 400 });
    const sec = await repo.getSectionById(sectionId);
    if (!sec) return NextResponse.json({ error: 'Không tìm thấy ca học' }, { status: 404 });
    if (name !== undefined) sec.name = name.trim();
    if (shiftId !== undefined) sec.shiftId = Number(shiftId);
    if (startTime !== undefined) sec.startTime = startTime;
    if (endTime !== undefined) sec.endTime = endTime;
    if (scheduleDays !== undefined && Array.isArray(scheduleDays)) sec.scheduleDays = scheduleDays.map(Number);
    if (teacherId !== undefined) sec.teacherId = teacherId;
    if (roomId !== undefined) sec.roomId = roomId;
    if (isActive !== undefined) sec.isActive = Boolean(isActive);
    await repo.updateClassSection(sec);
    return NextResponse.json({ success: true, section: sec });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi cập nhật ca học' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    await repo.deleteClassSection(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi xóa ca học' }, { status: 500 });
  }
}
