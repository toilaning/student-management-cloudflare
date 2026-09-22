'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  Receipt, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Filter, 
  X, 
  Check 
} from 'lucide-react';
import { ManualExpense, TeacherTimesheetSummary, LedgerMonthlySummary } from '@/types/ledger';

export default function AdminFinanceLedgerPage() {
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [loading, setLoading] = useState(true);

  const [ledger, setLedger] = useState<LedgerMonthlySummary | null>(null);
  const [timesheets, setTimesheets] = useState<TeacherTimesheetSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'timesheet' | 'expenses' | 'revenue'>('timesheet');

  // Modal Thêm khoản chi nhập tay
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: 1000000,
    category: 'Vận hành' as 'Mặt bằng' | 'Thiết bị' | 'Giáo trình' | 'Vận hành' | 'Khác',
    expenseDate: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/ledger?month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger);
        setTimesheets(data.timesheets || []);
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu sổ thu chi:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [selectedMonth]);

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
        await loadFinanceData();
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error || 'Thêm thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    }
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa khoản chi "${title}"?`)) return;

    try {
      const res = await fetch(`/api/finance/expenses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Đã xóa khoản chi');
        await loadFinanceData();
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi mạng');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Sổ Thu - Chi & Công Nợ Giáo Viên" 
        subtitle="Quản lý dòng tiền, quyết toán lương giảng viên và các khoản chi vận hành trung tâm" 
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {actionMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between font-semibold animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:underline">
              Đóng
            </button>
          </div>
        )}

        {/* Thanh điều khiển kỳ tháng & Hành động */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Calendar size={18} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">Kỳ hạch toán:</span>
            <input 
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="p-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus size={15} /> Thêm Khoản Chi
            </button>
          </div>
        </div>

        {/* 3 THẺ CHỈ SỐ TÀI CHÍNH TỔNG QUAN (THU - CHI - LỢI NHUẬN) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TỔNG THU */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Tổng Thu Học Phí</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowUpRight size={18} />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {((ledger?.totalRevenue || 0)).toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-normal">đ</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Từ {ledger?.invoicesCount || 0} lượt đóng học phí / gói tháng
            </p>
          </div>

          {/* TỔNG CHI */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Tổng Chi Phí (Lương + Vận hành)</span>
              <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <ArrowDownRight size={18} />
              </span>
            </div>
            <div className="text-2xl font-black text-rose-600">
              {((ledger?.totalExpense || 0)).toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-normal">đ</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span>Lương GV: {((ledger?.totalTeacherExpense || 0) / 1000000).toFixed(1)}M</span>
              <span>•</span>
              <span>Chi ngoài: {((ledger?.totalManualExpense || 0) / 1000000).toFixed(1)}M</span>
            </div>
          </div>

          {/* LỢI NHUẬN RÒNG */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Lợi Nhuận Ròng (Thu - Chi)</span>
              <span className={`p-2 rounded-xl ${(ledger?.netProfit || 0) >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                {(ledger?.netProfit || 0) >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </span>
            </div>
            <div className={`text-2xl font-black ${(ledger?.netProfit || 0) >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
              {((ledger?.netProfit || 0)).toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-normal">đ</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Chênh lệch dòng tiền trong tháng {selectedMonth}
            </p>
          </div>
        </div>

        {/* TABS CHUYỂN ĐỔI: CHẤM CÔNG GV | SỔ CHI NGOÀI | KHOẢN THU */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('timesheet')}
              className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'timesheet' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Coins size={15} />
              <span>Công Nợ & Thù Lao Giáo Viên ({timesheets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'expenses' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt size={15} />
              <span>Sổ Chi Vận Hành Ngoài ({ledger?.expenses?.length || 0})</span>
            </button>
          </div>

          <div className="p-5">
            {/* TAB 1: BẢNG CÔNG NỢ GIÁO VIÊN THEO CA DẠY */}
            {activeTab === 'timesheet' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Thù lao được tự động tính dựa trên số ca dạy hoàn thành trong tháng × Đơn giá/buổi.</span>
                  <span className="font-bold text-slate-800">
                    Tổng chi lương: {((ledger?.totalTeacherExpense || 0)).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                      <tr>
                        <th className="p-3">Mã & Giảng viên</th>
                        <th className="p-3 text-center">Số ca đã dạy</th>
                        <th className="p-3 text-right">Đơn giá / Buổi</th>
                        <th className="p-3 text-right">Tổng tiền công</th>
                        <th className="p-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {timesheets.map(tc => (
                        <tr key={tc.teacherId} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{tc.teacherName}</div>
                            <div className="text-[11px] font-mono text-indigo-600">{tc.teacherId}</div>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {tc.totalSessions} ca
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-600">
                            {tc.ratePerSession.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-right font-black text-emerald-600">
                            {tc.totalEarnings.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Chưa chốt chi
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: SỔ CHI VẬN HÀNH NGOÀI */}
            {activeTab === 'expenses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Các khoản chi phí phát sinh nhập tay (mặt bằng, thiết bị, giáo trình, tiếp khách...).</span>
                  <span className="font-bold text-rose-600">
                    Tổng chi ngoài: {((ledger?.totalManualExpense || 0)).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                {(!ledger?.expenses || ledger.expenses.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    Chưa có khoản chi vận hành nào trong tháng {selectedMonth}. Bấm "+ Thêm Khoản Chi" để ghi sổ.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                        <tr>
                          <th className="p-3">Tên khoản chi</th>
                          <th className="p-3">Danh mục</th>
                          <th className="p-3">Ngày chi</th>
                          <th className="p-3 text-right">Số tiền</th>
                          <th className="p-3">Ghi chú</th>
                          <th className="p-3 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledger.expenses.map(exp => (
                          <tr key={exp.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{exp.title}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                                {exp.category}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">{exp.expenseDate}</td>
                            <td className="p-3 text-right font-black text-rose-600">
                              {exp.amount.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="p-3 text-slate-400 italic text-[11px]">{exp.note || '—'}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteExpense(exp.id, exp.title)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Xóa khoản chi"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL THÊM KHOẢN CHI */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">Ghi Nhận Khoản Chi Mới</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên khoản chi *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tiền điện nước, Mua giáo trình, Thuê phòng học..."
                  value={expenseForm.title}
                  onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tiền (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    step={50000}
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Danh mục chi *</label>
                  <select
                    value={expenseForm.category}
                    onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs font-semibold"
                  >
                    <option value="Vận hành">Vận hành</option>
                    <option value="Mặt bằng">Mặt bằng</option>
                    <option value="Thiết bị">Thiết bị</option>
                    <option value="Giáo trình">Giáo trình</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày chi *</label>
                <input
                  type="date"
                  required
                  value={expenseForm.expenseDate}
                  onChange={e => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  placeholder="Hóa đơn VAT, người nhận..."
                  value={expenseForm.note}
                  onChange={e => setExpenseForm({ ...expenseForm, note: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Lưu Khoản Chi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
