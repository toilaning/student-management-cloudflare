'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { Calendar, Clock, MapPin, CheckCircle2, Users, BookOpen, Sparkles, Plus, Video, ExternalLink, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { getTodayDateStr, getTodayDateStrByDate, formatTimeHM } from '@/utils/date';
import { HorizontalTimelineAxis, TimelineGridLines, clampSlotToTimeline, minuteToPercent } from '@/components/schedule/Timeline';

const DAY_LABELS: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ Nhật',
};

/** Từ chuỗi date YYYY-MM-DD -> số thứ trong tuần (2=T2 ... 3=T3 ... 8=CN) */
function dayOfWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  const g = d.getDay(); // 0=CN, 1=T2 .. 6=T7
  return g === 0 ? 8 : g + 1;
}

/** Format hiển thị ngày: `Thứ N - DD/MM` */
function formatDayLabel(dateStr: string): string {
  const day = dayOfWeekNumber(dateStr);
  const [, m, dd] = dateStr.split('-');
  return `${DAY_LABELS[day]} (${dd}/${m})`;
}

export default function TeacherSchedulePage() {
  const { currentUser, isReady } = useApp();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [allClasses, setAllClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [claimingClassId, setClaimingClassId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [slotRes, clsRes, shiftRes] = await Promise.all([
        fetch(`/api/schedule?teacherId=${currentUser?.id || ''}`),
        fetch('/api/classes'),
        fetch('/api/shifts'),
      ]);
      const slotData = await slotRes.json();
      const clsData = await clsRes.json();
      const shiftData = await shiftRes.json();

      setSlots(slotData.slots || []);
      setAllClasses(clsData.classes || []);
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

  const handleClaimClass = async (cls: ClassEntity) => {
    if (!currentUser?.id) return;
    setClaimingClassId(cls.id);
    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: cls.id,
          teacherId: currentUser.id,
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Đã nhận ca dạy thành công cho lớp ${cls.name}!`);
        await loadData();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.error || 'Nhận ca dạy thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    } finally {
      setClaimingClassId(null);
    }
  };

  const classMap = new Map(allClasses.map(c => [c.id, c]));
  const shiftMap = new Map(shifts.map(s => [s.id, s]));

  // Slot trong ngày đã chọn, sắp theo giờ bắt đầu thực tế
  const daySlots = slots
    .filter(s => s.date === selectedDate)
    .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

  // Ca mở chưa có GV phân công
  const openClasses = allClasses.filter(c => !c.teacherId || c.teacherId === 'CHUA_PHAN_CONG' || c.teacherId === '');

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 font-sans text-slate-800">
        <Header 
          title="Lịch Dạy & Box Ca Học Giảng Viên" 
          subtitle={`Lịch giảng dạy chi tiết của Thầy/Cô ${currentUser?.name || ''} (${currentUser?.id || ''}) - Tháng 09/2026`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {actionMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-medium">{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:underline font-bold">
                Đóng
              </button>
            </div>
          )}

          {/* Banner Thống kê */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Tổng số buổi dạy được phân công: <strong className="text-blue-600 text-base font-bold">{slots.length}</strong> buổi
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Lịch đã được đồng bộ với giờ ca học mới nhất từ Quản trị viên
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/teacher/classes"
                className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <BookOpen size={14} /> Danh mục các lớp giảng dạy
              </Link>
            </div>
          </div>

          {/* Section 1: Ca đã phân công (Timeline 1 ngày) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                Các ca học đã phân công phụ trách
              </h2>
              <span className="text-xs text-slate-500 font-medium">Timeline theo giờ thực tế</span>
            </div>

            {/* Bộ chọn ngày */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => {
                      const d = new Date(selectedDate + 'T00:00:00+07:00');
                      d.setDate(d.getDate() - 1);
                      setSelectedDate(getTodayDateStrByDate(d));
                    }}
                    className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                    title="Ngày hôm trước"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-1.5 px-2">
                    <CalendarIcon size={16} className="text-blue-600 shrink-0" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => e.target.value && setSelectedDate(e.target.value)}
                      className="font-bold text-xs sm:text-sm text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => {
                      const d = new Date(selectedDate + 'T00:00:00+07:00');
                      d.setDate(d.getDate() + 1);
                      setSelectedDate(getTodayDateStrByDate(d));
                    }}
                    className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                    title="Ngày tiếp theo"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayDateStr())}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition border border-blue-200 shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  📍 Hôm nay
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Ngày <strong className="text-slate-800 font-bold">{formatDayLabel(selectedDate)}</strong> có{' '}
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  {daySlots.length} buổi
                </span>
              </div>
            </div>

            {daySlots.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
                Thầy/Cô không có lịch dạy buổi nào trong ngày {formatDayLabel(selectedDate)}. Vui lòng nhận các ca mở bên dưới!
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 overflow-x-auto">
                <div className="min-w-[900px]">
                  <HorizontalTimelineAxis className="h-8 ml-2 mr-2 mb-2" />
                  <div className="relative min-h-[240px]">
                    <TimelineGridLines />
                    <div className="relative space-y-2">
                      {daySlots.map(slot => {
                        const cls = classMap.get(slot.classId);
                        const studentCount = cls?.studentIds?.length || 0;
                        const meetingLink = slot.meetingLink || cls?.meetingLink;
                        const { startMin, endMin, isOvernight } = clampSlotToTimeline(slot);
                        const leftPct = minuteToPercent(startMin);
                        const widthPct = Math.max(minuteToPercent(endMin) - leftPct, 2);

                        return (
                          <div key={slot.id} className="relative">
                            <div
                              className="relative rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-xs hover:shadow-md hover:border-blue-300 transition min-h-[72px] flex flex-col justify-center"
                              style={{ marginLeft: `${leftPct}%`, width: `min(calc(100% - ${leftPct}%), 480px)`, minWidth: '340px' }}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                    {slot.classId}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                                    slot.status === 'Đã hoàn thành'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-blue-600 text-white'
                                  }`}>
                                    {slot.status}
                                  </span>
                                  {isOvernight && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                                      qua đêm
                                    </span>
                                  )}
                                </div>
                                <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 w-fit whitespace-nowrap shrink-0">
                                  <Clock size={11} className="shrink-0" />
                                  {formatTimeHM(slot.startTime)} - {formatTimeHM(slot.endTime)}
                                </span>
                              </div>

                              <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-800 text-sm leading-snug">{slot.subject}</h4>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap shrink-0">
                                  <span className="flex items-center gap-1 whitespace-nowrap"><MapPin size={11} className="text-slate-400" />{slot.roomId}</span>
                                  <span className="flex items-center gap-1 font-bold text-emerald-700 whitespace-nowrap"><Users size={11} className="text-emerald-500" />{studentCount} học viên</span>
                                </div>
                              </div>

                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                {meetingLink ? (
                                  <a
                                    href={meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold"
                                  >
                                    <Video size={11} /> Vào Phòng học online <ExternalLink size={9} />
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Chưa có link phòng học online</span>
                                )}

                                <span className="flex-1" />

                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/teacher/attendance?classId=${slot.classId}&slotId=${slot.id}`}
                                    className="inline-flex items-center gap-1 py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold transition shadow-xs"
                                  >
                                    <CheckCircle2 size={11} /> Điểm danh
                                  </Link>
                                  <Link
                                    href={`/teacher/classes`}
                                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-bold"
                                  >
                                    <BookOpen size={11} /> Xem lớp
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Ca mở / Trống cần tuyển GV (Có nút Nhận ca dạy này) */}
          {openClasses.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  Các ca mở / Lớp trống chưa có giảng viên ({openClasses.length} lớp)
                </h2>
                <span className="text-xs text-emerald-600 font-semibold">Thầy/Cô có thể nhận trực tiếp</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {openClasses.map(cls => {
                  const shift = shiftMap.get(cls.shiftId ?? 1);
                  const startTime = shift?.startTime || '08:00';
                  const endTime = shift?.endTime || '10:00';

                  return (
                    <div
                      key={cls.id}
                      className="bg-emerald-50/40 rounded-2xl border-2 border-emerald-300 shadow-xs p-5 hover:border-emerald-400 hover:shadow-md transition space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {cls.code} • {cls.id}
                            </span>
                            <h3 className="font-bold text-slate-800 text-base mt-2">{cls.name}</h3>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                            <Sparkles size={12} /> Ca mở
                          </span>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs space-y-2 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><Clock size={14} className="text-indigo-500" /> Khung ca:</span>
                            <strong className="text-indigo-600 font-bold">Ca {cls.shiftId} ({startTime} - {endTime})</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={14} className="text-emerald-600" /> Ngày trong tuần:</span>
                            <strong className="text-slate-700">Thứ {cls.scheduleDays.join(', ')}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> Phòng học:</span>
                            <strong className="text-slate-700">{cls.roomId}</strong>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-400 flex items-center gap-1.5"><Users size={14} className="text-blue-500" /> Sĩ số hiện tại:</span>
                            <strong className="text-slate-800 font-bold">{cls.studentIds.length} học viên đã chọn</strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-emerald-100 mt-2">
                        <button
                          onClick={() => handleClaimClass(cls)}
                          disabled={claimingClassId === cls.id}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} /> {claimingClassId === cls.id ? 'Đang nhận ca...' : 'Nhận ca dạy này'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
