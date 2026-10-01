'use client';

import { getTodayDateStr } from '@/utils/date';
import React, { useEffect, useState } from 'react';
import { Header } from '@/components/common/Header';
import { 
  Users, 
  CalendarCheck2, 
  Coins, 
  ArrowRightLeft, 
  Clock, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 400,
    todaySlotsCount: 0,
    unpaidCount: 0,
    shiftChangeCount: 0,
    todayShiftName: 'Ca Tối (18:00 - 21:00)',
    nextSlotInfo: 'Đang tải lịch...',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Live Clock (Giờ : Phút : Giây)
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

        const todayStr = getTodayDateStr();
        const [tuitionData, slotsData, reqData, stuData] = await Promise.all([
          fetchSafe('/api/finance'),
          fetchSafe(`/api/schedule?date=${todayStr}`),
          fetchSafe('/api/requests'),
          fetchSafe('/api/students?limit=1000'),
        ]);

        const todaySlots = slotsData.slots || [];
        const invoices = tuitionData.invoices || [];
        const unpaid = invoices.filter((i: any) => i.status === 'Còn nợ' || i.status === 'Chờ thanh toán' || i.status === 'Quá hạn').length;
        const requests = reqData.requests || [];
        const students = stuData.students || [];

        setStats({
          totalStudents: students.length > 0 ? students.length : 400,
          todaySlotsCount: todaySlots.length,
          unpaidCount: unpaid,
          shiftChangeCount: requests.length,
          todayShiftName: todaySlots.length > 0 ? `${todaySlots[0].subject} (${todaySlots[0].startTime}-${todaySlots[0].endTime})` : 'Hôm nay: Ca Tối 18:00 - 21:00',
          nextSlotInfo: todaySlots.length > 0 ? `Phòng ${todaySlots[0].roomId} • ${todaySlots[0].classId}` : 'Sẵn sàng tiếp nhận học viên',
        });
      } catch (e) {
        console.error('Error loading dashboard stats:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header 
        title="Trang Chủ Quản Trị" 
        subtitle="Đơn giản như Flappy Bird • Thao tác 5 giây • Bấm nút to bản là vào việc ngay" 
      />

      <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
        {/* TOP STATUS STRIP: LIVE CLOCK & QUICK WELCOME */}
        <div className="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-mono font-black text-xl shadow-xs">
              ⚡
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Bàn Làm Việc Thầy Thuyết
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {currentDate} • <span className="font-mono font-bold text-indigo-600">{currentTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Hệ thống vận hành trơn tru
            </span>
          </div>
        </div>

        {/* 4 BIG ACTION TILES (FLAPPY BIRD / MOBILE APP VIBE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* NÚT 1: HÔM NAY CÓ CA NÀO? BẤM ĐIỂM DANH NGAY */}
          <Link
            href="/admin/attendance"
            className="group p-6 sm:p-7 rounded-3xl border-3 border-emerald-400 bg-emerald-50 hover:bg-emerald-100/80 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                Ưu tiên số 1
              </span>
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <CalendarCheck2 size={26} />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-tight">
                {stats.todaySlotsCount > 0 ? `Hôm nay có ${stats.todaySlotsCount} ca học` : 'Điểm danh buổi hôm nay'}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight mt-1 leading-snug">
                HÔM NAY CÓ CA NÀO? BẤM ĐIỂM DANH NGAY
              </h3>
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                {stats.todayShiftName} • 1-Click Có mặt / Nghỉ phép
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs font-black text-emerald-800">
              <span>Mở sổ điểm danh siêu tốc (5s)</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* NÚT 2: DANH SÁCH HỌC VIÊN */}
          <Link
            href="/admin/students"
            className="group p-6 sm:p-7 rounded-3xl border-3 border-indigo-300 bg-indigo-50 hover:bg-indigo-100/80 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                Quản lý học sinh
              </span>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Users size={26} />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-indigo-800 uppercase tracking-tight font-mono">
                {stats.totalStudents} Học viên đang đào tạo
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight mt-1 leading-snug">
                DANH SÁCH HỌC VIÊN
              </h3>
              <p className="text-xs text-indigo-700 font-semibold mt-1">
                Lọc Khối V, Khối H, trường ĐH mục tiêu, điều chỉnh số buổi còn lại
              </p>
            </div>

            <div className="pt-2 border-t border-indigo-200 flex items-center justify-between text-xs font-black text-indigo-800">
              <span>Xem danh sách toàn xưởng</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* NÚT 3: HỌC PHÍ CHƯA ĐÓNG */}
          <Link
            href="/admin/finance"
            className="group p-6 sm:p-7 rounded-3xl border-3 border-amber-300 bg-amber-50 hover:bg-amber-100/80 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                Tài chính & Thu chi
              </span>
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Coins size={26} />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-amber-800 uppercase tracking-tight">
                {stats.unpaidCount} Bạn chưa đóng học phí
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight mt-1 leading-snug">
                HỌC PHÍ CHƯA ĐÓNG
              </h3>
              <p className="text-xs text-amber-700 font-semibold mt-1">
                Gửi mã VietQR nhắc nộp • Xem tổng thu, tổng chi và lãi ròng
              </p>
            </div>

            <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-black text-amber-800">
              <span>Vào sổ thu - chi & học phí</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* NÚT 4: NHẬT KÝ ĐỔI CA MỚI */}
          <Link
            href="/admin/requests"
            className="group p-6 sm:p-7 rounded-3xl border-3 border-purple-300 bg-purple-50 hover:bg-purple-100/80 hover:border-purple-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                Đổi ca tự động
              </span>
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <ArrowRightLeft size={26} />
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-purple-800 uppercase tracking-tight">
                {stats.shiftChangeCount} Lượt đổi ca đã xử lý
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight mt-1 leading-snug">
                NHẬT KÝ ĐỔI CA MỚI
              </h3>
              <p className="text-xs text-purple-700 font-semibold mt-1">
                Tự động đổi không cần duyệt • Mở ra liếc mắt là biết ngay ai vừa đổi
              </p>
            </div>

            <div className="pt-2 border-t border-purple-200 flex items-center justify-between text-xs font-black text-purple-800">
              <span>Xem dòng thời gian đổi ca</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
