import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { AttendanceRecord } from '@/types/attendance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slotId = searchParams.get('slotId');
  const studentId = searchParams.get('studentId');
  const classId = searchParams.get('classId');
  const date = searchParams.get('date');

  let records: AttendanceRecord[] = [];

  if (slotId) {
    records = await repo.getAttendanceBySlotId(slotId);
  } else if (classId) {
    records = await repo.getAttendanceByClassId(classId);
  } else if (studentId) {
    records = await repo.getAttendanceByStudentId(studentId);
  } else {
    // If no primary filter, check if date or classId/slotId are combined
    // Or if date only, query all slots or records if repository supports, 
    // but typically slotId or classId is provided.
    // As fallback for general query:
    const allClasses = await repo.getAllClasses();
    const allRecords: AttendanceRecord[] = [];
    for (const cls of allClasses) {
      const clsRecords = await repo.getAttendanceByClassId(cls.id);
      allRecords.push(...clsRecords);
    }
    // Deduplicate by id if needed
    const map = new Map<string, AttendanceRecord>();
    allRecords.forEach(r => map.set(r.id, r));
    records = Array.from(map.values());
  }

  // Filter further by date, classId, slotId, studentId if multiple params provided
  if (date) {
    records = records.filter(r => r.date === date);
  }
  if (classId && slotId) {
    records = records.filter(r => r.classId === classId);
  }
  if (studentId && (slotId || classId)) {
    records = records.filter(r => r.studentId === studentId);
  }

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updatedBy = body.updatedBy || 'ADMIN001';
    const updaterName = body.updaterName || 'Quản trị viên';
    const userRole = updatedBy.startsWith('ADMIN') ? 'ADMIN' : (body.userRole || 'ADMIN');

    if (Array.isArray(body.records)) {
      const saved = await repo.saveAttendanceBatch(body.records);
      await repo.addAuditLog({
        userId: updatedBy,
        userName: updaterName,
        userRole: userRole as any,
        action: 'ATTENDANCE_CHECK',
        targetResource: 'ATTENDANCE',
        targetId: body.slotId || 'BATCH',
        details: `Cập nhật sổ điểm danh cho ${saved.length} học viên (Ca: ${body.slotId || 'Nhiều ca'})`,
      });
      return NextResponse.json({ success: true, count: saved.length, records: saved });
    } else if (body.record) {
      const saved = await repo.saveAttendanceRecord(body.record);
      await repo.addAuditLog({
        userId: updatedBy,
        userName: updaterName,
        userRole: userRole as any,
        action: 'ATTENDANCE_CHECK',
        targetResource: 'ATTENDANCE',
        targetId: saved.scheduleSlotId || saved.id,
        details: `Cập nhật điểm danh cho học viên ${saved.studentId} trạng thái: ${saved.status}`,
      });
      return NextResponse.json({ success: true, record: saved });
    }
    return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
