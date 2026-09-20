export type TuitionStatus = 'Đã nộp' | 'Còn nợ' | 'Quá hạn' | 'DA_NOP' | 'CON_NO';

export interface TuitionInvoice {
  id: string; // TUI001..
  studentId: string;
  classId: string;
  title: string; // "Học phí môn Lập trình React tháng 09/2026"
  amount: number; // Tổng tiền
  paidAmount: number; // Số tiền đã trả
  remainingAmount: number; // Số tiền còn thiếu
  dueDate: string; // Hạn chót YYYY-MM-DD
  status: TuitionStatus;
  paidDate?: string;
  paymentMethod?: 'Chuyển khoản QR' | 'Tiền mặt' | 'Thẻ ngân hàng';
  transactionCode?: string;
}

export interface PayrollRecord {
  id: string; // PAY001..
  teacherId: string;
  month: string; // "2026-09"
  totalSlots: number; // Số ca dạy đã hoàn thành
  totalHours: number; // Tổng số giờ
  hourlyRate: number; // Đơn giá mỗi giờ
  grossSalary: number; // Lương gộp = totalHours * hourlyRate
  bonus: number; // Thưởng chuyên cần, hỗ trợ
  deduction: number; // Giảm trừ
  netSalary: number; // Thực nhận = grossSalary + bonus - deduction
  status: 'Đã chốt' | 'Đã thanh toán' | 'Tạm tính';
  paidDate?: string;
}
