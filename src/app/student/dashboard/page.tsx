'use client';

import { StudentHomeworkWidget } from '@/components/homework/StudentHomeworkWidget';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Video, ExternalLink, CalendarDays, FileCheck, Receipt, Inbox, ArrowRight, Clock, AlertCircle, CheckCircle2, Headphones } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const { currentUser, isReady } = useApp();
  const [student, setStudent] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
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

        const [stData, slotsData, attData, finData, reqData] = await Promise.all([
          fetchSafe(`/api/students?id=${currentUser?.id || ""}`),
          fetchSafe(`/api/schedule?studentId=${currentUser?.id || ""}`),
          fetchSafe(`/api/attendance?studentId=${currentUser?.id || ""}`),
          fetchSafe(`/api/finance?studentId=${currentUser?.id || ""}&summary=true`),
          fetchSafe(`/api/requests?studentId=${currentUser?.id || ""}`),
        ]);

        setStudent(stData.student || null);
        setSlots(slotsData.slots || []);
        setAttendance(attData.records || []);
        setFinanceSummary(finData || null);
        setRequests(reqData.requests || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const presentCount = attendance.filter(a => a.status === 'Có mặt').length;
  const absentCount = attendance.filter(a => a.status.includes('Vắng')).length;
  const attendanceRate = attendance.length > 0 
    ? ((presentCount / attendance.length) * 100).toFixed(0) 
    : 100;

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title={`Góc Học Tập: ${currentUser?.name || ""}`} 
          subtitle={`Mã học viên: ${currentUser?.id || ""} • Theo dõi tiến độ & chuyên cần cá nhân`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Banner Welcome */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Học kỳ Tháng 09/2026
              </span>
              <h2 className="text-2xl font-bold mt-2">Xin chào, {currentUser?.name}!</h2>
              <p className="text-emerald-100 text-xs mt-1">
                Bạn đang theo học <strong className="text-white">{student?.enrolledClassIds?.length || 1} lớp</strong> tại trung tâm. Hãy kiểm tra thời khóa biểu và hoàn thành đúng hạn nhé.
              </p>
            </div>
            <Link
              href="/student/schedule"
              className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-sm transition shrink-0 w-full sm:w-auto text-center whitespace-nowrap"
            >
              Xem lịch học tuần này
            </Link>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tỉ lệ chuyên cần</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></span>
              </div>
              <div className="mt-3 text-2xl font-bold text-emerald-600">{attendanceRate}%</div>
              <p className="text-xs text-slate-400 mt-1">Có mặt {presentCount} / {attendance.length} buổi</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số buổi vắng</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={20} /></span>
              </div>
              <div className="mt-3 text-2xl font-bold text-amber-600">{absentCount} Buổi</div>
              <p className="text-xs text-slate-400 mt-1">Mức cảnh báo tối đa: 3 buổi</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Công nợ học phí</span>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Receipt size={20} /></span>
              </div>
              <div className="mt-3 text-2xl font-bold text-rose-600 whitespace-nowrap">
                {financeSummary ? (financeSummary.totalDebt / 1_000_000).toFixed(1) : 0} Tr
              </div>
              <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">
                Đã nộp: {financeSummary ? (financeSummary.totalPaid / 1_000_000).toFixed(1) : 0} triệu đ
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đơn đã gửi</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Inbox size={20} /></span>
              </div>
              <div className="mt-3 text-2xl font-bold text-blue-600">{requests.length} Đơn</div>
              <p className="text-xs text-slate-400 mt-1">Xin nghỉ / Đề xuất đổi ca</p>
            </div>
          </div>

          {/* Lịch học & Đơn từ */}
          {/* Widget Bài tập cần hoàn thành */}
          {currentUser?.id && (
            <StudentHomeworkWidget studentId={currentUser.id} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-emerald-600" size={20} />
                  <h2 className="font-bold text-slate-800 text-base">Buổi học sắp tới (Tháng 09/2026)</h2>
                </div>
                <Link href="/student/schedule" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                  Toàn bộ lịch <ArrowRight size={14} />
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {slots.slice(0, 5).map(slot => (
                  <div key={slot.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-emerald-700">
                        <span className="text-[10px] font-bold">Ca {slot.shiftId}</span>
                        <span className="text-[9px] text-emerald-600">{slot.date.slice(8)}/09</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">{slot.subject} ({slot.classId})</div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                          <span className="whitespace-nowrap">{slot.startTime} - {slot.endTime}</span>
                          <span className="text-slate-300">•</span>
                          <span className="whitespace-nowrap">GV: <strong className="text-slate-700">{slot.teacherId}</strong></span>
                          <span className="text-slate-300">•</span>
                          {slot.meetingLink ? (
                            <a 
                              href={slot.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Headphones size={12} className="shrink-0" /> Vào phòng học Discord <ExternalLink size={10} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic whitespace-nowrap">Chưa gắn link</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 ${
                      slot.status === 'Đã hoàn thành' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {slot.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-base">Trạng thái đơn từ</h2>
                <Link href="/student/requests" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
                  Gửi đơn mới
                </Link>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {requests.slice(0, 4).map(req => (
                  <div key={req.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {req.type === 'XIN_NGHI' ? 'Nghỉ học' : 'Đổi lịch'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'ĐÃ_DUYỆT' ? 'bg-emerald-100 text-emerald-700' : (req.status === 'TỪ_CHỐI' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2">{req.reason}</p>
                    {req.reviewNote && (
                      <p className="text-[11px] text-indigo-600 italic bg-white p-1.5 rounded border border-slate-100">
                        Thầy/cô: {req.reviewNote}
                      </p>
                    )}
                  </div>
                ))}

                {requests.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Chưa gửi đơn xin phép nào.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
