export interface ManualExpense {
  id: string; // EXP_...
  title: string;
  amount: number;
  category: 'Mặt bằng' | 'Thiết bị' | 'Giáo trình' | 'Vận hành' | 'Khác';
  expenseDate: string; // YYYY-MM-DD
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface TeacherTimesheetSummary {
  teacherId: string;
  teacherName: string;
  month: string;
  totalSessions: number;
  ratePerSession: number;
  totalEarnings: number;
  status: 'CHƯA_CHỐT' | 'ĐÃ_CHỐT' | 'ĐÃ_CHI';
}

export interface LedgerMonthlySummary {
  month: string;
  totalRevenue: number;
  totalTeacherExpense: number;
  totalManualExpense: number;
  totalExpense: number;
  netProfit: number;
  invoicesCount: number;
  teacherSessionsCount: number;
  expenses: ManualExpense[];
}
