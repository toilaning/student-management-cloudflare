'use client';

import { getTodayDateStr } from '@/utils/date';
import React, { useEffect, useState } from 'react';
import { Header } from '@/components/common/Header';
import { LiveSessionTracker } from '@/components/attendance/LiveSessionTracker';
import { QuickStudentModal } from '@/components/common/QuickStudentModal';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Receipt, 
  CalendarDays, 
  ArrowUpRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  ShieldCheck,
  TrendingUp,
  Building2,
  CalendarCheck2
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

  // Accordion Tab States: Mặc định tab 1 (Live Session) luôn mở (true), các tab khác đóng (false)
  const [openLiveTab, setOpenLiveTab] = useState(true);
  const [openFinanceTab, setOpenFinanceTab] = useState(false);
  const [openScheduleTab, setOpenScheduleTab] = useState(false);

  // Quick Student Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Live Clock (Giờ : Phút : Giây) & Ngày tháng
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

        const [tuitionData, logsData, slotsData] = await Promise.all([
          fetchSafe('/api/finance'),
          fetchSafe('/api/audit'),
          fetchSafe(`/api/schedule?date=${getTodayDateStr()}`),
        ]);

        let totalRevenue = 0;
        let outstandingDebt = 0;
        if (tuitionData.invoices) {
          tuitionData.invoices.forEach((inv: any) => {
            totalRevenue += inv.paidAmount;
            outstandingDebt += inv.remainingAmount;
          });
        }

        setStats({
          totalStudents: 400,
          totalTeachers: 20,
          totalClasses: 30,
          totalRevenue,
          totalPayroll: 0,
          outstandingDebt,
        });

        setRecentLogs(logsData.logs ? logsData.logs.slice(0, 8) : []);
        setTodaySlots(slotsData.slots ? slotsData.slots.slice(0, 6) : []);
      } catch (e) {
        console.error('Error loading dashboard stats:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 font-sans text-slate-800">
      <Header 
        title="Bảng Điều Hành Trung Tâm" 
        subtitle="Giám sát ca học trực tiếp, quản trị nguồn lực và kiểm toán vận hành atelier" 
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TOP ATELIER METRIC STRIP (Clean Architectural Grid - No ) */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Học viên */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Tổng Học Viên</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Users size={15} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                {stats.totalStudents}
              </span>
              <span className="text-xs text-slate-400 font-medium">hồ sơ</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Đã chuẩn hóa định danh YYxxx
            </div>
          </div>

          {/* 2. Giảng viên & Phòng xưởng */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Giảng Viên / Ca Xưởng</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <GraduationCap size={15} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                {stats.totalTeachers}
              </span>
              <span className="text-xs text-slate-400 font-medium">GV /</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-slate-700 tracking-tight">
                {stats.totalClasses}
              </span>
              <span className="text-xs text-slate-400 font-medium">lớp</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              Điều phối 5 ca học cố định
            </div>
          </div>

          {/* 3. Học phí đã thu */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Học Phí Thu Thực Tế</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <Receipt size={15} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                {(stats.totalRevenue / 1_000_000).toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-500">Tr VNĐ</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <ArrowUpRight size={13} />
              Tự động kết toán hóa đơn
            </div>
          </div>

          {/* 4. Dư nợ kỳ hiện tại */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Dư Nợ Cần Thu</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Activity size={15} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-700 tracking-tight">
                {(stats.outstandingDebt / 1_000_000).toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-500">Tr VNĐ</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-700 font-medium">
              Chờ đối soát & nhắc phí
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TAB 1: CA HỌC TRỰC TIẾP (LIVE SESSION TRACKER) - ATELIER CLEAN */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div 
            onClick={() => setOpenLiveTab(!openLiveTab)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                    Lớp Học Đang Hoạt Động (Trực Tiếp)
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/80 tracking-wider uppercase">
                    Live Session
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giám sát sĩ số và cập nhật điểm danh thời gian thực theo từng ca xưởng
                </p>
              </div>
            </div>

            {/* Đồng hồ số thời gian thực tinh gọn */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1.5 justify-end">
                  <Clock size={13} className="text-emerald-600" />
                  <span>{currentTime || 'Đang đồng bộ...'}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium capitalize mt-0.5">
                  {currentDate}
                </div>
              </div>
              <div className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                {openLiveTab ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
          </div>

          {openLiveTab && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100">
              <LiveSessionTracker attendancePathPrefix="/admin/attendance" />
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* TAB 2: QUẢN TRỊ TÀI CHÍNH & SỔ SÁCH ATELIER */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div 
            onClick={() => setOpenFinanceTab(!openFinanceTab)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Receipt size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                  Chỉ Số Tài Chính & Sổ Thu Chi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Điều phối gói học phí, công nợ và sổ đăng ký học viên
                </p>
              </div>
            </div>
            <div className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
              {openFinanceTab ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {openFinanceTab && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-3">
                <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Tiến độ thanh toán tháng</span>
                    <TrendingUp size={15} className="text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                    {(stats.totalRevenue / 1_000_000).toFixed(2)} Tr VNĐ
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Đã thanh toán đầy đủ trên hệ thống
                  </p>
                </div>

                <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Công nợ học phí chưa thu</span>
                    <Activity size={15} className="text-amber-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold font-mono text-amber-700">
                    {(stats.outstandingDebt / 1_000_000).toFixed(2)} Tr VNĐ
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cần rà soát và gửi thông báo kỳ mới
                  </p>
                </div>

                <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Truy cập nhanh danh mục</span>
                    <BookOpen size={15} className="text-slate-600" />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-700 flex flex-col gap-2">
                    <Link 
                      href="/admin/tuition" 
                      className="hover:text-emerald-700 flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-emerald-300 transition-colors"
                    >
                      <span>Quản lý học phí & gói học</span>
                      <ArrowUpRight size={13} className="text-slate-400" />
                    </Link>
                    <Link 
                      href="/admin/classes" 
                      className="hover:text-emerald-700 flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/70 hover:border-emerald-300 transition-colors"
                    >
                      <span>Quản lý lớp học & lịch cố định</span>
                      <ArrowUpRight size={13} className="text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* TAB 3: CA HỌC HÔM NAY & NHẬT KÝ VẬN HÀNH (CLEAN SPLIT) */}
        {/* ========================================================================= */}
        <section className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div 
            onClick={() => setOpenScheduleTab(!openScheduleTab)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <CalendarDays size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                  Lịch Học Trong Ngày & Nhật Ký Kiểm Toán
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phân bổ ca trực và lịch sử thao tác vận hành xưởng
                </p>
              </div>
            </div>
            <div className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
              {openScheduleTab ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {openScheduleTab && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-3">
                {/* Lịch học hôm nay */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarCheck2 size={14} className="text-slate-500" />
                      Lịch học hôm nay
                    </h4>
                    <Link 
                      href="/admin/calendar" 
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    >
                      <span>Xem toàn bộ lịch xưởng</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                    {todaySlots.length > 0 ? (
                      todaySlots.map(slot => (
                        <div key={slot.id} className="p-3 sm:p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between text-xs gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center font-mono font-bold text-slate-800 text-[11px] shrink-0">
                              C{slot.shiftId}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {slot.subject} <span className="font-mono text-slate-500 font-normal">({slot.classId})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-slate-700 font-medium">{slot.startTime} - {slot.endTime}</span>
                                <span>•</span>
                                <span>Phòng: <strong className="text-slate-700">{slot.roomId}</strong></span>
                                <span>•</span>
                                <span>GV: <strong className="text-slate-700">{slot.teacherId}</strong></span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/70 shrink-0">
                            {slot.status || 'Kế hoạch'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Hôm nay không có ca học nào được xếp lịch.
                      </div>
                    )}
                  </div>
                </div>

                {/* Nhật ký hoạt động */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-slate-500" />
                      Nhật ký kiểm toán
                    </h4>
                    <Link 
                      href="/admin/audit" 
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
                    >
                      Toàn bộ
                    </Link>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {recentLogs.length > 0 ? (
                      recentLogs.map((log) => (
                        <div key={log.id} className="text-xs p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/70 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 truncate">{log.userName || 'Hệ thống'}</span>
                            <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                            {log.details}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs bg-slate-50/50 rounded-lg border border-slate-200/70">
                        Chưa có ghi nhận kiểm toán mới.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Quick Student Popover Modal */}
      <QuickStudentModal 
        studentId={selectedStudentId} 
        onClose={() => setSelectedStudentId(null)} 
      />
    </div>
  );
}
