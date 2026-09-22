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
    const shiftId = body.shiftId !== undefined ? body.shiftId : body.id;
    const { startTime, endTime, name, isActive } = body;

    if (shiftId === undefined || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: 'Thiếu shiftId, startTime hoặc endTime' }, { status: 400 });
    }

    const updated = await ShiftService.updateShift(Number(shiftId), {
      shiftId: Number(shiftId),
      startTime,
      endTime,
      name,
      isActive,
    });

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
    const { shiftNumber, name, startTime, endTime, isActive } = body;
    if (!startTime || !endTime) {
      return NextResponse.json({ success: false, error: 'Vui lòng cung cấp giờ bắt đầu và kết thúc' }, { status: 400 });
    }

    const newShift = await ShiftService.createShift({
      shiftNumber: shiftNumber ? Number(shiftNumber) : undefined,
      name,
      startTime,
      endTime,
      isActive,
    });
    return NextResponse.json({ success: true, shift: newShift, message: 'Thêm ca học mới thành công' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
