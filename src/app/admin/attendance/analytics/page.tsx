'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ClassEntity } from '@/types/classroom';
import { 
  Calendar, 
  BarChart3, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RotateCw, 
  TrendingUp, 
  Percent,
  Download,
  Filter
} from 'lucide-react';
import Link from 'next/link';

interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  enrolledClasses: string[];
  totalSlots: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  unexcusedCount: number;
  makeupCount: number;
  rate: number;
}

export default function AttendanceAnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [items, setItems] = useState<StudentAttendanceSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch('/api/classes');
        const data = await res.json();
        if (data.classes) setClasses(data.classes);
      } catch (e) {
        console.error('Error fetching classes:', e);
      }
    }
    loadClasses();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/analytics?month=${selectedMonth}`;
      if (selectedClassId && selectedClassId !== 'ALL') {
        url += `&classId=${selectedClassId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.items) {
        setItems(data.items);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.error('Error fetching attendance analytics:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    setCurrentPage(1);
  }, [selectedMonth, selectedClassId]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(
      item => 
        item.studentId.toLowerCase().includes(q) || 
        item.studentName.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Overall statistics
  const summaryStats = useMemo(() => {
    if (items.length === 0) return { avgRate: 0, goodCount: 0, warningCount: 0, badCount: 0 };
    const avgRate = Math.round(items.reduce((sum, i) => sum + i.rate, 0) / items.length);
    const goodCount = items.filter(i => i.rate >= 80).length;
    const warningCount = items.filter(i => i.rate >= 60 && i.rate < 80).length;
    const badCount = items.filter(i => i.rate < 60).length;
    return { avgRate, goodCount, warningCount, badCount };
  }, [items]);

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Bảng Tổng Kết Chuyên Cần Theo Tháng" 
          subtitle="Thống kê tỷ lệ tham gia học tập, số buổi có mặt, vắng và đi muộn của từng học sinh" 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Quick links & summary header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Link 
                href="/admin/attendance" 
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition shadow-2xs"
              >
                ← Quay lại Sổ điểm danh theo ca
              </Link>
            </div>
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <RotateCw size={14} className={loading ? "animate-spin text-indigo-600" : "text-slate-500"} />
              <span>Làm mới dữ liệu</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tỷ lệ chuyên cần TB</span>
              <div className="text-2xl font-black text-indigo-600 mt-2 flex items-baseline gap-1">
                <span>{summaryStats.avgRate}%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Toàn bộ học viên trong tháng {selectedMonth}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chuyên cần tốt (≥ 80%)</span>
              <div className="text-2xl font-black text-emerald-600 mt-2 flex items-baseline gap-1">
                <span>{summaryStats.goodCount}</span> <span className="text-xs text-slate-400">học viên</span>
              </div>
              <p className="text-xs text-emerald-700 mt-1 font-medium">Đạt điều kiện thi kết thúc môn</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cần lưu ý (60% - 79%)</span>
              <div className="text-2xl font-black text-amber-600 mt-2 flex items-baseline gap-1">
                <span>{summaryStats.warningCount}</span> <span className="text-xs text-slate-400">học viên</span>
              </div>
              <p className="text-xs text-amber-600 mt-1 font-medium">Nhắc nhở học bù kịp thời</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nguy cơ cấm thi (&lt; 60%)</span>
              <div className="text-2xl font-black text-rose-600 mt-2 flex items-baseline gap-1">
                <span>{summaryStats.badCount}</span> <span className="text-xs text-slate-400">học viên</span>
              </div>
              <p className="text-xs text-rose-500 mt-1 font-medium">Vắng quá số buổi quy định</p>
            </div>
          </div>

          {/* Control Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã SV, họ tên..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Chọn tháng / năm */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Chọn tháng:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-indigo-600 bg-white"
                />
              </div>

              {/* Lọc theo lớp */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Lớp học:</span>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-indigo-600 bg-white"
                >
                  <option value="ALL">-- Tất cả lớp học --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">STT</th>
                    <th className="px-4 py-3 whitespace-nowrap">Mã SV</th>
                    <th className="px-4 py-3 whitespace-nowrap">Họ & Tên</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Tổng buổi</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Có mặt</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Điểm danh bù</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Đi muộn</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Vắng phép</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Vắng K.phép</th>
                    <th className="px-4 py-3 whitespace-nowrap">Tỷ lệ chuyên cần (%)</th>
                    <th className="px-4 py-3 whitespace-nowrap">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <RotateCw size={20} className="animate-spin mx-auto mb-2 text-indigo-600" />
                        Đang tổng hợp dữ liệu chuyên cần...
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        Không có dữ liệu chuyên cần nào trong tháng {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((st, idx) => {
                      const stt = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={st.studentId} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 text-slate-400 font-mono text-center">{stt}</td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">{st.studentId}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{st.studentName}</td>
                          <td className="px-4 py-3 font-mono text-center font-bold text-slate-700">{st.totalSlots}</td>
                          <td className="px-4 py-3 font-mono text-center text-emerald-700 font-bold">{st.presentCount}</td>
                          <td className="px-4 py-3 font-mono text-center text-purple-700 font-semibold">{st.makeupCount}</td>
                          <td className="px-4 py-3 font-mono text-center text-amber-700 font-semibold">{st.lateCount}</td>
                          <td className="px-4 py-3 font-mono text-center text-blue-700 font-semibold">{st.excusedCount}</td>
                          <td className="px-4 py-3 font-mono text-center text-rose-700 font-bold">{st.unexcusedCount}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    st.rate >= 80 ? 'bg-emerald-500' : st.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, st.rate))}%` }}
                                />
                              </div>
                              <span className="font-mono font-extrabold text-slate-800">{st.rate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              st.rate >= 80 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : st.rate >= 60 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {st.rate >= 80 ? 'Tốt / Đạt' : st.rate >= 60 ? 'Cần cải thiện' : 'Cảnh báo vắng'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={size => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="học viên"
            />
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
