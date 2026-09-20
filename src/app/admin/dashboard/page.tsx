'use client';

import { TeacherHomeworkWidget } from '@/components/homework/TeacherHomeworkWidget';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/common/Header';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Coins, 
  Receipt, 
  AlertTriangle, 
  CalendarDays, 
  ArrowUpRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 400,
    totalTeachers: 20,
    totalClasses: 30,
    totalRevenue: 0,
    totalPayroll: 0,
    outstandingDebt: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const fetchSafe = async (url: string) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return {};
            return await res.json();
          } catch (e) {
            return {};
          }
        };

        const [tuitionData, payrollData, logsData, slotsData] = await Promise.all([
          fetchSafe('/api/finance'),
          fetchSafe('/api/payroll?month=2026-09'),
          fetchSafe('/api/audit'),
          fetchSafe('/api/schedule?date=2026-09-02'),
        ]);

        let totalRevenue = 0;
        let outstandingDebt = 0;
        if (tuitionData.invoices) {
          tuitionData.invoices.forEach((inv: any) => {
            totalRevenue += inv.paidAmount;
            outstandingDebt += inv.remainingAmount;
          });
        }

        let totalPayroll = 0;
        if (payrollData.payrolls) {
          payrollData.payrolls.forEach((p: any) => {
            totalPayroll += p.netSalary;
          });
        }

        setStats({
          totalStudents: 400,
          totalTeachers: 20,
          totalClasses: 30,
          totalRevenue,
          totalPayroll,
          outstandingDebt,
        });

        setRecentLogs(logsData.logs ? logsData.logs.slice(0, 6) : []);
        setTodaySlots(slotsData.slots ? slotsData.slots.slice(0, 5) : []);
      } catch (e) {
        console.error('Error loading dashboard stats:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Tổng quan Trung tâm Đào tạo" 
        subtitle="Hệ thống điều hành và giám sát trung tâm kỳ học Tháng 09/2026" 
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng học viên</span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Users size={20} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">{stats.totalStudents}</span>
              <span className="text-xs font-medium text-emerald-600 flex items-center">
                <TrendingUp size={12} className="mr-0.5" /> 100% kích hoạt
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Từ ST001 đến ST400 trong cơ sở dữ liệu</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Giáo viên & Lớp</span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <GraduationCap size={20} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">{stats.totalTeachers} GV</span>
              <span className="text-sm font-semibold text-slate-500">/ {stats.totalClasses} Lớp</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Phân bổ đều 5 ca học từ T2 đến T7</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Học phí thu thực tế</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Receipt size={20} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {(stats.totalRevenue / 1_000_000).toFixed(1)} Tr
              </span>
              <span className="text-xs text-slate-400">VNĐ</span>
            </div>
            <p className="text-xs text-amber-600 font-medium mt-1">
              Còn nợ: {(stats.outstandingDebt / 1_000_000).toFixed(1)} triệu VNĐ
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quỹ lương tháng 9</span>
              <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Coins size={20} />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-bold text-purple-700 whitespace-nowrap">
                {(stats.totalPayroll / 1_000_000).toFixed(1)} Tr
              </span>
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">VNĐ</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">Dự toán chi trả 20 giảng viên</p>
          </div>
        </div>

        {/* Action Shortcuts & Highlights */}
        {/* Widget Quản lý & Giao bài tập vẽ */}
        <div className="mb-6">
          <TeacherHomeworkWidget title="Quản lý & Giao bài tập vẽ (Toàn trung tâm)" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lịch học hôm nay */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="text-indigo-600" size={20} />
                <h2 className="font-bold text-slate-800 text-base">Lịch học tiêu biểu (Tháng 09/2026)</h2>
              </div>
              <Link href="/admin/calendar" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                Xem toàn bộ lịch <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {todaySlots.length > 0 ? (
                todaySlots.map(slot => (
                  <div key={slot.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-indigo-700 shrink-0 whitespace-nowrap">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold mt-0.5">Ca {slot.shiftId}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{slot.subject} ({slot.classId})</div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="whitespace-nowrap">{slot.startTime} - {slot.endTime}</span>
                          <span className="text-slate-300">•</span>
                          <span className="whitespace-nowrap">Phòng: <span className="font-semibold text-slate-700">{slot.roomId}</span></span>
                          <span className="text-slate-300">•</span>
                          <span className="whitespace-nowrap">GV: {slot.teacherId}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700 whitespace-nowrap shrink-0">
                      {slot.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">Đang tải lịch học...</div>
              )}
            </div>
          </div>

          {/* Hoạt động gần đây (Audit Log Preview) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-base">Nhật ký hoạt động</h2>
              <Link href="/admin/audit" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Tất cả
              </Link>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {recentLogs.map((log) => (
                <div key={log.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700 truncate max-w-[150px]">{log.userName}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
