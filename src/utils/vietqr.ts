import { AdminBankConfig, DEFAULT_BANK_CONFIG } from '@/types/bank';

/**
 * Helper sinh URL tạo ảnh mã VietQR Napas247 động qua dịch vụ VietQR API
 * Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<ACCOUNT_NAME>
 */
export function generateVietQRUrl(params: {
  bankId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  studentId: string;
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}): string {
  const {
    bankId,
    accountNumber,
    accountName,
    amount,
    studentId,
    template = 'compact2',
  } = params;

  const cleanBankId = (bankId || DEFAULT_BANK_CONFIG.bankId).trim().toUpperCase();
  const cleanAccountNo = (accountNumber || DEFAULT_BANK_CONFIG.accountNumber).trim();
  const cleanAccountName = encodeURIComponent((accountName || DEFAULT_BANK_CONFIG.accountName).trim());
  const cleanAmount = Math.max(0, Math.round(amount));
  const cleanStudentId = encodeURIComponent((studentId || '').trim());

  return `https://img.vietqr.io/image/${cleanBankId}-${cleanAccountNo}-${template}.png?amount=${cleanAmount}&addInfo=${cleanStudentId}&accountName=${cleanAccountName}`;
}
