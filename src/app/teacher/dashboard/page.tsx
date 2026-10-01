'use client';


import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { LiveSessionTracker } from '@/components/attendance/LiveSessionTracker';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { BookOpen, CalendarDays, Clock, CheckCircle2, Inbox, ArrowRight, Headphones } from 'lucide-react';
import Link from 'next/link';

export default function TeacherDashboardPage() {
  const { currentUser, isReady } = useApp();
  const [classes, setClasses] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const [clsRes, slotsRes, reqRes, payRes] = await Promise.all([
          fetch(`/api/classes?teacherId=${currentUser?.id || ""}`),
          fetch(`/api/schedule?teacherId=${currentUser?.id || ""}`),
          fetch(`/api/requests?teacherId=${currentUser?.id || ""}`),
          Promise.resolve({ json: () => ({ payroll: null }) }),
        ]);

        const clsData = await clsRes.json();
        const slotsData = await slotsRes.json();
        const reqData = await reqRes.json();
        const payData = await payRes.json();

        setClasses(clsData.classes || []);
        setSlots(slotsData.slots || []);
        setRequests(reqData.requests || []);
        setPayroll(payData.payroll || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const completedSlots = slots.filter(s => s.status === 'Đã hoàn thành').length;
  const pendingRequests = requests.filter(r => r.status === 'CHỜ_DUYỆT').length;

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 font-sans text-slate-800">
        <Header 
          title={`Không gian Giảng viên: ${currentUser?.name || ""}`} 
          subtitle={`Mã giáo viên: ${currentUser?.id || ""} • Chuyên môn đào tạo & Quản lý lớp học`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Metric Cards - Giảng viên Atelier Studio */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Lớp xưởng phụ trách</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <BookOpen size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 tracking-tight">{classes.length}</span>
                <span className="text-xs text-slate-400 font-medium">lớp trực tuyến</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Kỳ đào tạo 100% Online Discord
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Ca dạy hoàn thành</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">{completedSlots}</span>
                <span className="text-xs text-slate-400 font-medium">/ {slots.length} ca</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Tiến độ giảng dạy theo lịch phân công
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Đơn từ học viên</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                  <Inbox size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-700 tracking-tight">{pendingRequests}</span>
                <span className="text-xs text-slate-400 font-medium">chờ xem xét</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Đơn xin nghỉ & đổi ca học viên
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Thù lao tính theo ca</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                  <Clock size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-700 tracking-tight">
                  {payroll ? `${(payroll.netSalary / 1000000).toFixed(1)}M` : '0'}
                </span>
                <span className="text-xs text-slate-400 font-medium">VNĐ</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                Tính tự động theo số ca dạy hoàn thành
              </div>
            </div>
          </section>

          
          {/* Live Attendance Tracking */}
          <div className="mb-6">
            <LiveSessionTracker teacherId={currentUser?.id} attendancePathPrefix="/teacher/attendance" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lịch dạy gần nhất */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Lịch Dạy Sắp Tới (Tháng 09/2026)</h3>
                  <p className="text-xs text-slate-400">Các ca học gần nhất cần chuẩn bị giáo án</p>
                </div>
                <Link href="/teacher/schedule" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  Xem tất cả ({slots.length}) <ArrowRight size={14} />
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {slots.slice(0, 5).map(slot => (
                  <div key={slot.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-center min-w-[50px]">
                        <span className="block font-bold text-slate-700">{slot.date.split('-')[2]}</span>
                        <span className="text-[10px] text-slate-400">Th{slot.date.split('-')[1]}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{slot.classId}</div>
                        <div className="text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{slot.startTime} - {slot.endTime}</span>
                          <span>•</span>
                          <span>Phòng {slot.roomId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.meetingLink ? (
                        <a
                          href={slot.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-medium transition text-[11px] inline-flex items-center gap-1"
                          title="Vào phòng học online"
                        >
                          <Headphones size={12} />
                          <span>Vào phòng học online</span>
                        </a>
                      ) : null}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        slot.status === 'Đã hoàn thành' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {slot.status}
                      </span>
                      <Link 
                        href={`/teacher/attendance?slotId=${slot.id}&classId=${slot.classId}`}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition text-[11px]"
                      >
                        Điểm danh
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Đơn từ gần đây */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Yêu cầu từ học viên</h3>
                  <p className="text-xs text-slate-400">Đơn xin nghỉ & đổi lịch mới nhất</p>
                </div>
                <Link href="/teacher/requests" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Xem tất cả
                </Link>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {requests.slice(0, 4).map(req => (
                  <div key={req.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{req.studentId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'ĐÃ_DUYỆT' ? 'bg-emerald-100 text-emerald-700' : (req.status === 'TỪ_CHỐI' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2">{req.reason}</p>
                    <div className="text-[10px] text-slate-400">{req.type === 'XIN_NGHI' ? 'Đơn xin nghỉ học' : 'Đơn đổi lịch'} • Lớp {req.classId}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
