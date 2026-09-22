import { NextResponse } from 'next/server';
import { LedgerService } from '@/services/LedgerService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);

    const ledger = await LedgerService.calculateMonthlyLedger(month);
    const timesheets = await LedgerService.getTeacherTimesheets(month);

    return NextResponse.json({
      success: true,
      ledger,
      timesheets,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
