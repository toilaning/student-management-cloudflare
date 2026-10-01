'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { CalendarCheck2, ArrowRightLeft, CalendarDays, BookOpen, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

export default function TeacherDashboardPage() {
  const { currentUser, isReady } = useApp();
  const [classes, setClasses] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const [clsRes, slotsRes, reqRes] = await Promise.all([
          fetch(`/api/classes?teacherId=${currentUser?.id || ""}`),
          fetch(`/api/schedule?teacherId=${currentUser?.id || ""}`),
          fetch(`/api/requests?teacherId=${currentUser?.id || ""}`),
        ]);

        const clsData = await clsRes.json();
        const slotsData = await slotsRes.json();
        const reqData = await reqRes.json();

        setClasses(clsData.classes || []);
        setSlots(slotsData.slots || []);
        setRequests(reqData.requests || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const todaySlots = slots.filter(s => s.date === new Date().toISOString().split('T')[0]);

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
        <Header 
          title="Bàn Làm Việc Giảng Viên" 
          subtitle="Đơn giản như Flappy Bird • Thao tác 5 giây • Bấm nút to bản vào việc ngay" 
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
          {/* TOP WELCOME */}
          <div className="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {currentUser?.name?.charAt(0) || 'G'}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Chào Thầy/Cô {currentUser?.name || ''}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Mã GV: <span className="font-mono font-bold text-amber-600">{currentUser?.id}</span> • Chuyên môn đào tạo Atelier
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200 text-xs">
                {slots.length} ca dạy được phân công
              </span>
            </div>
          </div>

          {/* 4 BIG ACTION TILES DÀNH CHO GIẢNG VIÊN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* NÚT 1: HÔM NAY CÓ CA NÀO? BẤM ĐIỂM DANH NGAY */}
            <Link
              href="/teacher/attendance"
              className="group p-6 sm:p-7 rounded-3xl border-3 border-emerald-400 bg-emerald-50 hover:bg-emerald-100/80 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                  Điểm danh lớp
                </span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <CalendarCheck2 size={26} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-tight">
                  {todaySlots.length > 0 ? `Hôm nay có ${todaySlots.length} ca giảng dạy` : 'Sổ điểm danh các ca học'}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight mt-1 leading-snug">
                  HÔM NAY CÓ CA NÀO? BẤM ĐIỂM DANH NGAY
                </h3>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  1-Click Lưu Ngay • Có mặt, Nghỉ phép, Không phép • Bỏ đi muộn
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs font-black text-emerald-800">
                <span>Vào điểm danh 5 giây</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* NÚT 2: NHẬT KÝ ĐỔI CA MỚI */}
            <Link
              href="/teacher/requests"
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
                  {requests.length} Lượt đổi ca học sinh
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight mt-1 leading-snug">
                  NHẬT KÝ ĐỔI CA MỚI
                </h3>
                <p className="text-xs text-purple-700 font-semibold mt-1">
                  Mở ra liếc mắt là biết học sinh nào vừa đổi ca • Không cần duyệt
                </p>
              </div>

              <div className="pt-2 border-t border-purple-200 flex items-center justify-between text-xs font-black text-purple-800">
                <span>Xem danh sách học sinh đổi ca</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* NÚT 3: LỊCH DẠY CỦA TÔI */}
            <Link
              href="/teacher/schedule"
              className="group p-6 sm:p-7 rounded-3xl border-3 border-indigo-300 bg-indigo-50 hover:bg-indigo-100/80 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                  Lịch đào tạo
                </span>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <CalendarDays size={26} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-indigo-800 uppercase tracking-tight font-mono">
                  {slots.length} Ca dạy trên lịch
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight mt-1 leading-snug">
                  LỊCH DẠY & LỚP HỌC
                </h3>
                <p className="text-xs text-indigo-700 font-semibold mt-1">
                  Khung giờ các ca chiều, tối, đêm • Link Google Meet / Phòng xưởng
                </p>
              </div>

              <div className="pt-2 border-t border-indigo-200 flex items-center justify-between text-xs font-black text-indigo-800">
                <span>Xem thời khóa biểu chi tiết</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* NÚT 4: CÁC LỚP HỌC PHỤ TRÁCH */}
            <Link
              href="/teacher/classes"
              className="group p-6 sm:p-7 rounded-3xl border-3 border-amber-300 bg-amber-50 hover:bg-amber-100/80 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                  Lớp học phụ trách
                </span>
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <BookOpen size={26} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-amber-800 uppercase tracking-tight">
                  {classes.length} Lớp đang giảng dạy
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight mt-1 leading-snug">
                  LỚP HỌC PHỤ TRÁCH
                </h3>
                <p className="text-xs text-amber-700 font-semibold mt-1">
                  Danh sách học sinh từng lớp • Theo dõi tiến độ khối V, khối H
                </p>
              </div>

              <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-black text-amber-800">
                <span>Xem các lớp xưởng</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
