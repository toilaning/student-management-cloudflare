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
    if (body.presetType) {
      const shifts = await ShiftService.applyPreset(body.presetType);
      return NextResponse.json({ success: true, shifts, message: 'Đã áp dụng mẫu cấu hình thành công' });
    }

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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu mã ca học cần xóa' }, { status: 400 });
    }

    const ok = await ShiftService.deleteShift(Number(id));
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy ca học cần xóa' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa ca học thành công' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
