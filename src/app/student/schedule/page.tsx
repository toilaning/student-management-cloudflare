'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { Clock, MapPin, UserCheck, BookOpen, Video, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getTodayDateStr, getTodayDateStrByDate } from '@/utils/date';
import { buildTimelineTicks, clampSlotToTimeline, TIMELINE_START_MINUTES, TIMELINE_STEP_MINUTES, TIMELINE_TOTAL_MINUTES } from '@/components/schedule/Timeline';

const DAY_LABELS: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ Nhật',
};
/** Số ngày hiển thị trong timeline tuần (Thứ 2 -> CN). */
const WEEK_DAYS = 7;

/** Từ chuỗi date YYYY-MM-DD -> số thứ trong tuần (2=T2 ... 8=CN) */
function dayOfWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  const g = d.getDay(); // 0=CN, 1=T2 .. 6=T7
  return g === 0 ? 8 : g + 1;
}

/** Format hiển thị ngày: `Thứ N - DD/MM` (hoặc CN) */
function formatDayLabel(dateStr: string): string {
  const day = dayOfWeekNumber(dateStr);
  const [, m, dd] = dateStr.split('-');
  return `${DAY_LABELS[day]} (${dd}/${m})`;
}

/** Từ chuỗi date YYYY-MM-DD -> Date tại 00:00 theo Asia/Saigon. */
function toSaigonDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00+07:00');
}

/** Tìm ngày Thứ Hai (đầu tuần) của một ngày bất kỳ. */
function getMonday(dateStr: string): Date {
  const d = toSaigonDate(dateStr);
  const g = d.getDay(); // 0=CN, 1=T2 .. 6=T7
  const offset = g === 0 ? -6 : 1 - g;
  d.setDate(d.getDate() + offset);
  return d;
}

/** Danh sách 7 ngày (Thứ 2 -> CN) dạng YYYY-MM-DD cho tuần chứa ngày tham chiếu. */
function getWeekDates(refDateStr: string): string[] {
  const monday = getMonday(refDateStr);
  const dates: string[] = [];
  for (let i = 0; i < WEEK_DAYS; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(getTodayDateStrByDate(d));
  }
  return dates;
}

/** Format range ngày của tuần: `DD/MM - DD/MM`. */
function formatWeekRange(weekDates: string[]): string {
  if (weekDates.length === 0) return '';
  const first = weekDates[0];
  const last = weekDates[weekDates.length - 1];
  const [, fm, fdd] = first.split('-');
  const [, lm, ldd] = last.split('-');
  return `${fdd}/${fm} - ${ldd}/${lm}`;
}

export default function StudentSchedulePage() {
  const { currentUser, isReady } = useApp();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [loading, setLoading] = useState(true);
  // Ngày tham chiếu cho tuần hiện tại (mặc định hôm nay theo Asia/Saigon)
  const [weekRefDate, setWeekRefDate] = useState(getTodayDateStr());

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      setLoading(true);
      try {
        const [slotRes, clsRes, shiftRes] = await Promise.all([
          fetch(`/api/schedule?studentId=${currentUser?.id || ''}`),
          fetch('/api/classes'),
          fetch('/api/shifts'),
        ]);
        const slotData = await slotRes.json();
        const clsData = await clsRes.json();
        const shiftData = await shiftRes.json();

        setSlots(slotData.slots || []);
        setClasses(clsData.classes || []);
        if (shiftData.shifts) setShifts(shiftData.shifts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const classMap = new Map(classes.map(c => [c.id, c]));

  // Tính tuần hiện tại và 7 ngày (Thứ 2 -> CN)
  const weekDates = getWeekDates(weekRefDate);
  const weekDateSet = new Set(weekDates);

  // Slot trong tuần, sắp theo ngày rồi giờ bắt đầu
  const weekSlots = slots
    .filter(s => weekDateSet.has(s.date))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
    });

  const goPrevWeek = () => {
    const d = toSaigonDate(weekRefDate);
    d.setDate(d.getDate() - 7);
    setWeekRefDate(getTodayDateStrByDate(d));
  };
  const goNextWeek = () => {
    const d = toSaigonDate(weekRefDate);
    d.setDate(d.getDate() + 7);
    setWeekRefDate(getTodayDateStrByDate(d));
  };
  const goThisWeek = () => setWeekRefDate(getTodayDateStr());

  // Trục giờ dọc (12:00 -> 24:00, bước 30 phút)
  const ticks = buildTimelineTicks();
  // Chiều cao hàng (px) tương ứng 720 phút (12h). 48px mỗi giờ => 576px, chọn 60px/giờ = 720px.
  const WEEK_ROW_HEIGHT_PX = TIMELINE_TOTAL_MINUTES; // 1 phút = 1px (720px cho 12h)
  const minuteToTopPx = (minutes: number): number => {
    const clamped = Math.min(Math.max(minutes, TIMELINE_START_MINUTES), TIMELINE_START_MINUTES + TIMELINE_TOTAL_MINUTES);
    return clamped - TIMELINE_START_MINUTES;
  };

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 font-sans text-slate-800">
        <Header
          title="Thời Khóa Biểu & Box Lịch Học Viên"
          subtitle={`Lịch học chi tiết của ${currentUser?.name || ''} (${currentUser?.id || ''}) - xem theo tuần (Thứ 2 -> CN)`}
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Tổng số buổi học trong kỳ: <strong className="text-emerald-600 text-base font-bold">{slots.length}</strong> buổi
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Lịch học theo <strong>tuần</strong>, mỗi buổi vẽ đúng vị trí theo ngày + giờ thực tế trên khung 12:00 - 24:00
              </div>
            </div>
            <Link
              href="/student/classes"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <BookOpen size={14} /> Tra cứu & Đổi ca học
            </Link>
          </div>

          {/* Bộ điều hướng tuần */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button
                  onClick={goPrevWeek}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                  title="Tuần trước"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goNextWeek}
                  className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                  title="Tuần sau"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                type="button"
                onClick={goThisWeek}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition border border-emerald-200 shadow-2xs cursor-pointer flex items-center gap-1"
              >
                📍 Tuần này
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Tuần{' '}
              <strong className="text-slate-800 font-bold">{formatWeekRange(weekDates)}</strong>{' '}
              • <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">{weekSlots.length} buổi</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Đang tải lịch học...</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-x-auto">
              <div className="min-w-[980px]">
                {/* Header 7 cột ngày + trục giờ dọc */}
                <div className="flex">
                  {/* Cột nhãn giờ (góc trái) */}
                  <div className="w-14 shrink-0" />
                  {weekDates.map(d => {
                    const isToday = d === getTodayDateStr();
                    return (
                      <div key={d} className={`flex-1 min-w-[120px] text-center px-2 py-2 border-b border-slate-200 ${isToday ? 'bg-emerald-50/60' : ''}`}>
                        <div className={`text-xs font-bold ${isToday ? 'text-emerald-700' : 'text-slate-700'}`}>{formatDayLabel(d)}</div>
                        <div className="text-[10px] font-mono text-slate-400">{d}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Thân timeline: 7 cột, trục dọc = giờ */}
                <div className="flex">
                  {/* Cột nhãn giờ trái */}
                  <div className="w-14 shrink-0">
                    <div className="relative" style={{ height: `${WEEK_ROW_HEIGHT_PX}px` }}>
                      {ticks.map(t => (
                        <div
                          key={t.minutes}
                          className="absolute right-1 text-[9px] font-mono font-semibold text-slate-400 whitespace-nowrap -translate-y-1/2"
                          style={{ top: minuteToTopPx(t.minutes) }}
                        >
                          {t.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 7 cột ngày */}
                  {weekDates.map(d => {
                    const isToday = d === getTodayDateStr();
                    const daySlots = weekSlots.filter(s => s.date === d);
                    return (
                      <div key={d} className={`flex-1 min-w-[120px] border-l border-slate-100 relative ${isToday ? 'bg-emerald-50/40' : ''}`}>
                        {/* Lưới giờ ngang */}
                        <div className="absolute inset-0 pointer-events-none">
                          {ticks.map(t => (
                            <div
                              key={t.minutes}
                              className={`absolute left-0 right-0 h-px ${t.minutes === TIMELINE_START_MINUTES ? 'bg-slate-200' : 'bg-slate-100'}`}
                              style={{ top: minuteToTopPx(t.minutes) }}
                            />
                          ))}
                        </div>

                        <div className="relative" style={{ height: `${WEEK_ROW_HEIGHT_PX}px` }}>
                          {daySlots.map(slot => {
                            const cls = classMap.get(slot.classId);
                            const meetingLink = slot.meetingLink || cls?.meetingLink;
                            const { startMin, endMin, isOvernight } = clampSlotToTimeline(slot);
                            const topPx = minuteToTopPx(startMin);
                            const heightPx = Math.max(minuteToTopPx(endMin) - topPx, 26);

                            return (
                              <div
                                key={slot.id}
                                className="absolute left-1 right-1 rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 shadow-xs hover:shadow-md transition overflow-hidden"
                                style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 truncate">
                                    {slot.classId}
                                  </span>
                                  {isOvernight && (
                                    <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">qua đêm</span>
                                  )}
                                </div>
                                <div className="text-[9px] font-mono font-bold text-indigo-700 mt-0.5">
                                  {slot.startTime} - {slot.endTime}
                                </div>
                                <div className="text-[11px] font-bold text-slate-800 leading-tight mt-0.5 truncate">{slot.subject}</div>
                                <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <UserCheck size={9} className="shrink-0 text-indigo-500" />
                                  <span className="truncate">{slot.teacherId}</span>
                                </div>
                                <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin size={9} className="shrink-0 text-slate-400" />
                                  <span className="truncate">{slot.roomId}</span>
                                </div>
                                {meetingLink ? (
                                  <a
                                    href={meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 hover:text-emerald-700 font-bold mt-0.5"
                                  >
                                    <Video size={9} /> Phòng online
                                  </a>
                                ) : (
                                  <div className="text-[9px] text-slate-400 italic mt-0.5">Chưa có link</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {slots.length === 0 && !loading && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm space-y-3">
              <p>Bạn chưa có lịch học nào trong kỳ này.</p>
              <Link
                href="/student/classes"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
              >
                Đăng ký ca học ngay
              </Link>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}