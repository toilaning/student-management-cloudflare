'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getTodayDateStr, getTodayDateStrByDate, formatTimeHM } from '@/utils/date';
import {
  buildTimelineTicks,
  clampSlotToTimeline,
  TIMELINE_START_MINUTES,
  TIMELINE_STEP_MINUTES,
  TIMELINE_TOTAL_MINUTES,
} from '@/components/schedule/Timeline';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  BookOpen,
  Plus,
  Video,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const DAY_LABELS: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật',
};

const WEEK_DAYS = 7;

/** Từ chuỗi date YYYY-MM-DD -> số thứ trong tuần (2=T2 ... 8=CN) */
function dayOfWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  const g = d.getDay(); // 0=CN, 1=T2 .. 6=T7
  return g === 0 ? 8 : g + 1;
}

/** Format hiển thị ngày: Thứ N (DD/MM) */
function formatDayLabel(dateStr: string): string {
  const day = dayOfWeekNumber(dateStr);
  const [, m, dd] = dateStr.split('-');
  return `${DAY_LABELS[day]} (${dd}/${m})`;
}

/** Từ chuỗi date YYYY-MM-DD -> Date tại 00:00 theo Asia/Saigon */
function toSaigonDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00+07:00');
}

/** Tìm ngày Thứ Hai (đầu tuần) */
function getMonday(dateStr: string): Date {
  const d = toSaigonDate(dateStr);
  const g = d.getDay(); // 0=CN, 1=T2 .. 6=T7
  const offset = g === 0 ? -6 : 1 - g;
  d.setDate(d.getDate() + offset);
  return d;
}

/** Danh sách 7 ngày (Thứ 2 -> CN) của tuần chứa ngày tham chiếu */
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

/** Format khoảng ngày tuần: DD/MM – DD/MM */
function formatWeekRange(weekDates: string[]): string {
  if (weekDates.length === 0) return '';
  const first = weekDates[0];
  const last = weekDates[weekDates.length - 1];
  const [, fm, fdd] = first.split('-');
  const [, lm, ldd] = last.split('-');
  return `${fdd}/${fm} – ${ldd}/${lm}`;
}

export default function TeacherSchedulePage() {
  const { currentUser, isReady } = useApp();
  const toast = useToast();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [allClasses, setAllClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [loading, setLoading] = useState(true);
  const [claimingClassId, setClaimingClassId] = useState<string | null>(null);

  // Điều hướng tuần & ngày được chọn
  const [weekRefDate, setWeekRefDate] = useState(getTodayDateStr());
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
      toast.error('Không thể tải dữ liệu lịch dạy.');
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
        toast.success(`Đã nhận ca dạy thành công cho lớp ${cls.name}.`);
        await loadData();
      } else {
        toast.error(data.error || 'Nhận ca dạy thất bại.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi kết nối khi nhận ca dạy.');
    } finally {
      setClaimingClassId(null);
    }
  };

  const classMap = useMemo(() => new Map(allClasses.map((c) => [c.id, c])), [allClasses]);
  const shiftMap = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts]);

  // Tuần hiện tại
  const weekDates = useMemo(() => getWeekDates(weekRefDate), [weekRefDate]);
  const weekDateSet = useMemo(() => new Set(weekDates), [weekDates]);

  // Các ca dạy trong tuần
  const weekSlots = useMemo(
    () =>
      slots
        .filter((s) => weekDateSet.has(s.date))
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
        }),
    [slots, weekDateSet]
  );

  // Ca mở chưa có GV phân công
  const openClasses = useMemo(
    () =>
      allClasses.filter(
        (c) => !c.teacherId || c.teacherId === 'CHUA_PHAN_CONG' || c.teacherId === ''
      ),
    [allClasses]
  );

  const goPrevWeek = () => {
    const d = toSaigonDate(weekRefDate);
    d.setDate(d.getDate() - 7);
    const prevDate = getTodayDateStrByDate(d);
    setWeekRefDate(prevDate);
    setSelectedDate(prevDate);
  };

  const goNextWeek = () => {
    const d = toSaigonDate(weekRefDate);
    d.setDate(d.getDate() + 7);
    const nextDate = getTodayDateStrByDate(d);
    setWeekRefDate(nextDate);
    setSelectedDate(nextDate);
  };

  const goThisWeek = () => {
    const today = getTodayDateStr();
    setWeekRefDate(today);
    setSelectedDate(today);
  };

  // Trục giờ dọc timeline: 06:00 -> 23:00 (1020 phút = 1020px)
  const ticks = useMemo(() => buildTimelineTicks(), []);
  const WEEK_ROW_HEIGHT_PX = TIMELINE_TOTAL_MINUTES;

  const minuteToTopPx = (minutes: number): number => {
    const clamped = Math.min(
      Math.max(minutes, TIMELINE_START_MINUTES),
      TIMELINE_START_MINUTES + TIMELINE_TOTAL_MINUTES
    );
    return clamped - TIMELINE_START_MINUTES;
  };

  const todayStr = getTodayDateStr();

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title="Lịch dạy giảng viên"
          subtitle={`Giáo viên ${currentUser?.name || ''} (${currentUser?.id || ''}) • Thời khóa biểu tuần`}
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* Hàng thống kê tổng quan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              label="Tổng buổi phân công"
              value={slots.length}
              hint="Buổi dạy trong toàn kỳ"
              icon={<Calendar size={18} />}
              tone="primary"
            />
            <StatCard
              label="Buổi trong tuần này"
              value={weekSlots.length}
              hint={formatWeekRange(weekDates)}
              icon={<Clock size={18} />}
              tone="info"
            />
            <StatCard
              label="Ca mở cần giảng viên"
              value={openClasses.length}
              hint="Lớp trống có thể nhận dạy"
              icon={<Sparkles size={18} />}
              tone="warning"
            />
          </div>

          {/* Thanh điều hướng tuần */}
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-pill p-1 border border-line">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground"
                  onClick={goPrevWeek}
                  aria-label="Tuần trước"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground"
                  onClick={goNextWeek}
                  aria-label="Tuần sau"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={goThisWeek}
                icon={<Calendar size={14} />}
              >
                Tuần này
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground">
                Tuần {formatWeekRange(weekDates)}
              </span>
              <Badge tone="primary" className="tabular">
                {weekSlots.length} ca
              </Badge>
              <Link href="/teacher/classes">
                <Button size="sm" variant="ghost" icon={<BookOpen size={14} />}>
                  Danh mục lớp
                </Button>
              </Link>
            </div>
          </Card>

          {/* Dải 7 ngày trong tuần (Day strip) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 p-1.5 bg-muted rounded-card border border-line">
            {weekDates.map((d) => {
              const isToday = d === todayStr;
              const isSelected = d === selectedDate;
              const dayNum = dayOfWeekNumber(d);
              const [, mm, dd] = d.split('-');
              const daySlotCount = slots.filter((s) => s.date === d).length;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 px-1 rounded-field text-center transition-all cursor-pointer',
                    isToday
                      ? 'bg-primary text-white shadow-primary'
                      : isSelected
                      ? 'bg-card text-foreground border border-primary/40 shadow-soft'
                      : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                    {DAY_LABELS[dayNum]}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold tabular leading-tight mt-0.5">
                    {dd}/{mm}
                  </span>
                  {daySlotCount > 0 ? (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-pill mt-1 tabular',
                        isToday ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary-ink'
                      )}
                    >
                      {daySlotCount} ca
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-40 mt-1">–</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Lưới tuần hiển thị thời khóa biểu */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-foreground">
                Lịch giảng dạy chi tiết trong tuần
              </h2>
              <span className="text-[12px] text-muted-foreground">
                {selectedDate ? `Đang chọn ${formatDayLabel(selectedDate)}` : 'Khung giờ 06:00 – 23:00'}
              </span>
            </div>

            {loading ? (
              <div className="bg-card border border-line rounded-card shadow-card p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-field bg-muted animate-pulse" />
                ))}
              </div>
            ) : weekSlots.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Calendar size={28} />}
                  title="Tuần này chưa có lịch dạy"
                  description="Thầy/Cô không có ca dạy nào trong tuần được chọn. Có thể nhận thêm các ca mở bên dưới."
                />
              </Card>
            ) : (
              <div className="bg-card rounded-card border border-line shadow-card overflow-x-auto">
                <div className="min-w-[960px]">
                  {/* Hàng tiêu đề 7 cột ngày */}
                  <div className="flex border-b border-line bg-muted/40">
                    <div className="w-14 shrink-0 border-r border-line py-3 px-1 text-center text-[10px] font-bold text-muted-foreground uppercase">
                      Giờ
                    </div>
                    {weekDates.map((d) => {
                      const isToday = d === todayStr;
                      const isSelected = d === selectedDate;
                      const dayNum = dayOfWeekNumber(d);
                      const [, mm, dd] = d.split('-');
                      const daySlots = weekSlots.filter((s) => s.date === d);

                      return (
                        <div
                          key={d}
                          onClick={() => setSelectedDate(d)}
                          className={cn(
                            'flex-1 min-w-[125px] text-center py-2.5 px-2 border-r border-line last:border-r-0 cursor-pointer transition-colors',
                            isToday || isSelected ? 'bg-primary-soft/50' : 'hover:bg-muted/60'
                          )}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={cn(
                                'text-[13px] font-bold',
                                isToday ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {DAY_LABELS[dayNum]}
                            </span>
                            {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground tabular mt-0.5">
                            {dd}/{mm} • {daySlots.length} ca
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Thân lưới: trục giờ dọc + 7 cột */}
                  <div className="flex">
                    {/* Cột nhãn giờ bên trái */}
                    <div className="w-14 shrink-0 border-r border-line bg-muted/20 relative">
                      <div className="relative" style={{ height: `${WEEK_ROW_HEIGHT_PX}px` }}>
                        {ticks.map((t) => (
                          <div
                            key={t.minutes}
                            className="absolute right-1.5 text-[10px] font-mono font-medium text-subtle-foreground whitespace-nowrap -translate-y-1/2"
                            style={{ top: minuteToTopPx(t.minutes) }}
                          >
                            {t.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 7 cột ngày */}
                    {weekDates.map((d) => {
                      const isToday = d === todayStr;
                      const isSelected = d === selectedDate;
                      const daySlots = weekSlots.filter((s) => s.date === d);

                      return (
                        <div
                          key={d}
                          className={cn(
                            'flex-1 min-w-[125px] border-r border-line last:border-r-0 relative transition-colors',
                            isToday || isSelected ? 'bg-primary-soft/30' : ''
                          )}
                        >
                          {/* Lưới giờ ngang */}
                          <div className="absolute inset-0 pointer-events-none">
                            {ticks.map((t) => (
                              <div
                                key={t.minutes}
                                className={cn(
                                  'absolute left-0 right-0 h-px',
                                  t.minutes % 60 === 0 ? 'bg-line' : 'bg-line/40'
                                )}
                                style={{ top: minuteToTopPx(t.minutes) }}
                              />
                            ))}
                          </div>

                          {/* Các slot trong ngày */}
                          <div className="relative" style={{ height: `${WEEK_ROW_HEIGHT_PX}px` }}>
                            {daySlots.map((slot) => {
                              const cls = classMap.get(slot.classId);
                              const studentCount = cls?.studentIds?.length || 0;
                              const meetingLink = slot.meetingLink || cls?.meetingLink;
                              const { startMin, endMin, isOvernight } = clampSlotToTimeline(slot);
                              const topPx = minuteToTopPx(startMin);
                              const heightPx = Math.max(minuteToTopPx(endMin) - topPx, 38);

                              return (
                                <div
                                  key={slot.id}
                                  className={cn(
                                    'absolute left-1 right-1 rounded-field p-2 shadow-soft hover:shadow-card transition-all overflow-hidden flex flex-col justify-between border',
                                    'bg-primary-soft text-primary-ink border-primary/30'
                                  )}
                                  style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-card text-foreground border border-line tabular">
                                          {slot.classId}
                                        </span>
                                        {slot.status === 'Đã hoàn thành' ? (
                                          <Badge tone="success" className="text-[9px] py-0 px-1.5">
                                            Hoàn thành
                                          </Badge>
                                        ) : (
                                          <Badge tone="primary" className="text-[9px] py-0 px-1.5">
                                            {slot.status}
                                          </Badge>
                                        )}
                                        {isOvernight && (
                                          <Badge tone="warning" className="text-[9px] py-0 px-1.5">
                                            qua đêm
                                          </Badge>
                                        )}
                                        {slot.checkinTime && (
                                          <Badge
                                            tone={slot.checkinStatus === 'Đi muộn' ? 'warning' : 'success'}
                                            className="text-[9px] py-0 px-1.5"
                                          >
                                            Vào {slot.checkinTime}
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono font-bold text-primary-ink whitespace-nowrap">
                                        {formatTimeHM(slot.startTime)} – {formatTimeHM(slot.endTime)}
                                      </span>
                                    </div>

                                    <h4 className="font-bold text-foreground text-xs leading-snug mt-1 line-clamp-2">
                                      {slot.subject}
                                    </h4>

                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                        <MapPin size={11} className="text-muted-foreground" />
                                        {slot.roomId}
                                      </span>
                                      <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-foreground">
                                        <Users size={11} className="text-primary" />
                                        {studentCount} học viên
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-1 pt-1 border-t border-primary/20 flex items-center justify-between gap-1 flex-wrap">
                                    {meetingLink ? (
                                      <a
                                        href={meetingLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                                      >
                                        <Video size={11} />
                                        <span>Phòng online</span>
                                        <ExternalLink size={9} />
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground italic">
                                        Trực tiếp
                                      </span>
                                    )}

                                    <Link
                                      href={`/teacher/attendance?classId=${slot.classId}&slotId=${slot.id}`}
                                      className="inline-flex items-center gap-1 py-0.5 px-2 rounded-pill bg-primary text-white text-[10px] font-bold shadow-soft hover:bg-primary-hover transition"
                                    >
                                      <CheckCircle2 size={10} /> Điểm danh
                                    </Link>
                                  </div>
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
          </section>

          {/* Section: Ca mở chưa có GV phân công */}
          {openClasses.length > 0 && (
            <section className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                    <Sparkles size={16} className="text-warning" />
                    Ca mở cần giảng viên phụ trách ({openClasses.length})
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    Thầy/Cô có thể nhận ca trực tiếp để phân công vào lịch dạy cá nhân
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openClasses.map((cls) => {
                  const shift = shiftMap.get(cls.shiftId ?? 1);
                  const startTime = shift?.startTime || '08:00';
                  const endTime = shift?.endTime || '10:00';

                  return (
                    <Card key={cls.id} className="flex flex-col justify-between">
                      <div className="space-y-3">
                        <CardHeader
                          title={cls.name}
                          subtitle={`${cls.code} • ${cls.subject}`}
                          action={
                            <Badge tone="primary" dot>
                              Ca mở
                            </Badge>
                          }
                        />

                        <div className="bg-muted rounded-field p-3 space-y-2 text-xs text-foreground">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Clock size={13} className="text-primary" /> Khung ca:
                            </span>
                            <span className="font-semibold tabular">
                              Ca {cls.shiftId} ({startTime} – {endTime})
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Calendar size={13} className="text-primary" /> Ngày học:
                            </span>
                            <span className="font-semibold">Thứ {cls.scheduleDays.join(', ')}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <MapPin size={13} className="text-primary" /> Phòng học:
                            </span>
                            <span className="font-semibold">{cls.roomId}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-line">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Users size={13} className="text-primary" /> Sĩ số:
                            </span>
                            <span className="font-semibold tabular">
                              {cls.studentIds.length} học viên đăng ký
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-line mt-4">
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          loading={claimingClassId === cls.id}
                          onClick={() => handleClaimClass(cls)}
                          icon={<Plus size={16} />}
                        >
                          Nhận ca dạy này
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
