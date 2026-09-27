'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassEntity } from '@/types/classroom';
import { TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { BookOpen, Users, UserCheck, Search, Check, Plus, AlertCircle, Clock, Calendar, MapPin, CheckCircle2, ChevronRight, Video, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function StudentClassesPage() {
  const { currentUser, isReady } = useApp();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [student, setStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  // Map classId -> ca mới mà HS muốn đổi sang (shift id)
  const [targetShiftByClass, setTargetShiftByClass] = useState<Record<string, number>>({});

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [clsRes, stRes, shiftRes] = await Promise.all([
        fetch('/api/classes'),
        fetch(`/api/students?id=${currentUser.id}`),
        fetch('/api/shifts'),
      ]);
      const clsData = await clsRes.json();
      const stData = await stRes.json();
      const shiftData = await shiftRes.json();

      setClasses(clsData.classes || []);
      setStudent(stData.student || null);
      if (shiftData.shifts) setShifts(shiftData.shifts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, isReady]);

  // Chọn ca học (Ghi danh)
  const handleSelectShift = async (classId: string, className: string) => {
    if (!student || !currentUser?.id) return;
    setActionLoadingId(classId);
    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: currentUser.id,
          action: 'ENROLL',
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Đăng ký thành công ca học lớp "${className}"!`);
        await loadData();
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        alert(data.error || 'Đăng ký ca học thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Đổi ca TRỰC TIẾP: chuyển HS sang lớp cùng môn ở ca mới (KHÔNG tạo request chờ duyệt, KHÔNG chặn sĩ số)
  const handleChangeShift = async (classId: string, className: string, currentShiftId: number) => {
    const targetShiftId = targetShiftByClass[classId];
    if (!targetShiftId) {
      alert('Vui lòng chọn ca học mới muốn chuyển sang.');
      return;
    }
    if (!confirm(`Bạn có chắc muốn đổi ca của lớp "${className}" sang ${shiftMap.get(targetShiftId)?.name || `Ca ${targetShiftId}`}?`)) {
      return;
    }
    setActionLoadingId(classId);
    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: currentUser?.id || '',
          action: 'CHANGE_SHIFT',
          targetShiftId,
          actorId: currentUser?.id || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Đổi ca thành công!');
        setTargetShiftByClass(prev => ({ ...prev, [classId]: undefined as any }));
        await loadData();
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        alert(data.error || 'Đổi ca thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    } finally {
      setActionLoadingId(null);
    }
  };

  const shiftMap = new Map<number, TimeShift>();
  shifts.forEach(s => shiftMap.set(s.id, s));

  // --- Hỗ trợ chặn ca trùng giờ phía client (mirror logic backend enroll/route.ts) ---
  const timeToMin = (t?: string): number => {
    if (!t) return 0;
    const [h, m] = t.trim().split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Khoảng giờ thực của 1 lớp: ưu tiên startTime/endTime riêng, fallback theo shiftId -> TIME_SHIFTS.
  const classTimeRange = (cls: ClassEntity): { start: number; end: number } | null => {
    let startTime = cls.startTime;
    let endTime = cls.endTime;
    if (!startTime || !endTime) {
      const sh = shiftMap.get(cls.shiftId ?? 0) || TIME_SHIFTS.find(s => s.id === cls.shiftId);
      if (!sh) return null;
      startTime = sh.startTime;
      endTime = sh.endTime;
    }
    return { start: timeToMin(startTime), end: timeToMin(endTime) };
  };

  // 2 khoảng giờ có trùng nhau không (xử lý ca qua đêm).
  const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean => {
    let aE = aEnd, bE = bEnd;
    if (aStart > aE) aE += 1440;
    if (bStart > bE) bE += 1440;
    return Math.max(aStart, bStart) < Math.min(aE, bE);
  };

  // Ca mục tiêu (shiftId) có trùng giờ với lớp khác mà học sinh đã đăng ký (trên ít nhất 1 ngày chung) không.
  const shiftConflictsWithEnrolled = (fromClass: ClassEntity, targetShiftId: number): boolean => {
    const targetShift = shiftMap.get(targetShiftId) || TIME_SHIFTS.find(s => s.id === targetShiftId);
    if (!targetShift) return false;

    // Giờ của ca mục tiêu trên LỚP ĐỘC LẬP (cùng subject) sẽ thừa hưởng giờ ca đó.
    const targetStart = timeToMin(targetShift.startTime);
    const targetEnd = timeToMin(targetShift.endTime);
    const targetDays = new Set((fromClass.scheduleDays || []));

    const enrolledIds = (student?.enrolledClassIds || []);
    for (const otherId of enrolledIds) {
      const other = classes.find(c => c.id === otherId);
      if (!other || other.id === fromClass.id) continue;

      // Phải có ít nhất 1 ngày học chung
      const otherDays = new Set(other.scheduleDays || []);
      const hasCommonDay = [...targetDays].some(d => otherDays.has(d));
      if (!hasCommonDay) continue;

      const otherRange = classTimeRange(other);
      if (!otherRange) continue;

      if (rangesOverlap(targetStart, targetEnd, otherRange.start, otherRange.end)) {
        return true;
      }
    }
    return false;
  };

  // Ca mục tiêu có lớp cùng môn đang chạy không (điều kiện để đổi ca backend tìm thấy lớp đích).
  const hasTargetClassForShift = (fromClass: ClassEntity, targetShiftId: number): boolean => {
    const subject = (fromClass.subject || '').trim().toLowerCase();
    return classes.some(c =>
      c.id !== fromClass.id &&
      (c.subject || '').trim().toLowerCase() === subject &&
      Number(c.shiftId) === targetShiftId
    );
  };

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.teacherId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header
          title="Chọn Ca Học Trực Quan (Schedule Box Picker)"
          subtitle="Hệ thống đăng ký và đổi ca học theo Box lịch trực quan cho kỳ Tháng 09/2026"
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {actionMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:underline font-bold">
                Đóng
              </button>
            </div>
          )}

          {/* Search & Info Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo môn học, tên lớp, ca học, giảng viên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Số ca bạn đã đăng ký: <strong className="text-blue-600 font-bold">{student?.enrolledClassIds?.length || 0} ca/lớp</strong>
            </div>
          </div>

          {/* HƯỚNG DẪN MÀU SẮC BOX */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 flex-wrap bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold">Quy ước màu Box:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 ring-2 ring-emerald-200"></span>
              🟩 Xanh lá: Còn chỗ (Nút "Chọn ca này")
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-500 ring-2 ring-blue-200"></span>
              🟦 Xanh dương: Ca bạn đang học (Nút "Đã đăng ký" / "Đổi ca khác")
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-400 ring-2 ring-slate-200"></span>
              ⬛ Xám: Đã đủ chỗ (Nhãn "Hết chỗ")
            </span>
          </div>

          {/* GRID BOX CÁC CA HỌC */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(cls => {
              const isEnrolled = student?.enrolledClassIds?.includes(cls.id);
              const maxCapacity = 15; // Quy chuẩn tối đa 15 học viên mỗi lớp/ca
              const currentStudents = cls.studentIds.length;
              const isFull = currentStudents >= maxCapacity;

              // Lấy cấu hình khung giờ động của Admin
              const shiftInfo = shiftMap.get(cls.shiftId ?? 1);
              const shiftName = shiftInfo?.name || `Ca ${cls.shiftId}`;
              const shiftTime = shiftInfo ? `${shiftInfo.startTime} - ${shiftInfo.endTime}` : '08:00 - 10:00';

              // Card styling phân theo 3 trạng thái màu
              let cardBgBorder = '';
              let badgeStatus = null;

              if (isEnrolled) {
                // 🟦 XANH DƯƠNG: Ca bạn đang học
                cardBgBorder = 'bg-blue-50/40 border-2 border-blue-400 ring-2 ring-blue-400/20 shadow-md';
                badgeStatus = (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-600 text-white shadow-2xs flex items-center gap-1 shrink-0">
                    <Check size={12} /> Ca bạn đang học
                  </span>
                );
              } else if (isFull) {
                // ⬛ XÁM: Đã đủ chỗ
                cardBgBorder = 'bg-slate-50 border-2 border-slate-300 opacity-75';
                badgeStatus = (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-600 text-white shadow-2xs shrink-0">
                    Hết chỗ
                  </span>
                );
              } else {
                // 🟩 XANH LÁ: Còn chỗ
                cardBgBorder = 'bg-emerald-50/30 border-2 border-emerald-400 hover:border-emerald-500 hover:shadow-md';
                badgeStatus = (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-600 text-white shadow-2xs shrink-0">
                    Còn chỗ ({maxCapacity - currentStudents})
                  </span>
                );
              }

              return (
                <div
                  key={cls.id}
                  className={`rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between ${cardBgBorder}`}
                >
                  <div className="space-y-3.5">
                    {/* Header Box */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shadow-2xs">
                            {cls.code} • {cls.id}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {cls.subject}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-2 leading-snug">{cls.name}</h3>
                      </div>
                      {badgeStatus}
                    </div>

                    {/* Chi tiết Box: Thứ/Ngày, Ca học, Khung giờ, Phòng, Giảng viên, Sĩ số */}
                    <div className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-2xs space-y-2 text-xs">
                      {/* Thứ/Ngày */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <Calendar size={13} className="text-emerald-500" /> Thứ / Lịch học:
                        </span>
                        <span className="font-bold text-emerald-700">Thứ {cls.scheduleDays.join(', ')}</span>
                      </div>

                      {/* Ca học & Khung giờ (giờ Admin đã cấu hình) */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <Clock size={13} className="text-indigo-500" /> Ca học & Khung giờ:
                        </span>
                        <span className="font-bold text-indigo-700">
                          {shiftName} ({shiftTime})
                        </span>
                      </div>

                      {/* Phòng học */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <MapPin size={13} className="text-rose-400" /> Phòng học:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">{cls.roomId}</span>
                          {cls.meetingLink && (
                            <a
                              href={cls.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 text-[11px] font-bold underline"
                              title="Vào phòng học online"
                            >
                              <Video size={12} /> Vào học
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Giảng viên */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <UserCheck size={13} className="text-slate-400" /> Giảng viên:
                        </span>
                        <span className="font-semibold text-slate-800">{cls.teacherId}</span>
                      </div>

                      {/* Sĩ số hiện tại */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <Users size={13} className="text-blue-500" /> Sĩ số hiện tại:
                        </span>
                        <span className="font-bold text-slate-900">
                          {currentStudents}/{maxCapacity} học viên
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút hành động theo đúng quy định */}
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    {isEnrolled ? (
                      /* 🟦 Ca bạn đang học: hiện ca hiện tại + chọn ca mới để đổi trực tiếp */
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            disabled
                            className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 flex items-center justify-center gap-1.5 cursor-default"
                          >
                            <Check size={14} /> Ca đang chọn: {shiftName}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={targetShiftByClass[cls.id] || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setTargetShiftByClass(prev => ({
                                ...prev,
                                [cls.id]: val ? Number(val) : (undefined as any),
                              }));
                            }}
                            className="flex-1 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs text-slate-700 bg-white focus:outline-blue-600"
                          >
                            <option value="">Đổi sang ca nào...</option>
                            {shifts
                              .filter(s => s.id !== (cls.shiftId ?? 1))
                              .map(s => {
                                const conflicts = shiftConflictsWithEnrolled(cls, s.id);
                                const hasTarget = hasTargetClassForShift(cls, s.id);
                                const disabledReason = !hasTarget
                                  ? 'Ca này không có lớp cùng môn đang mở'
                                  : conflicts
                                  ? 'Trùng giờ với lớp khác bạn đang học'
                                  : '';
                                return (
                                  <option key={s.id} value={s.id} disabled={!!disabledReason} title={disabledReason || undefined}>
                                    {s.name} ({s.startTime} - {s.endTime}){disabledReason ? ` — ⛔ ${disabledReason}` : ''}
                                  </option>
                                );
                              })}
                          </select>
                          <button
                            onClick={() => handleChangeShift(cls.id, cls.name, cls.shiftId ?? 1)}
                            disabled={actionLoadingId === cls.id || !targetShiftByClass[cls.id]}
                            className="px-3 py-2.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                            title="Đổi ca trực tiếp (không cần duyệt)"
                          >
                            <RefreshCw size={12} className={actionLoadingId === cls.id ? 'animate-spin' : ''} /> Đổi ca
                          </button>
                        </div>
                      </div>
                    ) : isFull ? (
                      /* ⬛ Đã đủ chỗ: Nhãn 'Hết chỗ' */
                      <button
                        disabled
                        className="w-full py-2.5 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        Hết chỗ
                      </button>
                    ) : (
                      /* 🟩 Còn chỗ: Nút 'Chọn ca này' */
                      <button
                        onClick={() => handleSelectShift(cls.id, cls.name)}
                        disabled={actionLoadingId === cls.id}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus size={14} /> {actionLoadingId === cls.id ? 'Đang xử lý...' : 'Chọn ca này'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
