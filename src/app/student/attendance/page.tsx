'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { AttendanceRecord } from '@/types/attendance';
import { FileCheck, CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react';

export default function StudentAttendancePage() {
  const { currentUser, isReady } = useApp();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const res = await fetch(`/api/attendance?studentId=${currentUser?.id || ""}`);
        const data = await res.json();
        setRecords(data.records || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const present = records.filter(r => r.status === 'Có mặt').length;
  const late = records.filter(r => r.status === 'Đi muộn').length;
  const excused = records.filter(r => r.status === 'Vắng có phép').length;
  const unexcused = records.filter(r => r.status === 'Vắng không phép').length;

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Lịch Sử Chuyên Cần & Điểm Danh" 
          subtitle={`Theo dõi tình trạng đi học của ${currentUser?.name || ""} (${currentUser?.id || ""})`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Metric Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-emerald-600 uppercase">Có mặt</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{present}</div>
              <span className="text-[11px] text-slate-400">buổi học</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-amber-600 uppercase">Đi muộn</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">{late}</div>
              <span className="text-[11px] text-slate-400">buổi học</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-blue-600 uppercase">Vắng có phép</span>
              <div className="text-2xl font-bold text-blue-700 mt-1">{excused}</div>
              <span className="text-[11px] text-slate-400">đã gửi đơn</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-center">
              <span className="text-xs font-semibold text-rose-600 uppercase">Vắng không phép</span>
              <div className="text-2xl font-bold text-rose-700 mt-1">{unexcused}</div>
              <span className="text-[11px] text-slate-400">cần giải trình</span>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Chi tiết từng buổi điểm danh</h3>
              <span className="text-xs text-slate-500">Tháng 09/2026</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Ngày học</th>
                    <th className="px-4 py-3">Lớp học</th>
                    <th className="px-4 py-3">Ca học</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Giờ vào lớp</th>
                    <th className="px-4 py-3">Ghi chú từ giáo viên</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {r.date}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-600">{r.classId}</td>
                      <td className="px-4 py-3 text-slate-600">{r.scheduleSlotId}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          r.status === 'Có mặt'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'Đi muộn'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'Vắng có phép'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{r.checkinTime || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 italic">{r.note || 'Không có ghi chú'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {records.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có dữ liệu điểm danh nào trong tháng này.
              </div>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
