export interface StudentMonthlyPackage {
  id: string; // SMP_26001_2026_09
  studentId: string;
  month: string; // 'YYYY-MM'
  packageName: string;
  totalSessions: number;
  rolloverSessions: number;
  usedSessions: number;
  remainingSessions: number; // totalSessions + rolloverSessions - usedSessions
  price: number;
  paymentStatus: 'CHƯA_NỘP' | 'ĐÃ_NỘP' | 'CÒN_NỢ';
  note?: string;
  createdAt: string;
  updatedAt: string;
}
