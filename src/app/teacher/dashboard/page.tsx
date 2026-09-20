'use client';

import { TeacherHomeworkWidget } from '@/components/homework/TeacherHomeworkWidget';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
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
          fetch(`/api/payroll?teacherId=${currentUser?.id || ""}&month=2026-09`),
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
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title={`Không gian Giảng viên: ${currentUser?.name || ""}`} 
          subtitle={`Mã giáo viên: ${currentUser?.id || ""} • Chuyên môn đào tạo & Quản lý lớp học`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lớp phụ trách</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BookOpen size={20} /></span>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-800">{classes.length} Lớp</div>
              <p className="text-xs text-slate-400 mt-1">Đang triển khai trong kỳ 09/2026</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tiết dạy đã hoàn thành</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></span>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-800">{completedSlots} / {slots.length} Tiết</div>
              <p className="text-xs text-slate-400 mt-1">Tiến độ giảng dạy tháng 09/2026</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Yêu cầu từ học viên</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Inbox size={20} /></span>
              </div>
              <div className="mt-3 text-2xl font-bold text-amber-600">{pendingRequests} Chờ duyệt</div>
              <p className="text-xs text-slate-400 mt-1">Đơn xin nghỉ & đổi lịch học</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thù lao ước tính T9</span>
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock size={20} /></span>
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-800">
                {payroll ? `${(payroll.netSalary / 1000000).toFixed(1)}M đ` : '0 đ'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Dựa trên {payroll?.completedSlots || 0} ca dạy thực tế</p>
            </div>
          </div>

          {/* Widget Quản lý & Giao bài tập vẽ */}
          <div className="mb-6">
            <TeacherHomeworkWidget teacherId={currentUser?.id} title="Quản lý & Giao bài tập vẽ" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lịch dạy gần nhất */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
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
                          title="Vào phòng học Discord"
                        >
                          <Headphones size={12} />
                          <span>Vào phòng học Discord</span>
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4 flex flex-col">
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
