'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { PayrollRecord } from '@/types/finance';
import { Teacher } from '@/types/teacher';
import { Coins, CheckCircle, Clock, RefreshCw, Check } from 'lucide-react';

export default function AdminPayrollPage() {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [teachersMap, setTeachersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPayrolls = async () => {
    setLoading(true);
    try {
      const [payrollRes, teacherRes] = await Promise.all([
        fetch('/api/payroll?month=2026-09'),
        fetch('/api/teachers'),
      ]);
      const payrollData = await payrollRes.json();
      const teacherData = await teacherRes.json();

      setPayrolls(payrollData.payrolls || []);

      const map: Record<string, string> = {};
      (teacherData.teachers || []).forEach((t: Teacher) => {
        map[t.id] = t.name;
      });
      setTeachersMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, []);

  const handleAction = async (payrollId: string, action: 'CHỐT' | 'THANH_TOÁN') => {
    setActionLoading(payrollId);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payrollId }),
      });
      if (res.ok) {
        await loadPayrolls();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const totalBudget = payrolls.reduce((acc, p) => acc + p.netSalary, 0);
  const paidCount = payrolls.filter(p => p.status === 'Đã thanh toán').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Quản lý Bảng lương Giảng viên" 
        subtitle="Bảng tính lương tháng 09/2026 dựa trên số tiết dạy thực tế và điểm danh hoàn thành" 
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Metric Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng quỹ lương tháng 09</span>
            <div className="text-2xl font-bold text-purple-700 mt-2 flex items-baseline gap-1 whitespace-nowrap">
              <span>{totalBudget.toLocaleString('vi-VN')}</span> <span className="text-xs text-slate-400 font-medium">VNĐ</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">Dành cho 20 giảng viên cơ hữu và thỉnh giảng</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái thanh toán</span>
            <div className="text-2xl font-bold text-emerald-600 mt-2">
              {paidCount} / {payrolls.length} <span className="text-sm font-normal text-slate-500">GV đã nhận</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Tỉ lệ giải ngân đạt {((paidCount / (payrolls.length || 1)) * 100).toFixed(0)}%</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-center">
            <button
              onClick={loadPayrolls}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
            >
              <RefreshCw size={16} /> Đồng bộ & Tính lại lương
            </button>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Danh sách phiếu lương chi tiết kỳ 2026-09</h3>
            <span className="text-xs text-slate-500">Đơn vị: VNĐ</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Mã GV</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Họ và tên giảng viên</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Số ca dạy</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Tổng giờ</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Đơn giá/giờ</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Lương gộp</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Thưởng</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Thực nhận</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3">Trạng thái</th>
                  <th className="whitespace-nowrap px-3 sm:px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-800 whitespace-nowrap">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] text-slate-700 whitespace-nowrap inline-flex">
                        {p.teacherId}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-slate-800 whitespace-nowrap min-w-[160px]">
                      {teachersMap[p.teacherId] || 'Đang cập nhật'}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-700 whitespace-nowrap">{p.totalSlots} ca</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">{p.totalHours} giờ</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold font-mono whitespace-nowrap">{p.hourlyRate.toLocaleString('vi-VN')} đ</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold font-mono whitespace-nowrap">{p.grossSalary.toLocaleString('vi-VN')} đ</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-emerald-600 font-semibold font-mono whitespace-nowrap">+{p.bonus.toLocaleString('vi-VN')} đ</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold font-mono text-purple-700 text-sm whitespace-nowrap">
                      {p.netSalary.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] whitespace-nowrap inline-flex ${
                        p.status === 'Đã thanh toán' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right whitespace-nowrap space-x-1.5">
                      {p.status !== 'Đã thanh toán' && (
                        <button
                          disabled={actionLoading === p.id}
                          onClick={() => handleAction(p.id, 'THANH_TOÁN')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-[11px] transition shadow-xs whitespace-nowrap shrink-0"
                        >
                          Thanh toán
                        </button>
                      )}
                      {p.status === 'Tạm tính' && (
                        <button
                          disabled={actionLoading === p.id}
                          onClick={() => handleAction(p.id, 'CHỐT')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium text-[11px] transition shadow-xs whitespace-nowrap shrink-0"
                        >
                          Chốt lương
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
