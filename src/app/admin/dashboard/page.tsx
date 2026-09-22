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
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Radio,
  History,
  Coins
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
  const [openAuditTab, setOpenAuditTab] = useState(false);

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
        title="Bảng Điều Hành Trung Tâm" 
        subtitle="Giám sát ca học trực tiếp, tài chính và điều phối lớp học" 
      />

      <main className="p-6 space-y-5 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TAB 1: CA HỌC ĐANG HOẠT ĐỘNG (REAL-TIME) - MẶC ĐỊNH LUÔN MỞ */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div 
            onClick={() => setOpenLiveTab(!openLiveTab)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition select-none"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base">Lớp Học Đang Hoạt Động (Trực Tiếp)</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Tự động đối soát và cập nhật liên tục mọi lúc trong ca dạy</p>
              </div>
            </div>

            {/* Đồng hồ số trực tiếp + Ngày tháng */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-mono font-bold text-indigo-600 flex items-center gap-1.5 justify-end">
                  <Clock size={13} />
                  <span>{currentTime || 'Đang đồng bộ...'}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium capitalize">{currentDate}</div>
              </div>
              <div className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                {openLiveTab ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
          </div>

          {openLiveTab && (
            <div className="p-5 pt-0 border-t border-slate-100">
              <LiveSessionTracker attendancePathPrefix="/admin/attendance" />
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 2: CHỈ SỐ TỔNG QUAN & TÀI CHÍNH (THU CHI) - CÓ THỂ XỔ XUỐNG */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div 
            onClick={() => setOpenFinanceTab(!openFinanceTab)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Receipt size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Chỉ Số Tổng Quan & Thu Chi</h3>
                <p className="text-xs text-slate-400 mt-0.5">Thống kê học viên, lớp học và tiến độ học phí thực tế</p>
              </div>
            </div>
            <div className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              {openFinanceTab ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {openFinanceTab && (
            <div className="p-5 pt-0 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4">
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Tổng học viên</span>
                    <Users size={16} className="text-indigo-600" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-800">{stats.totalStudents}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Đã mã hóa định danh năm</p>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Giáo viên & Lớp</span>
                    <GraduationCap size={16} className="text-blue-600" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-800">{stats.totalTeachers} GV / {stats.totalClasses} Lớp</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Phân bổ đều 5 ca học</p>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Học phí đã thu</span>
                    <Receipt size={16} className="text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-emerald-600">
                    {(stats.totalRevenue / 1_000_000).toFixed(1)} Tr <span className="text-xs text-slate-400 font-normal">VNĐ</span>
                  </div>
                  <p className="text-[11px] text-amber-600 mt-0.5 font-medium">Còn nợ: {(stats.outstandingDebt / 1_000_000).toFixed(1)} Tr VNĐ</p>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Sổ Thu - Chi & Lớp</span>
                    <BookOpen size={16} className="text-purple-600" />
                  </div>
                  <div className="mt-2 text-xs font-bold text-indigo-600 flex flex-col gap-1">
                    <Link href="/admin/tuition" className="hover:underline flex items-center gap-1">
                      <span>Quản lý học phí & gói</span> <ArrowUpRight size={12} />
                    </Link>
                    <Link href="/admin/classes" className="hover:underline flex items-center gap-1">
                      <span>Quản lý lớp học</span> <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 3: LỊCH HỌC TIÊU BIỂU & NHẬT KÝ HỆ THỐNG - CÓ THỂ XỔ XUỐNG */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div 
            onClick={() => setOpenScheduleTab(!openScheduleTab)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <CalendarDays size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Lịch Học & Nhật Ký Hoạt Động</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ca học trong ngày và biến động kiểm toán hệ thống</p>
              </div>
            </div>
            <div className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              {openScheduleTab ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {openScheduleTab && (
            <div className="p-5 pt-0 border-t border-slate-100">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4">
                {/* Lịch học hôm nay */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Lịch học hôm nay</h4>
                    <Link href="/admin/calendar" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                      Xem toàn bộ <ArrowUpRight size={13} />
                    </Link>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {todaySlots.length > 0 ? (
                      todaySlots.map(slot => (
                        <div key={slot.id} className="p-3 bg-slate-50/50 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-[11px]">
                              C{slot.shiftId}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800">{slot.subject} ({slot.classId})</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {slot.startTime} - {slot.endTime} • Phòng: {slot.roomId} • GV: {slot.teacherId}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {slot.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs">Đang tải lịch học...</div>
                    )}
                  </div>
                </div>

                {/* Nhật ký hoạt động */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Nhật ký kiểm toán</h4>
                    <Link href="/admin/audit" className="text-xs font-semibold text-indigo-600 hover:underline">
                      Tất cả
                    </Link>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-700 truncate">{log.userName}</span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Quick Student Popover Modal */}
      <QuickStudentModal 
        studentId={selectedStudentId} 
        onClose={() => setSelectedStudentId(null)} 
      />
    </div>
  );
}
