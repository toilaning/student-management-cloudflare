'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import {
  Video,
  ExternalLink,
  CalendarDays,
  FileCheck,
  Receipt,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Headphones,
  GraduationCap,
  Target,
  Sparkles,
  School,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const { currentUser, isReady } = useApp();
  const [student, setStudent] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Điểm danh nhanh: trạng thái theo từng slot
  const [checking, setChecking] = useState<string | null>(null);
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);
  const [checkinBadges, setCheckinBadges] = useState<Record<string, { status: string; time: string }>>({});

  // Giờ hiện tại theo múi giờ VN, dạng phút từ đầu ngày
  const getNowMinutesVN = () => {
    const nowStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Saigon',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
    const [h, m] = nowStr.split(':').map(Number);
    return h * 60 + m;
  };

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.trim().split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const getTodayStrVN = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Saigon' }).format(new Date());

  // Trạng thái điểm danh của 1 slot: trả về thông tin để render nút/badge
  const getSlotCheckinState = (slot: any) => {
    const todayStr = getTodayStrVN();
    // Ưu tiên badge mới point (sau khi bấm) hoặc record fetch sẵn
    const fresh = checkinBadges[slot.id];
    if (fresh) return { type: 'badge' as const, status: fresh.status, time: fresh.time };
    const existing = attendance.find(
      a => a.scheduleSlotId === slot.id && a.studentId === currentUser?.id,
    );
    if (existing && existing.status !== 'Chưa điểm danh') {
      return { type: 'badge' as const, status: existing.status, time: existing.checkinTime || '' };
    }
    // Ngoài ngày hôm nay
    if (slot.date !== todayStr) {
      return { type: 'disabled' as const, reason: 'Chưa đến giờ' };
    }
    // So giờ hiện tại với ca
    const nowMins = getNowMinutesVN();
    const startMins = timeToMinutes(slot.startTime);
    const endMins = timeToMinutes(slot.endTime);
    const isOvernight = startMins > endMins;
    if (isOvernight) {
      // Ca qua đêm: hợp lệ khi nowMins >= startMins hoặc nowMins <= endMins.
      const inShift = nowMins >= startMins || nowMins <= endMins;
      if (!inShift) {
        return { type: 'disabled' as const, reason: 'Chưa đến giờ' };
      }
    } else {
      if (nowMins < startMins) {
        return { type: 'disabled' as const, reason: 'Chưa đến giờ' };
      }
      if (nowMins > endMins) {
        return { type: 'disabled' as const, reason: 'Ca đã kết thúc' };
      }
    }
    return { type: 'enabled' as const };
  };

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
          fetchSafe(`/api/students?id=${currentUser?.id || ''}`),
          fetchSafe(`/api/schedule?studentId=${currentUser?.id || ''}`),
          fetchSafe(`/api/attendance?studentId=${currentUser?.id || ''}`),
          fetchSafe(`/api/finance?studentId=${currentUser?.id || ''}&summary=true`),
          fetchSafe(`/api/requests?studentId=${currentUser?.id || ''}`),
        ]);

        const st = stData.student || null;
        setStudent(st);
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


  const handleCheckin = async (slotId: string) => {
    if (!currentUser?.id || checking) return;
    setChecking(slotId);
    setCheckinMsg(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STUDENT_CHECKIN',
          studentId: currentUser.id,
          scheduleSlotId: slotId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const rec = data.record;
        const status = rec?.status || 'Có mặt';
        const time = rec?.checkinTime || '';
        setCheckinBadges(prev => ({ ...prev, [slotId]: { status, time } }));
        const label = status === 'Có mặt' ? `Có mặt lúc ${time}` : `Đi muộn lúc ${time}`;
        setCheckinMsg(`Điểm danh thành công: ${label}`);
      } else if (res.status === 409) {
        const rec = data.record;
        if (rec) {
          const status = rec.status || 'Có mặt';
          const time = rec.checkinTime || '';
          setCheckinBadges(prev => ({ ...prev, [slotId]: { status, time } }));
        }
        setCheckinMsg('Bạn đã được điểm danh trong ca này rồi.');
      } else {
        setCheckinMsg(data.error || 'Điểm danh thất bại, vui lòng thử lại.');
      }
    } catch (e: any) {
      setCheckinMsg(e.message || 'Lỗi mạng');
    } finally {
      setChecking(null);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'Có mặt').length;
  const absentCount = attendance.filter(a => a.status.includes('Vắng')).length;
  const attendanceRate =
    attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(0) : 100;

  // Học phí tính theo SỐ BUỔI đã học (điểm danh): 'Có mặt' hoặc 'Đi muộn' đều tính là đã học.
  const attendedSessions = attendance.filter(
    a => a.status === 'Có mặt' || a.status === 'Đi muộn',
  ).length;

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 font-sans text-slate-800">
        <Header
          title={`Góc Học Tập: ${currentUser?.name || ''}`}
          subtitle={`Mã học viên: ${currentUser?.id || ''} • Theo dõi tiến độ & chuyên cần cá nhân`}
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {checkinMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{checkinMsg}</span>
              </div>
              <button onClick={() => setCheckinMsg(null)} className="text-emerald-600 font-bold hover:underline">
                Đóng
              </button>
            </div>
          )}

          {/* Banner Welcome & Atelier Target Info */}
          <section className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200/70">
                  Mã HV: {currentUser?.id || '26xxx'}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center gap-1">
                  <GraduationCap size={13} />
                  Mục tiêu: {student?.targetUniversity === 'KHAC' ? (student?.customUniversity || 'Đại học kiến trúc') : (student?.targetUniversity || 'HAU')}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80">
                  {student?.examBlock === 'KHOI_H' ? 'Khối H (Văn, Vẽ 1, Vẽ 2)' : 'Khối V (Toán, Lý, Vẽ MT1)'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Xin chào, {currentUser?.name}!
              </h2>
              <p className="text-slate-500 text-xs">
                Bạn đang theo học <strong className="text-slate-800">{student?.enrolledClassIds?.length || 1} lớp học trực tuyến</strong>. Vào phòng học Discord trước giờ học 10-15 phút để chuẩn bị.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Số buổi còn lại</span>
                <span className="text-2xl font-black font-mono text-emerald-700">
                  {student?.remainingSessions ?? 12}
                </span>
                <span className="text-xs text-slate-400 font-medium ml-1">buổi</span>
              </div>
            </div>
          </section>

          {/* Metric Cards - Atelier Progress */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Chuyên cần xưởng</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">{attendanceRate}%</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium">
                Có mặt {presentCount} / {attendance.length} buổi học
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Số buổi vắng</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                  <Clock size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-700 tracking-tight">{absentCount}</span>
                <span className="text-xs text-slate-400 font-medium">buổi vắng</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium">
                Ngưỡng cảnh báo rèn luyện: 3 buổi
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Buổi đã tích lũy</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                  <FileCheck size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-700 tracking-tight">{attendedSessions}</span>
                <span className="text-xs text-slate-400 font-medium">buổi hoàn thành</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium">
                Điểm danh thực tế qua ca học
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Số dư số buổi</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                  <Sparkles size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-700 tracking-tight">
                  {student?.remainingSessions ?? 12}
                </span>
                <span className="text-xs text-slate-400 font-medium">buổi khả dụng</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 font-medium">
                Tự động trừ 1 khi hoàn thành ca học
              </div>
            </div>
          </section>

          {/* Học phí (Số buổi) & Hoá đơn — tách riêng khỏi khối thống kê điểm danh */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="text-emerald-600" size={20} />
              <h2 className="font-bold text-slate-800 text-base">Học phí & Hoá đơn</h2>
            </div>

            {/* Số buổi đã học + Tổng học phí */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Số buổi đã học</span>
                <div className="mt-2 text-2xl font-bold text-emerald-700">
                  {attendedSessions} <span className="text-xs font-semibold text-emerald-600">buổi</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Điểm danh Có mặt / Đi muộn</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng học phí phải nộp</span>
                <div className="mt-2 text-2xl font-bold text-slate-800 whitespace-nowrap">
                  {financeSummary ? (financeSummary.totalBilled / 1_000_000).toFixed(1) : 0} Tr
                </div>
                <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">
                  Hoá đơn: {financeSummary ? financeSummary.invoiceCount : 0} phiếu
                </p>
              </div>
            </div>

            <div className="pt-1">
              <Link
                href="/student/tuition"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                Xem hoá đơn & thanh toán <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Lịch học & Đơn từ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-emerald-600" size={20} />
                  <h2 className="font-bold text-slate-800 text-base">Buổi học sắp tới (Tháng 09/2026)</h2>
                </div>
                <Link
                  href="/student/schedule"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                >
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
                        <div className="font-bold text-sm text-slate-800">
                          {slot.subject} ({slot.classId})
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                          <span className="whitespace-nowrap">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="whitespace-nowrap">
                            GV: <strong className="text-slate-700">{slot.teacherId}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          {slot.meetingLink ? (
                            <a
                              href={slot.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Headphones size={12} className="shrink-0" /> Vào phòng học online{' '}
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic whitespace-nowrap">Chưa gắn link</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {(() => {
                        const state = getSlotCheckinState(slot);
                        if (state.type === 'badge') {
                          const isLate = state.status === 'Đi muộn';
                          return (
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${
                                isLate
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {state.status === 'Có mặt' ? 'Có mặt' : state.status}
                              {state.time ? ` lúc ${state.time}` : ''}
                            </span>
                          );
                        }
                        if (state.type === 'enabled') {
                          return (
                            <button
                              onClick={() => handleCheckin(slot.id)}
                              disabled={checking === slot.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50 transition whitespace-nowrap"
                            >
                              {checking === slot.id ? 'Đang điểm danh...' : 'Điểm danh nhanh'}
                            </button>
                          );
                        }
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              disabled
                              className="px-3 py-1.5 bg-slate-200 text-slate-400 rounded-lg text-xs font-bold cursor-not-allowed whitespace-nowrap"
                            >
                              Điểm danh nhanh
                            </button>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{state.reason}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4 flex flex-col">
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
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'ĐÃ_DUYỆT'
                            ? 'bg-emerald-100 text-emerald-700'
                            : req.status === 'TỪ_CHỐI'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
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
                  <div className="py-8 text-center text-xs text-slate-400">Chưa gửi đơn xin phép nào.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
