'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { 
  ArrowRightLeft, 
  CreditCard, 
  CalendarDays, 
  CalendarCheck2, 
  ArrowRight, 
  Sparkles, 
  GraduationCap, 
  Clock 
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const { currentUser, isReady } = useApp();
  const [student, setStudent] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
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

        const [stData, slotsData, finData, reqData] = await Promise.all([
          fetchSafe(`/api/students?id=${currentUser?.id || ''}`),
          fetchSafe(`/api/schedule?studentId=${currentUser?.id || ''}`),
          fetchSafe(`/api/finance?studentId=${currentUser?.id || ''}`),
          fetchSafe(`/api/requests?studentId=${currentUser?.id || ''}`),
        ]);

        setStudent(stData.student || null);
        setSlots(slotsData.slots || []);
        setInvoices(finData.invoices || []);
        setRequests(reqData.requests || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const unpaidInvoices = invoices.filter(
    (i: any) => i.status === 'Còn nợ' || i.status === 'Chờ thanh toán' || i.status === 'Quá hạn'
  );
  const remaining = student?.remainingSessions ?? 12;
  const nextSlot = slots.length > 0 ? slots[0] : null;

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
        <Header 
          title="Góc Học Tập Học Viên" 
          subtitle="Đơn giản như Flappy Bird • Thao tác 5 giây • Bấm nút to bản vào việc ngay" 
        />

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
          {/* TOP WELCOME STRIP */}
          <div className="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {currentUser?.name?.charAt(0) || 'H'}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Chào bạn {currentUser?.name || ''}
                </h2>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Mã HV: {currentUser?.id}
                  </span>
                  <span>•</span>
                  <span>{student?.gradeLevel || 'Lớp 12'}</span>
                  <span>•</span>
                  <span className="font-bold text-slate-700">
                    {student?.examBlock === 'KHOI_H' ? 'Khối H' : 'Khối V'}
                  </span>
                  <span>•</span>
                  <span className="text-indigo-600 font-bold">
                    Mục tiêu: {student?.targetUniversity === 'KHAC' ? student?.customUniversity : (student?.targetUniversity || 'HAU')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-emerald-50 border-2 border-emerald-200 px-4 py-2 rounded-2xl text-right">
                <span className="text-[10px] font-black uppercase text-emerald-700 block">Số buổi còn lại</span>
                <span className="text-xl font-black font-mono text-emerald-800">{remaining} buổi</span>
              </div>
            </div>
          </div>

          {/* 4 BIG ACTION TILES DÀNH CHO HỌC VIÊN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* NÚT 1: ĐỔI CA HỌC TỰ ĐỘNG (5S KHÔNG CẦN DUYỆT) */}
            <Link
              href="/student/requests"
              className="group p-6 sm:p-7 rounded-3xl border-3 border-indigo-400 bg-indigo-50 hover:bg-indigo-100/80 hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                  Tự do đổi ca
                </span>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <ArrowRightLeft size={26} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-indigo-800 uppercase tracking-tight">
                  {requests.length} Lần đổi ca đã thực hiện
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-indigo-950 tracking-tight mt-1 leading-snug">
                  ĐỔI CA HỌC TỰ ĐỘNG
                </h3>
                <p className="text-xs text-indigo-700 font-semibold mt-1">
                  Chuyển sang ca khác ngay lập tức • Không cần chờ quản lý hay giáo viên duyệt
                </p>
              </div>

              <div className="pt-2 border-t border-indigo-200 flex items-center justify-between text-xs font-black text-indigo-800">
                <span>Chọn ca và đổi trong 5 giây</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* NÚT 2: HỌC PHÍ & VIETQR */}
            <Link
              href="/student/tuition"
              className="group p-6 sm:p-7 rounded-3xl border-3 border-amber-300 bg-amber-50 hover:bg-amber-100/80 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                  Thanh toán tiện lợi
                </span>
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <CreditCard size={26} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-amber-800 uppercase tracking-tight">
                  {unpaidInvoices.length > 0 ? `${unpaidInvoices.length} Hoá đơn học phí cần nộp` : 'Đã thanh toán đủ'}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight mt-1 leading-snug">
                  HỌC PHÍ & VIETQR
                </h3>
                <p className="text-xs text-amber-700 font-semibold mt-1">
                  Mở mã QR nộp học phí ngân hàng tức thì • Tự động đối soát
                </p>
              </div>

              <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs font-black text-amber-800">
                <span>Xem học phí & Quét mã QR</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* NÚT 3: LỊCH HỌC CỦA BẠN */}
            <Link
              href="/student/schedule"
              className="group p-6 sm:p-7 rounded-3xl border-3 border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 hover:border-emerald-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                  Thời khóa biểu
                </span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <CalendarDays size={26} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-tight">
                  {nextSlot ? `Ca tiếp theo: [${nextSlot.date}] ${nextSlot.startTime}-${nextSlot.endTime}` : 'Thời khóa biểu chi tiết'}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight mt-1 leading-snug">
                  LỊCH HỌC TRONG TUẦN
                </h3>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  Xem khung giờ học chiều, tối, đêm • Link Google Meet / Phòng học
                </p>
              </div>

              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs font-black text-emerald-800">
                <span>Mở thời khóa biểu</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* NÚT 4: ĐĂNG KÝ LỚP HỌC MỚI */}
            <Link
              href="/student/classes"
              className="group p-6 sm:p-7 rounded-3xl border-3 border-purple-300 bg-purple-50 hover:bg-purple-100/80 hover:border-purple-400 hover:shadow-lg transition-all flex flex-col justify-between space-y-4 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
                  Môn học & Lớp xưởng
                </span>
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <GraduationCap size={26} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-purple-800 uppercase tracking-tight">
                  Khối V & Khối H
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight mt-1 leading-snug">
                  ĐĂNG KÝ LỚP HỌC
                </h3>
                <p className="text-xs text-purple-700 font-semibold mt-1">
                  Khám phá các lớp vẽ mỹ thuật, tĩnh vật, đầu tượng, trang trí màu
                </p>
              </div>

              <div className="pt-2 border-t border-purple-200 flex items-center justify-between text-xs font-black text-purple-800">
                <span>Xem danh mục lớp</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
