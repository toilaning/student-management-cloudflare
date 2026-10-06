import { NextResponse } from 'next/server';
import { repo } from '@/repositories';
import { ClassRequest } from '@/types/schedule';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const teacherId = searchParams.get('teacherId');

  let requests = await repo.getAllRequests();
  if (studentId) {
    requests = requests.filter(r => r.studentId === studentId);
  }
  if (teacherId) {
    const teacherClasses = await repo.getClassesByTeacherId(teacherId);
    const classIds = new Set(teacherClasses.map(c => c.id));
    requests = requests.filter(r => classIds.has(r.classId));
  }

  // Sắp xếp đơn mới nhất lên đầu
  requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === 'DECIDE') {
      const existing = await repo.getRequestById(body.requestId);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Không tìm thấy yêu cầu' }, { status: 404 });
      }

      const reviewerRole = body.reviewerRole || 'ADMIN';
      const reviewerName = body.reviewerName || (reviewerRole === 'ADMIN' ? 'Quản trị viên' : `Giáo viên ${body.reviewerId || ''}`);

      existing.status = body.status; // 'ĐÃ_DUYỆT' | 'TỪ_CHỐI'
      existing.reviewedBy = body.reviewerId;
      existing.reviewNote = body.reviewNote;
      const updated = await repo.updateRequest(existing);

      // Duyệt đơn xin nghỉ: tự động ghi 'Vắng có phép' vào sổ điểm danh của ca tương ứng.
      if (body.status === 'ĐÃ_DUYỆT' && existing.scheduleSlotId) {
        try {
          const slot = await repo.getScheduleSlotById(existing.scheduleSlotId);
          if (slot) {
            const records = await repo.getAttendanceBySlotId(slot.id);
            const found = records.find((r) => r.studentId === existing.studentId);
            await repo.saveAttendanceRecord({
              id: found?.id || `ATT_EXCUSED_${slot.id}_${existing.studentId}`,
              scheduleSlotId: slot.id,
              classId: slot.classId,
              studentId: existing.studentId,
              date: slot.date,
              status: 'Vắng có phép',
              note: `Nghỉ có phép theo đơn ${existing.id}`,
              method: 'SYSTEM',
              updatedBy: body.reviewerId || reviewerRole,
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (attErr) {
          console.warn('[REQUEST-DECIDE] Không ghi được điểm danh vắng có phép:', attErr);
        }
      }

      await repo.addAuditLog({
        userId: body.reviewerId || reviewerRole,
        userName: reviewerName,
        userRole: reviewerRole,
        action: 'REQUEST_DECIDE',
        targetResource: 'REQUEST',
        targetId: existing.id,
        details: `${body.status === 'ĐÃ_DUYỆT' ? 'Duyệt' : 'Từ chối'} đơn xin nghỉ của học viên ${existing.studentId}`,
      });

      return NextResponse.json({ success: true, request: updated });
    }

    // Tạo đơn mới
    const all = await repo.getAllRequests();
    const newId = `REQ${(all.length + 1).toString().padStart(3, '0')}`;
    const newRequest: ClassRequest = {
      id: newId,
      studentId: body.studentId,
      classId: body.classId,
      scheduleSlotId: body.scheduleSlotId,
      targetScheduleSlotId: body.targetScheduleSlotId || undefined,
      type: body.type,
      reason: body.reason,
      status: 'CHỜ_DUYỆT',
      createdAt: new Date().toISOString(),
    };
    const saved = await repo.createRequest(newRequest);

    await repo.addAuditLog({
      userId: body.studentId,
      userName: `Sinh viên ${body.studentId}`,
      userRole: 'STUDENT',
      action: 'CREATE',
      targetResource: 'REQUEST',
      targetId: newId,
      details: `Gửi đơn xin nghỉ học lớp ${body.classId}`,
    });

    return NextResponse.json({ success: true, request: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
