import { NextResponse } from 'next/server';
import { AdminBankConfig, DEFAULT_BANK_CONFIG } from '@/types/bank';

export const dynamic = 'force-dynamic';

// In-memory cache lưu cấu hình ngân hàng admin
let currentBankConfig: AdminBankConfig = { ...DEFAULT_BANK_CONFIG };

export async function GET() {
  return NextResponse.json({
    success: true,
    bankConfig: currentBankConfig,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bankId, bankName, accountNumber, accountName } = body;

    if (!bankId || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp đầy đủ Mã ngân hàng, Số tài khoản và Tên chủ thẻ' },
        { status: 400 }
      );
    }

    currentBankConfig = {
      bankId: bankId.trim().toUpperCase(),
      bankName: bankName?.trim() || bankId.trim().toUpperCase(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim().toUpperCase(),
    };

    return NextResponse.json({
      success: true,
      message: 'Cập nhật tài khoản ngân hàng nhận học phí thành công!',
      bankConfig: currentBankConfig,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý yêu cầu' },
      { status: 500 }
    );
  }
}
