import { NextResponse } from 'next/server';
import { ShiftService } from '@/services/ShiftService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shifts = await ShiftService.getAllShifts();
    return NextResponse.json({ success: true, shifts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, startTime, endTime, name } = body;
    if (!id || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: 'Thiếu id, startTime hoặc endTime' }, { status: 400 });
    }

    const updated = await ShiftService.updateShift(Number(id), { startTime, endTime, name });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy ca học' }, { status: 404 });
    }

    return NextResponse.json({ success: true, shift: updated, message: 'Cập nhật khung giờ ca học thành công' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, startTime, endTime } = body;
    if (!startTime || !endTime) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp giờ bắt đầu và kết thúc' }, { status: 400 });
    }

    const newShift = await ShiftService.createShift({ name, startTime, endTime });
    return NextResponse.json({ success: true, shift: newShift, message: 'Thêm ca học mới thành công' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
