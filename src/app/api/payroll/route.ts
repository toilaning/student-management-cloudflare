import { repo } from '@/repositories';
import { NextResponse } from 'next/server';
import { TuitionPayrollService } from '@/services/TuitionPayrollService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');
  const month = searchParams.get('month') || '2026-09';

  const teachers = await repo.getAllTeachers();
  const teacherList = Array.isArray(teachers) ? teachers : [];
  const teacherMap = new Map(teacherList.map(t => [t.id, t.name]));

  if (teacherId) {
    const record = await repo.getPayrollByTeacherId(teacherId, month);
    if (!record) return NextResponse.json({ payroll: null });
    return NextResponse.json({ 
      payroll: {
        ...record,
        teacherName: teacherMap.get(record.teacherId) || 'Chưa cập nhật'
      } 
    });
  }

  const records = await repo.getAllPayrollRecords(month);
  const recordList = Array.isArray(records) ? records : [];
  const payrollsWithNames = recordList.map(p => ({
    ...p,
    teacherName: teacherMap.get(p.teacherId) || 'Chưa cập nhật'
  }));

  return NextResponse.json({ payrolls: payrollsWithNames });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payrollId, teacherId, month } = body;
    const financeService = new TuitionPayrollService(repo);

    if (action === 'RECALCULATE' && teacherId) {
      const payroll = await financeService.calculateTeacherPayroll(teacherId, month || '2026-09');
      return NextResponse.json({ success: true, payroll });
    }

    if (action === 'CHỐT' || action === 'THANH_TOÁN') {
      const payroll = await financeService.finalizePayroll(payrollId, action);
      return NextResponse.json({ success: true, payroll });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
