import { NextResponse } from 'next/server';
import { repo } from '@/repositories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await repo.getAllAuditLogs();
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ logs: [], error: error.message }, { status: 500 });
  }
}
