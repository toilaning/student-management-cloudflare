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

    // 1. Thao tác duyệt thủ công (nếu vẫn cần hỗ trợ tương thích ngược)
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

      await repo.addAuditLog({
        userId: body.reviewerId || reviewerRole,
        userName: reviewerName,
        userRole: reviewerRole,
        action: 'REQUEST_DECIDE',
        targetResource: 'REQUEST',
        targetId: existing.id,
        details: `${body.status === 'ĐÃ_DUYỆT' ? 'Duyệt' : 'Từ chối'} đơn ${existing.type === 'XIN_NGHI' ? 'xin nghỉ' : 'đổi ca'} của học viên ${existing.studentId}`,
      });

      return NextResponse.json({ success: true, request: updated });
    }

    // 2. Tạo đơn / Chuyển ca tự động 100% không cần duyệt theo feedback Mr. Thuyết
    const all = await repo.getAllRequests();
    const newId = `REQ${(all.length + 1).toString().padStart(3, '0')}`;
    
    // Nếu là Đổi ca (DOI_LICH) hoặc có targetScheduleSlotId: Tự động ĐÃ_DUYỆT ngay lập tức
    const isShiftChange = body.type === 'DOI_LICH' || Boolean(body.targetScheduleSlotId);
    const initialStatus = isShiftChange ? 'ĐÃ_DUYỆT' : (body.status || 'CHỜ_DUYỆT');

    const newRequest: ClassRequest = {
      id: newId,
      studentId: body.studentId,
      classId: body.classId,
      scheduleSlotId: body.scheduleSlotId,
      targetScheduleSlotId: body.targetScheduleSlotId || undefined,
      type: isShiftChange ? 'DOI_LICH' : (body.type || 'XIN_NGHI'),
      reason: body.reason || (isShiftChange ? 'Học viên chủ động đổi ca học' : 'Xin nghỉ học'),
      status: initialStatus,
      reviewedBy: isShiftChange ? 'AUTO_SYSTEM' : undefined,
      reviewNote: isShiftChange ? 'Hệ thống tự động chuyển lịch sang ca mới theo cấu hình' : undefined,
      createdAt: new Date().toISOString(),
    };

    // Thực hiện logic chuyển slot học viên nếu đổi ca:
    // Gỡ khỏi lớp/slot cũ và thêm vào lớp/slot mới nếu targetScheduleSlotId khác classId hoặc khác slot
    if (isShiftChange && body.targetScheduleSlotId) {
      try {
        const targetSlot = await repo.getScheduleSlotById(body.targetScheduleSlotId);
        const originalSlot = await repo.getScheduleSlotById(body.scheduleSlotId);

        if (targetSlot && originalSlot && targetSlot.classId !== originalSlot.classId) {
          // Nếu đổi sang ca thuộc lớp khác:
          const oldClass = await repo.getClassById(originalSlot.classId);
          const newClass = await repo.getClassById(targetSlot.classId);

          if (oldClass && newClass) {
            oldClass.studentIds = (oldClass.studentIds || []).filter(id => id !== body.studentId);
            await repo.updateClass(oldClass);

            if (!newClass.studentIds.includes(body.studentId)) {
              newClass.studentIds.push(body.studentId);
              await repo.updateClass(newClass);
            }
          }
        }
      } catch (errSlot) {
        console.warn('Lỗi tự động hoán đổi slot học sinh:', errSlot);
      }
    }

    const saved = await repo.createRequest(newRequest);

    await repo.addAuditLog({
      userId: body.studentId,
      userName: `Học viên ${body.studentId}`,
      userRole: 'STUDENT',
      action: isShiftChange ? 'SCHEDULE_CHANGE' : 'CREATE',
      targetResource: 'REQUEST',
      targetId: newId,
      details: isShiftChange 
        ? `Học viên ${body.studentId} tự động đổi ca từ ca [${body.scheduleSlotId}] sang ca [${body.targetScheduleSlotId}] thành công.`
        : `Gửi đơn xin nghỉ học lớp ${body.classId}`,
    });

    return NextResponse.json({ success: true, request: saved, autoApproved: isShiftChange });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
