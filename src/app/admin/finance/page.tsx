'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Filter, 
  X, 
  Check, 
  QrCode, 
  Receipt,
  Users,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { ManualExpense, TeacherTimesheetSummary, LedgerMonthlySummary } from '@/types/ledger';
import { TuitionInvoice } from '@/types/finance';
import { generateVietQRUrl } from '@/utils/vietqr';
import { AdminBankConfig, DEFAULT_BANK_CONFIG } from '@/types/bank';

export default function AdminFinanceUnifiedPage() {
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [loading, setLoading] = useState(true);

  // Tab to rõ: 1. Tình trạng học phí học sinh | 2. Các khoản chi trong tháng
  const [activeTab, setActiveTab] = useState<'tuition' | 'expenses'>('tuition');
  // Lọc tab học phí: ALL | UNPAID (Chưa đóng) | PAID (Đã đóng)
  const [tuitionFilter, setTuitionFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('UNPAID');

  const [ledger, setLedger] = useState<LedgerMonthlySummary | null>(null);
  const [timesheets, setTimesheets] = useState<TeacherTimesheetSummary[]>([]);
  const [invoices, setInvoices] = useState<TuitionInvoice[]>([]);
  const [bankConfig, setBankConfig] = useState<AdminBankConfig>(DEFAULT_BANK_CONFIG);

  // Modal QR Code nhắc đóng học phí
  const [viewingQrInvoice, setViewingQrInvoice] = useState<TuitionInvoice | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Modal Thêm khoản chi trong tháng
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: 1000000,
    category: 'Vận hành' as 'Mặt bằng' | 'Thiết bị' | 'Giáo trình' | 'Vận hành' | 'Khác',
    expenseDate: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAllFinanceData = async () => {
    try {
      setLoading(true);
      const [ledgerRes, tuitionRes, bankRes] = await Promise.all([
        fetch(`/api/finance/ledger?month=${selectedMonth}`),
        fetch('/api/finance'),
        fetch('/api/settings/bank')
      ]);

      const ledgerData = await ledgerRes.json();
      const tuitionData = await tuitionRes.json();
      const bankData = await bankRes.json();

      if (ledgerData.success) {
        setLedger(ledgerData.ledger);
        setTimesheets(ledgerData.timesheets || []);
      }
      if (tuitionData.invoices) {
        setInvoices(tuitionData.invoices);
      }
      if (bankData.config) {
        setBankConfig(bankData.config);
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu tài chính:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFinanceData();
  }, [selectedMonth]);

  // Thêm khoản chi mới
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) {
      alert('Vui lòng điền đủ tên khoản chi và số tiền');
      return;
    }

    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Đã thêm khoản chi thành công');
        setShowExpenseModal(false);
        setExpenseForm({
          title: '',
          amount: 1000000,
          category: 'Vận hành',
          expenseDate: new Date().toISOString().split('T')[0],
          note: ''
        });
        await loadAllFinanceData();
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error || 'Thêm thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    }
  };

  // Xóa khoản chi
  const handleDeleteExpense = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa khoản chi "${title}"?`)) return;

    try {
      const res = await fetch(`/api/finance/expenses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Đã xóa khoản chi');
        await loadAllFinanceData();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi mạng');
    }
  };

  // Cập nhật hóa đơn sang Đã nộp nhanh
  const handleMarkAsPaid = async (inv: TuitionInvoice) => {
    try {
      const res = await fetch('/api/finance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: inv.id,
          status: 'Đã nộp',
          paidAmount: inv.amount,
          remainingAmount: 0,
          paymentMethod: 'Tiền mặt',
          paidDate: new Date().toISOString().split('T')[0],
          notes: 'Xác nhận thu học phí thành công'
        })
      });
      if (res.ok) {
        setActionMessage(`Đã đánh dấu [Đã nộp] cho hóa đơn ${inv.id}`);
        await loadAllFinanceData();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  // Tính toán 3 khối lớn trên cùng
  const totalRevenue = ledger?.totalRevenue || 0;
  const totalExpense = ledger?.totalExpense || 0;
  const netProfit = totalRevenue - totalExpense;

  // Lọc học phí
  const filteredInvoices = useMemo(() => {
    if (tuitionFilter === 'UNPAID') {
      return invoices.filter(i => i.status === 'Còn nợ' || i.status === 'CON_NO' || i.status === 'Quá hạn');
    }
    if (tuitionFilter === 'PAID') {
      return invoices.filter(i => i.status === 'Đã nộp' || i.status === 'DA_NOP');
    }
    return invoices;
  }, [invoices, tuitionFilter]);

  const unpaidCount = invoices.filter(i => i.status === 'Còn nợ' || i.status === 'CON_NO' || i.status === 'Quá hạn').length;
  const paidCount = invoices.filter(i => i.status === 'Đã nộp' || i.status === 'DA_NOP').length;

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
        <Header 
          title="Thu - Chi & Học Phí Tối Giản" 
          subtitle="Doanh thu trừ Chi phí = Lãi ròng • Quản lý học phí và các khoản chi trong 1 màn hình" 
        />

        <main className="p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-6">
          {actionMessage && (
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl text-xs sm:text-sm flex items-center justify-between font-bold animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check size={18} className="text-emerald-600" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:underline">
                Đóng
              </button>
            </div>
          )}

          {/* CHỌN THÁNG KẾ TOÁN */}
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              <span className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Kỳ kế toán tháng:</span>
              <input 
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-indigo-50 border-2 border-indigo-200 rounded-xl px-3 py-1 font-bold text-xs sm:text-sm text-indigo-900 focus:outline-indigo-600 cursor-pointer"
              />
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Cập nhật dòng tiền thực tế cho Atelier Kiến Trúc
            </div>
          </div>

          {/* 3 KHỐI LỚN TRÊN CÙNG: [TỔNG THU HỌC PHÍ] - [TỔNG CHI PHÍ] = [LÃI RÒNG] */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KHỐI 1: TỔNG HỌC PHÍ THU */}
            <div className="bg-emerald-50/70 border-2 border-emerald-300 p-5 rounded-3xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  TỔNG HỌC PHÍ THU
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight font-mono">
                {totalRevenue.toLocaleString('vi-VN')} <span className="text-sm font-bold text-emerald-600">đ</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-700">
                Thực thu từ tất cả các gói học và học phí
              </p>
            </div>

            {/* KHỐI 2: TỔNG CHI PHÍ */}
            <div className="bg-rose-50/70 border-2 border-rose-300 p-5 rounded-3xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                  TỔNG CHI PHÍ
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                  <ArrowDownRight size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-800 tracking-tight font-mono">
                {totalExpense.toLocaleString('vi-VN')} <span className="text-sm font-bold text-rose-600">đ</span>
              </div>
              <p className="text-[11px] font-semibold text-rose-700">
                Lương giáo viên + Chi phí vận hành, nhà, điện
              </p>
            </div>

            {/* KHỐI 3: LÃI RÒNG */}
            <div className={`p-5 rounded-3xl shadow-sm border-2 space-y-2 ${
              netProfit >= 0 ? 'bg-indigo-50/70 border-indigo-300' : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                  LÃI RÒNG THỰC TẾ
                </span>
                <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-xs ${
                  netProfit >= 0 ? 'bg-indigo-600' : 'bg-amber-600'
                }`}>
                  {netProfit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
              </div>
              <div className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${
                netProfit >= 0 ? 'text-indigo-950' : 'text-rose-700'
              }`}>
                {netProfit.toLocaleString('vi-VN')} <span className="text-sm font-bold text-indigo-600">đ</span>
              </div>
              <p className="text-[11px] font-semibold text-indigo-800">
                {netProfit >= 0 ? 'Số dư dương sau khi trừ hết chi phí' : 'Cần bù đắp thâm hụt dòng tiền'}
              </p>
            </div>
          </div>

          {/* DƯỚI TRANG CHỈ CHIA ĐÚNG 2 TAB TO RÕ: TAB 1 (HỌC PHÍ HỌC SINH) & TAB 2 (CÁC KHOẢN CHI) */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
            {/* 2 TAB LỚN */}
            <div className="grid grid-cols-2 border-b-2 border-slate-200 bg-slate-100/70 p-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('tuition')}
                className={`py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'tuition'
                    ? 'bg-white text-indigo-900 shadow-sm border border-slate-200 scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Users size={18} className={activeTab === 'tuition' ? 'text-indigo-600' : 'text-slate-400'} />
                <span>1. TÌNH TRẠNG HỌC PHÍ HỌC SINH ({invoices.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'expenses'
                    ? 'bg-white text-rose-900 shadow-sm border border-slate-200 scale-[1.01]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Receipt size={18} className={activeTab === 'expenses' ? 'text-rose-600' : 'text-slate-400'} />
                <span>2. CÁC KHOẢN CHI TRONG THÁNG ({(ledger?.expenses?.length || 0) + timesheets.length})</span>
              </button>
            </div>

            {/* NỘI DUNG TAB 1: TÌNH TRẠNG HỌC PHÍ HỌC SINH */}
            {activeTab === 'tuition' && (
              <div className="p-4 sm:p-6 space-y-4">
                {/* THANH LỌC 2 NHÓM: CHƯA ĐÓNG & ĐÃ ĐÓNG */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTuitionFilter('UNPAID')}
                      className={`px-4 py-2 rounded-xl font-black text-xs transition-all border-2 cursor-pointer flex items-center gap-1.5 ${
                        tuitionFilter === 'UNPAID'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <span>🔴 Chưa đóng ({unpaidCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTuitionFilter('PAID')}
                      className={`px-4 py-2 rounded-xl font-black text-xs transition-all border-2 cursor-pointer flex items-center gap-1.5 ${
                        tuitionFilter === 'PAID'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <span>🟢 Đã đóng ({paidCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTuitionFilter('ALL')}
                      className={`px-3 py-2 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                        tuitionFilter === 'ALL'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả
                    </button>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    Bấm <strong className="text-indigo-600">Gửi QR</strong> để mở mã thanh toán VietQR chuyển cho học sinh/phụ huynh
                  </div>
                </div>

                {/* DANH SÁCH BẢNG HỌC PHÍ */}
                {loading ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    Đang nạp dữ liệu học phí...
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    Không có học viên nào trong danh mục này.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredInvoices.map(inv => {
                      const isPaid = inv.status === 'Đã nộp' || inv.status === 'DA_NOP';

                      return (
                        <div 
                          key={inv.id} 
                          className="py-3.5 px-2 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          {/* Mã & Thông tin học viên */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">
                                {inv.title}
                              </span>
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {inv.studentId}
                              </span>
                            </div>
                            <div className="text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                              <span>Mã HĐ: <strong className="text-slate-700 font-mono">{inv.id}</strong></span>
                              <span>•</span>
                              <span>Hạn đóng: <strong className="text-slate-700">{inv.dueDate}</strong></span>
                              <span>•</span>
                              <span className="font-bold text-slate-900 font-mono text-xs">
                                {inv.amount.toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                          </div>

                          {/* Hành động: Gửi QR nhắc đóng + Đánh dấu đã đóng */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isPaid ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-xs">
                                <Check size={14} className="stroke-[3]" />
                                <span>Đã hoàn tất</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setViewingQrInvoice(inv)}
                                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-black rounded-xl border border-indigo-300 text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                >
                                  <QrCode size={15} />
                                  <span>Gửi QR Nhắc Đóng</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleMarkAsPaid(inv)}
                                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Check size={15} />
                                  <span>Đã Thu Tiền</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* NỘI DUNG TAB 2: CÁC KHOẢN CHI TRONG THÁNG */}
            {activeTab === 'expenses' && (
              <div className="p-4 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      Sổ Chi Tiêu & Quyết Toán Tháng {selectedMonth}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Bao gồm thù lao theo ca của giáo viên và các khoản chi vận hành xưởng
                    </p>
                  </div>

                  {/* NÚT BẤM TO BẢN: + THÊM KHOẢN CHI */}
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(true)}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus size={18} />
                    <span>+ THÊM KHOẢN CHI MỚI</span>
                  </button>
                </div>

                {/* DANH SÁCH CHI VẬN HÀNH NGOÀI */}
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Khoản Chi Vận Hành (Nhà, điện, thiết bị, quảng cáo...)
                  </div>

                  {(!ledger?.expenses || ledger.expenses.length === 0) ? (
                    <div className="p-6 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                      Chưa có khoản chi vận hành nào trong tháng này.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                      {ledger.expenses.map(ex => (
                        <div key={ex.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{ex.title}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Ngày chi: {ex.expenseDate} • Danh mục: <span className="font-bold text-slate-700">{ex.category}</span>
                              {ex.note && <span className="italic ml-2 text-slate-400">({ex.note})</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-rose-700 text-sm">
                              -{ex.amount.toLocaleString('vi-VN')} đ
                            </span>
                            <button
                              onClick={() => handleDeleteExpense(ex.id, ex.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Xóa khoản chi"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* THÙ LAO GIÁO VIÊN THEO CA */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Thù Lao Giảng Viên Theo Ca Dạy ({timesheets.length} thầy/cô)
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {timesheets.map(tc => (
                      <div key={tc.teacherId} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{tc.teacherName}</div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Mã GV: <span className="font-mono font-bold text-indigo-600">{tc.teacherId}</span> • Đã dạy: <strong className="text-slate-800">{tc.totalSessions} ca</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-rose-700 text-sm">
                            -{tc.totalEarnings.toLocaleString('vi-VN')} đ
                          </span>
                          <div className="text-[10px] text-slate-400">Tự động tính theo ca</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* MODAL THÊM KHOẢN CHI TRONG THÁNG */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 border-2 border-slate-200 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-base">Thêm Khoản Chi Mới</h3>
                <button 
                  onClick={() => setShowExpenseModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="mt-4 space-y-4 text-xs font-sans">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên khoản chi:</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tiền nhà, tiền điện, mua bút màu, quảng cáo..."
                    value={expenseForm.title}
                    onChange={e => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tiền (VNĐ):</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={10000}
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-mono font-black text-rose-700 text-base focus:outline-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phân loại:</label>
                    <select
                      value={expenseForm.category}
                      onChange={e => setExpenseForm(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="Mặt bằng">Mặt bằng</option>
                      <option value="Thiết bị">Thiết bị</option>
                      <option value="Giáo trình">Giáo trình</option>
                      <option value="Vận hành">Vận hành</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày chi:</label>
                    <input
                      type="date"
                      value={expenseForm.expenseDate}
                      onChange={e => setExpenseForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                      className="w-full p-2 border-2 border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú (tùy chọn):</label>
                  <input
                    type="text"
                    placeholder="Chi tiết thêm..."
                    value={expenseForm.note}
                    onChange={e => setExpenseForm(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-700"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl shadow-xs"
                  >
                    Lưu Khoản Chi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL VIETQR NHẮC ĐÓNG HỌC PHÍ */}
        {viewingQrInvoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border-2 border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <QrCode size={20} className="text-indigo-600" />
                  <h3 className="font-black text-slate-900 text-base">Mã VietQR Học Phí</h3>
                </div>
                <button 
                  onClick={() => setViewingQrInvoice(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              {(() => {
                const qrUrl = generateVietQRUrl({
                  bankId: bankConfig.bankId,
                  accountNumber: bankConfig.accountNumber,
                  accountName: bankConfig.accountName,
                  amount: viewingQrInvoice.remainingAmount || viewingQrInvoice.amount,
                  studentId: viewingQrInvoice.studentId,
                  invoiceId: viewingQrInvoice.id,
                  template: 'compact2',
                });

                return (
                  <div className="space-y-3 text-center">
                    <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl inline-block">
                      <img 
                        src={qrUrl} 
                        alt="VietQR Học Phí" 
                        className="w-56 h-auto mx-auto rounded-lg shadow-2xs" 
                      />
                    </div>

                    <div className="text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <div>Ngân hàng: <strong>{bankConfig.bankId}</strong> - STK: <strong className="font-mono">{bankConfig.accountNumber}</strong></div>
                      <div>Chủ TK: <strong>{bankConfig.accountName}</strong></div>
                      <div>Số tiền: <strong className="text-emerald-700 font-mono text-sm">{(viewingQrInvoice.remainingAmount || viewingQrInvoice.amount).toLocaleString('vi-VN')} đ</strong></div>
                      <div>Nội dung CK: <strong className="text-indigo-700 font-mono">HP {viewingQrInvoice.studentId} {viewingQrInvoice.id}</strong></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`Thông báo học phí: Vui lòng chuyển khoản số tiền ${(viewingQrInvoice.remainingAmount || viewingQrInvoice.amount).toLocaleString('vi-VN')} đ tới STK ${bankConfig.accountNumber} (${bankConfig.bankId} - ${bankConfig.accountName}), nội dung: HP ${viewingQrInvoice.studentId} ${viewingQrInvoice.id}`);
                        setCopyToast('Đã sao chép tin nhắn nhắc đóng học phí!');
                        setTimeout(() => setCopyToast(null), 3000);
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy size={14} />
                      <span>{copyToast || 'Sao chép tin nhắn gửi phụ huynh/HS'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
