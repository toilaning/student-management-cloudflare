'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { Teacher } from '@/types/teacher';
import { ClassEntity } from '@/types/classroom';
import { Student } from '@/types/student';
import { getTodayDateStr, formatTimeHM } from '@/utils/date';
import { 
  HorizontalTimelineAxis, 
  TimelineGridLines, 
  clampSlotToTimeline, 
  minuteToPercent 
} from '@/components/schedule/Timeline';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  ExternalLink, 
  Users, 
  Clock, 
  UserCheck, 
  MapPin, 
  Sparkles, 
  RefreshCw, 
  CalendarRange, 
  Filter
} from 'lucide-react';

export default function AdminCalendarPage() {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');

  // Modal xem chi tiết học sinh buổi học
  const [selectedSlotForStudents, setSelectedSlotForStudents] = useState<ScheduleSlot | null>(null);

  // Modal Thao tác hàng loạt (Bulk Operations)
  const [bulkModalType, setBulkModalType] = useState<'daily' | 'future' | 'generate' | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // State cho Thao tác ngày (bulk-daily-action)
  const [dailyAction, setDailyAction] = useState<'RESCHEDULE_DAY' | 'SHIFT_MIGRATION' | 'ROOM_MIGRATION' | 'CANCEL_DAY'>('RESCHEDULE_DAY');
  const [dailyTargetDate, setDailyTargetDate] = useState('');
  const [dailyFromShiftId, setDailyFromShiftId] = useState<number>(1);
  const [dailyToShiftId, setDailyToShiftId] = useState<number>(2);
  const [dailyTargetRoomId, setDailyTargetRoomId] = useState('P.101');
  const [dailyCancelStatus, setDailyCancelStatus] = useState<'Đã hủy' | 'Đổi lịch'>('Đã hủy');

  // State cho Cập nhật tương lai (bulk-update-future)
  const [futureClassId, setFutureClassId] = useState('');
  const [futureFromDate, setFutureFromDate] = useState('');
  const [futureShiftId, setFutureShiftId] = useState<number | ''>('');
  const [futureRoomId, setFutureRoomId] = useState('');
  const [futureTeacherId, setFutureTeacherId] = useState('');
  const [futureMeetingLink, setFutureMeetingLink] = useState('');

  // State cho Sinh lịch định kỳ (bulk-generate)
  const [genClassId, setGenClassId] = useState('all');
  const [genStartDate, setGenStartDate] = useState('');
  const [genEndDate, setGenEndDate] = useState('');
  const [genShiftId, setGenShiftId] = useState<number>(1);
  const [genScheduleDays, setGenScheduleDays] = useState<number[]>([2, 4, 6]);
  const [genOverwrite, setGenOverwrite] = useState(false);

  const loadData = async (date: string) => {
    setLoading(true);
    try {
      const [slotRes, tcRes, clsRes, stRes] = await Promise.all([
        fetch(`/api/schedule?date=${date}`),
        fetch('/api/teachers'),
        fetch('/api/classes'),
        fetch('/api/students?limit=400'),
      ]);
      const slotData = await slotRes.json();
      const tcData = await tcRes.json();
      const clsData = await clsRes.json();
      const stData = await stRes.json();

      setSlots(slotData.slots || []);
      if (slotData.shifts) setShifts(slotData.shifts);
      setTeachers(tcData.teachers || []);
      setClasses(clsData.classes || []);
      setStudents(stData.students || []);
    } catch (e) {
      console.error('Lỗi khi tải lịch học:', e);
      toast.error('Lỗi tải dữ liệu lịch học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const teacherMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    teachers.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [teachers]);

  const classMap: Record<string, ClassEntity> = useMemo(() => {
    const map: Record<string, ClassEntity> = {};
    classes.forEach(c => { map[c.id] = c; });
    return map;
  }, [classes]);

  const studentMap: Record<string, Student> = useMemo(() => {
    const map: Record<string, Student> = {};
    students.forEach(s => { map[s.id] = s; });
    return map;
  }, [students]);

  // Danh sách phòng học
  const availableRooms = useMemo(() => {
    const set = new Set(['P.101', 'P.102', 'P.103']);
    slots.forEach(s => { if (s.roomId) set.add(s.roomId); });
    return Array.from(set).sort();
  }, [slots]);

  // Trạng thái vận hành của slot
  const getSlotRuntimeStatus = (slot: ScheduleSlot) => {
    if (slot.status === 'Đã hủy') return { label: 'Đã hủy', tone: 'danger' as const };
    if (slot.status === 'Đã hoàn thành') return { label: 'Đã hoàn thành', tone: 'success' as const };
    if (slot.status === 'Đổi lịch') return { label: 'Đổi lịch', tone: 'warning' as const };

    const todayStr = getTodayDateStr();
    if (slot.date < todayStr) {
      return { label: 'Đã kết thúc', tone: 'neutral' as const };
    }
    if (slot.date > todayStr) {
      return { label: 'Sắp diễn ra', tone: 'info' as const };
    }

    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    const startTime = slot.startTime || '00:00';
    const endTime = slot.endTime || '23:59';

    if (currentTimeStr < startTime) {
      return { label: 'Sắp diễn ra', tone: 'info' as const };
    }
    if (currentTimeStr >= startTime && currentTimeStr <= endTime) {
      return { label: 'Đang diễn ra', tone: 'primary' as const };
    }
    return { label: 'Đã kết thúc', tone: 'neutral' as const };
  };

  // Kiểu màu khối slot theo token
  const getSlotBlockStyle = (slot: ScheduleSlot) => {
    if (slot.status === 'Đã hoàn thành') {
      return 'bg-success-soft border border-success/30 text-foreground';
    }
    if (slot.status === 'Đã hủy') {
      return 'bg-danger-soft border border-danger/30 text-foreground opacity-75';
    }
    if (slot.status === 'Đổi lịch') {
      return 'bg-warning-soft border border-warning/30 text-foreground';
    }
    return 'bg-primary-soft border border-primary/25 text-foreground';
  };

  // Tính các ca đang hoạt động và đã hủy
  const activeSlots = useMemo(() => 
    slots
      .filter(s => s.status !== 'Đã hủy')
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00')),
    [slots]
  );

  const canceledSlots = useMemo(() => slots.filter(s => s.status === 'Đã hủy'), [slots]);
  const completedSlots = useMemo(() => slots.filter(s => s.status === 'Đã hoàn thành'), [slots]);

  // Bộ lọc slot hiển thị trên timeline
  const filteredSlots = useMemo(() => {
    return slots
      .filter(s => {
        if (statusFilter === 'ACTIVE') return s.status !== 'Đã hủy' && s.status !== 'Đã hoàn thành';
        if (statusFilter === 'COMPLETED') return s.status === 'Đã hoàn thành';
        if (statusFilter === 'CANCELLED') return s.status === 'Đã hủy';
        return true;
      })
      .filter(s => selectedTeacher === 'ALL' || s.teacherId === selectedTeacher)
      .filter(s => selectedRoom === 'ALL' || s.roomId === selectedRoom)
      .filter(s => selectedShift === 'ALL' || String(s.shiftId) === selectedShift)
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
  }, [slots, statusFilter, selectedTeacher, selectedRoom, selectedShift]);

  // Xây dựng danh sách 7 ngày trong tuần
  const weekDays = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const curr = new Date(y, (m || 1) - 1, d || 1);
    const day = curr.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() + diffToMonday);

    const days = [];
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const yStr = dt.getFullYear();
      const mStr = String(dt.getMonth() + 1).padStart(2, '0');
      const dStr = String(dt.getDate()).padStart(2, '0');
      const s = `${yStr}-${mStr}-${dStr}`;
      days.push({
        dateStr: s,
        dayLabel: dayLabels[i],
        dayNum: dt.getDate(),
        monthNum: dt.getMonth() + 1,
        isToday: s === getTodayDateStr(),
        isSelected: s === selectedDate,
      });
    }
    return days;
  }, [selectedDate]);

  // Di chuyển tuần hoặc ngày
  const shiftDays = (delta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, (d || 1) + delta);
    const yStr = dt.getFullYear();
    const mStr = String(dt.getMonth() + 1).padStart(2, '0');
    const dStr = String(dt.getDate()).padStart(2, '0');
    setSelectedDate(`${yStr}-${mStr}-${dStr}`);
  };

  // Xử lý gửi Thao tác ngày
  const handleBulkDailyAction = async () => {
    if (dailyAction === 'RESCHEDULE_DAY' && !dailyTargetDate) {
      toast.error('Vui lòng chọn ngày đích cần dời tới');
      return;
    }
    if (dailyAction === 'SHIFT_MIGRATION' && dailyFromShiftId === dailyToShiftId) {
      toast.error('Ca nguồn và ca đích phải khác nhau');
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await fetch('/api/schedule/bulk-daily-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentDate: selectedDate,
          action: dailyAction,
          targetDate: dailyAction === 'RESCHEDULE_DAY' ? dailyTargetDate : undefined,
          fromShiftId: dailyAction === 'SHIFT_MIGRATION' ? Number(dailyFromShiftId) : undefined,
          toShiftId: dailyAction === 'SHIFT_MIGRATION' ? Number(dailyToShiftId) : undefined,
          targetRoomId: dailyAction === 'ROOM_MIGRATION' ? dailyTargetRoomId : undefined,
          cancelStatus: dailyAction === 'CANCEL_DAY' ? dailyCancelStatus : undefined,
          actorId: 'ADMIN001',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Thao tác ngày thành công');
        setBulkModalType(null);
        await loadData(selectedDate);
      } else {
        toast.error(data.error || 'Thao tác không thành công');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi mạng khi thực hiện thao tác');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Xử lý gửi Cập nhật lịch tương lai
  const handleBulkUpdateFuture = async () => {
    if (!futureClassId) {
      toast.error('Vui lòng chọn lớp học');
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await fetch('/api/schedule/bulk-update-future', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: futureClassId,
          fromDate: futureFromDate || selectedDate,
          targetShiftId: futureShiftId !== '' ? Number(futureShiftId) : undefined,
          targetRoomId: futureRoomId || undefined,
          targetTeacherId: futureTeacherId || undefined,
          targetMeetingLink: futureMeetingLink || undefined,
          actorId: 'ADMIN001',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Cập nhật lịch tương lai thành công');
        setBulkModalType(null);
        await loadData(selectedDate);
      } else {
        toast.error(data.error || 'Cập nhật lịch thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi mạng khi cập nhật');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Xử lý gửi Sinh lịch định kỳ
  const handleBulkGenerate = async () => {
    if (!genStartDate || !genEndDate) {
      toast.error('Vui lòng nhập ngày bắt đầu và kết thúc');
      return;
    }
    if (genScheduleDays.length === 0) {
      toast.error('Vui lòng chọn ít nhất một thứ trong tuần');
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await fetch('/api/schedule/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: genClassId === 'all' ? ['all'] : [genClassId],
          startDate: genStartDate,
          endDate: genEndDate,
          shiftId: Number(genShiftId),
          scheduleDays: genScheduleDays,
          overwriteExisting: genOverwrite,
          actorId: 'ADMIN001',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã sinh thành công ${data.summary?.createdCount ?? 0} ca học mới`);
        setBulkModalType(null);
        await loadData(selectedDate);
      } else {
        toast.error(data.error || 'Sinh lịch thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi mạng khi sinh lịch');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleScheduleDay = (day: number) => {
    setGenScheduleDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          title="Lịch học trung tâm" 
          subtitle="Quản lý thời khóa biểu, ca dạy và phân bổ phòng học" 
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          <PageHeader
            title="Thời khóa biểu theo ngày"
            subtitle={`Ngày ${selectedDate} • ${activeSlots.length} ca học đang hoạt động`}
            action={
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="md"
                  icon={<CalendarRange size={16} />}
                  onClick={() => {
                    setDailyTargetDate(selectedDate);
                    setBulkModalType('daily');
                  }}
                >
                  Thao tác ngày
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<RefreshCw size={16} />}
                  onClick={() => {
                    setFutureFromDate(selectedDate);
                    if (classes.length > 0 && !futureClassId) setFutureClassId(classes[0].id);
                    setBulkModalType('future');
                  }}
                >
                  Đổi lịch tương lai
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={<Sparkles size={16} />}
                  onClick={() => {
                    setGenStartDate(selectedDate);
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    const endD = new Date(y, (m || 1) + 2, d || 1);
                    const endY = endD.getFullYear();
                    const endM = String(endD.getMonth() + 1).padStart(2, '0');
                    const endDay = String(endD.getDate()).padStart(2, '0');
                    setGenEndDate(`${endY}-${endM}-${endDay}`);
                    setBulkModalType('generate');
                  }}
                >
                  Sinh lịch
                </Button>
              </div>
            }
          />

          {/* Dải chọn tuần (Week Strip) & Điều hướng ngày */}
          <Card padded={false} className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ChevronLeft size={16} />}
                  onClick={() => shiftDays(-7)}
                  aria-label="Tuần trước"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDate(getTodayDateStr())}
                >
                  Hôm nay
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ChevronRight size={16} />}
                  onClick={() => shiftDays(7)}
                  aria-label="Tuần tiếp theo"
                />
              </div>

              {/* Ô chọn ngày trực tiếp */}
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground hidden sm:inline">Chọn ngày:</span>
                <div className="w-38 sm:w-44">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={e => e.target.value && setSelectedDate(e.target.value)}
                    className="h-9 text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Dải 7 ngày trong tuần */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekDays.map(day => (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 px-1 rounded-field text-center transition cursor-pointer select-none',
                    day.isSelected
                      ? 'bg-primary text-white shadow-primary'
                      : day.isToday
                      ? 'bg-primary-soft text-primary-ink border border-primary/30'
                      : 'bg-muted/40 hover:bg-muted text-foreground border border-line'
                  )}
                >
                  <span className={cn('text-[11px] font-bold uppercase', day.isSelected ? 'text-white/80' : 'text-muted-foreground')}>
                    {day.dayLabel}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold tabular leading-tight mt-0.5">
                    {day.dayNum}
                  </span>
                  {day.isToday && !day.isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1" />
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Thanh bộ lọc: Trạng thái, Giảng viên, Phòng, Ca */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 sm:p-4 border border-line rounded-card shadow-card">
            <SegmentedControl
              value={statusFilter}
              onChange={v => setStatusFilter(v as any)}
              items={[
                { value: 'ALL', label: 'Tất cả', count: slots.length },
                { value: 'ACTIVE', label: 'Hoạt động', count: activeSlots.length },
                { value: 'COMPLETED', label: 'Hoàn thành', count: completedSlots.length },
                { value: 'CANCELLED', label: 'Đã hủy', count: canceledSlots.length },
              ]}
            />

            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-36 sm:w-44">
                <Select
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                  className="h-9 text-[13px]"
                >
                  <option value="ALL">Tất cả giáo viên</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>

              <div className="w-32 sm:w-36">
                <Select
                  value={selectedRoom}
                  onChange={e => setSelectedRoom(e.target.value)}
                  className="h-9 text-[13px]"
                >
                  <option value="ALL">Tất cả phòng</option>
                  {availableRooms.map(r => (
                    <option key={r} value={r}>Phòng {r}</option>
                  ))}
                </Select>
              </div>

              <div className="w-28 sm:w-32">
                <Select
                  value={selectedShift}
                  onChange={e => setSelectedShift(e.target.value)}
                  className="h-9 text-[13px]"
                >
                  <option value="ALL">Tất cả ca</option>
                  {shifts.map(s => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name || `Ca ${s.id} (${formatTimeHM(s.startTime)} - ${formatTimeHM(s.endTime)})`}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Khung Timeline hiển thị trục giờ và các khối ca học */}
          <div className="bg-card border border-line rounded-card shadow-card p-4 sm:p-5 overflow-x-auto">
            {loading ? (
              <div className="p-8 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-18 rounded-field bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredSlots.length > 0 ? (
              <div className="min-w-[900px] space-y-4">
                {/* Trục giờ ngang */}
                <HorizontalTimelineAxis className="h-8 ml-2 mr-2 mb-2" />

                {/* Vùng lưới và các khối slot */}
                <div className="relative min-h-[340px]">
                  <TimelineGridLines />
                  <div className="relative space-y-2.5">
                    {filteredSlots.map(slot => {
                      const cls = classMap[slot.classId];
                      const studentCount = (cls?.studentIds || []).length;
                      const runtimeStatus = getSlotRuntimeStatus(slot);
                      const teacherName = teacherMap[slot.teacherId] || slot.teacherId;
                      const { startMin, endMin, isOvernight } = clampSlotToTimeline(slot);
                      const leftPct = minuteToPercent(startMin);
                      const blockCls = getSlotBlockStyle(slot);

                      return (
                        <div key={slot.id} className="relative h-auto">
                          <div
                            className={cn(
                              'relative rounded-field p-3 shadow-soft transition min-h-[74px] flex flex-col justify-center',
                              blockCls
                            )}
                            style={{
                              marginLeft: `${leftPct}%`,
                              width: `min(calc(100% - ${leftPct}%), 480px)`,
                              minWidth: '340px',
                            }}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge tone="neutral" className="font-mono text-[10px] uppercase">
                                  {slot.classId}
                                </Badge>
                                <Badge tone={runtimeStatus.tone} dot={runtimeStatus.label === 'Đang diễn ra'}>
                                  {runtimeStatus.label}
                                </Badge>
                                {isOvernight && (
                                  <Badge tone="warning">qua đêm</Badge>
                                )}
                              </div>
                              <span className="text-[11px] font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded-pill flex items-center gap-1 whitespace-nowrap shrink-0">
                                <Clock size={11} className="text-muted-foreground" />
                                {formatTimeHM(slot.startTime)} - {formatTimeHM(slot.endTime)}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center justify-between gap-2 flex-wrap">
                              <div className="min-w-0">
                                <h4 className="font-bold text-foreground text-sm leading-snug truncate">
                                  {cls?.name || slot.subject}
                                </h4>
                                <p className="text-[12px] text-muted-foreground truncate">{slot.subject}</p>
                              </div>
                              <div className="text-[12px] text-muted-foreground flex items-center gap-2.5 flex-wrap shrink-0">
                                <span className="flex items-center gap-1 whitespace-nowrap text-foreground font-medium">
                                  <UserCheck size={12} className="text-primary" />
                                  {teacherName}
                                </span>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <MapPin size={12} className="text-subtle-foreground" />
                                  {slot.roomId}
                                </span>
                                <span className="flex items-center gap-1 font-bold text-primary tabular whitespace-nowrap">
                                  <Users size={12} />
                                  {studentCount} HS
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-line/60 flex items-center gap-2 flex-wrap">
                              {slot.meetingLink ? (
                                <a
                                  href={slot.meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-success hover:underline font-bold whitespace-nowrap"
                                >
                                  <Video size={12} /> Phòng online <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-[11px] text-subtle-foreground italic whitespace-nowrap">
                                  Chưa gắn link online
                                </span>
                              )}

                              <span className="flex-1" />

                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={<Users size={12} />}
                                  onClick={() => setSelectedSlotForStudents(slot)}
                                >
                                  Học viên ({studentCount})
                                </Button>
                                <Link href={`/admin/attendance?classId=${slot.classId}&date=${selectedDate}`}>
                                  <Button variant="primary" size="sm">
                                    Điểm danh
                                  </Button>
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
            ) : (
              <EmptyState
                icon={<CalendarIcon size={24} />}
                title="Không có ca học nào"
                description={`Ngày ${selectedDate} không có ca học nào phù hợp với bộ lọc hiện tại.`}
                action={
                  (statusFilter !== 'ALL' || selectedTeacher !== 'ALL' || selectedRoom !== 'ALL' || selectedShift !== 'ALL') ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('ALL');
                        setSelectedTeacher('ALL');
                        setSelectedRoom('ALL');
                        setSelectedShift('ALL');
                      }}
                    >
                      Xóa bộ lọc
                    </Button>
                  ) : undefined
                }
              />
            )}
          </div>
        </main>

        {/* Hộp thoại xem danh sách học viên trong ca */}
        <Sheet
          isOpen={!!selectedSlotForStudents}
          onClose={() => setSelectedSlotForStudents(null)}
          title="Danh sách học viên ca học"
          description={
            selectedSlotForStudents
              ? `${selectedSlotForStudents.subject} (${selectedSlotForStudents.classId}) • ${formatTimeHM(selectedSlotForStudents.startTime)} - ${formatTimeHM(selectedSlotForStudents.endTime)} • Phòng ${selectedSlotForStudents.roomId}`
              : ''
          }
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="secondary" onClick={() => setSelectedSlotForStudents(null)}>
                Đóng
              </Button>
              {selectedSlotForStudents && (
                <Link href={`/admin/attendance?classId=${selectedSlotForStudents.classId}&date=${selectedDate}`}>
                  <Button variant="primary">
                    Điểm danh ca này
                  </Button>
                </Link>
              )}
            </div>
          }
        >
          {selectedSlotForStudents && (() => {
            const cls = classMap[selectedSlotForStudents.classId];
            const studentIds = cls?.studentIds || [];

            if (studentIds.length === 0) {
              return (
                <EmptyState
                  title="Chưa có học viên"
                  description="Lớp học này hiện chưa có học viên nào được ghi danh."
                  className="py-8"
                />
              );
            }

            return (
              <div className="divide-y divide-line border border-line rounded-card overflow-hidden">
                {studentIds.map(stId => {
                  const st = studentMap[stId];
                  return (
                    <div key={stId} className="p-3 sm:p-3.5 flex items-center justify-between hover:bg-muted/40 text-[13px] gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={st ? st.name : stId} size={32} />
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">
                            {st ? st.name : stId} <span className="font-mono text-[11px] text-muted-foreground font-normal">({stId})</span>
                          </p>
                          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                            {st?.phone || 'Chưa cập nhật SĐT'} {st?.email ? `• ${st.email}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge tone="primary">Ghi danh</Badge>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Sheet>

        {/* Hộp thoại Thao tác hàng loạt (Bulk Operations) */}
        <Sheet
          isOpen={!!bulkModalType}
          onClose={() => setBulkModalType(null)}
          title={
            bulkModalType === 'daily'
              ? 'Thao tác ca học trong ngày'
              : bulkModalType === 'future'
              ? 'Đổi lịch từ ngày này về sau'
              : 'Sinh lịch học định kỳ'
          }
          description={
            bulkModalType === 'daily'
              ? `Áp dụng dời ngày, chuyển ca, đổi phòng hoặc hủy toàn bộ ca học ngày ${selectedDate}`
              : bulkModalType === 'future'
              ? `Áp dụng thay đổi giáo viên, phòng hoặc ca cho một lớp từ ngày ${selectedDate} trở đi`
              : 'Tự động tạo lịch học cho các lớp theo khung giờ và các thứ trong tuần'
          }
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="secondary"
                onClick={() => setBulkModalType(null)}
                disabled={bulkSubmitting}
              >
                Hủy
              </Button>
              {bulkModalType === 'daily' && (
                <Button
                  variant="primary"
                  loading={bulkSubmitting}
                  onClick={handleBulkDailyAction}
                >
                  Xác nhận thực hiện
                </Button>
              )}
              {bulkModalType === 'future' && (
                <Button
                  variant="primary"
                  loading={bulkSubmitting}
                  onClick={handleBulkUpdateFuture}
                >
                  Cập nhật lịch
                </Button>
              )}
              {bulkModalType === 'generate' && (
                <Button
                  variant="primary"
                  loading={bulkSubmitting}
                  onClick={handleBulkGenerate}
                >
                  Sinh lịch tự động
                </Button>
              )}
            </div>
          }
        >
          {bulkModalType === 'daily' && (
            <div className="space-y-4 pt-2">
              <Field label="Hành động áp dụng" required>
                <Select
                  value={dailyAction}
                  onChange={e => setDailyAction(e.target.value as any)}
                >
                  <option value="RESCHEDULE_DAY">Dời toàn bộ ca sang ngày khác</option>
                  <option value="SHIFT_MIGRATION">Chuyển ca học trong ngày</option>
                  <option value="ROOM_MIGRATION">Chuyển toàn bộ phòng học trong ngày</option>
                  <option value="CANCEL_DAY">Đổi trạng thái / Hủy toàn bộ ca</option>
                </Select>
              </Field>

              {dailyAction === 'RESCHEDULE_DAY' && (
                <Field label="Ngày đích cần dời tới" required hint="Toàn bộ ca hợp lệ sẽ được chuyển sang ngày này">
                  <Input
                    type="date"
                    value={dailyTargetDate}
                    onChange={e => setDailyTargetDate(e.target.value)}
                  />
                </Field>
              )}

              {dailyAction === 'SHIFT_MIGRATION' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Ca nguồn" required>
                    <Select
                      value={dailyFromShiftId}
                      onChange={e => setDailyFromShiftId(Number(e.target.value))}
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Ca đích chuyển sang" required>
                    <Select
                      value={dailyToShiftId}
                      onChange={e => setDailyToShiftId(Number(e.target.value))}
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}

              {dailyAction === 'ROOM_MIGRATION' && (
                <Field label="Phòng học đích" required hint="Toàn bộ ca trong ngày sẽ học tại phòng này">
                  <Input
                    value={dailyTargetRoomId}
                    onChange={e => setDailyTargetRoomId(e.target.value)}
                    placeholder="Ví dụ: P.201"
                  />
                </Field>
              )}

              {dailyAction === 'CANCEL_DAY' && (
                <Field label="Trạng thái cập nhật" required>
                  <Select
                    value={dailyCancelStatus}
                    onChange={e => setDailyCancelStatus(e.target.value as any)}
                  >
                    <option value="Đã hủy">Đã hủy</option>
                    <option value="Đổi lịch">Đổi lịch</option>
                  </Select>
                </Field>
              )}
            </div>
          )}

          {bulkModalType === 'future' && (
            <div className="space-y-4 pt-2">
              <Field label="Lớp học áp dụng" required>
                <Select
                  value={futureClassId}
                  onChange={e => setFutureClassId(e.target.value)}
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </Select>
              </Field>

              <Field label="Áp dụng từ ngày" required hint="Các ca học của lớp này từ ngày đã chọn về sau sẽ được cập nhật">
                <Input
                  type="date"
                  value={futureFromDate}
                  onChange={e => setFutureFromDate(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ca học mới" hint="Để trống nếu giữ nguyên">
                  <Select
                    value={futureShiftId}
                    onChange={e => setFutureShiftId(e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">Giữ nguyên ca hiện tại</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Phòng học mới" hint="Để trống nếu giữ nguyên">
                  <Input
                    value={futureRoomId}
                    onChange={e => setFutureRoomId(e.target.value)}
                    placeholder="Ví dụ: P.102"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Giáo viên mới" hint="Để trống nếu giữ nguyên">
                  <Select
                    value={futureTeacherId}
                    onChange={e => setFutureTeacherId(e.target.value)}
                  >
                    <option value="">Giữ nguyên giáo viên</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Link phòng học online" hint="Tùy chọn">
                  <Input
                    value={futureMeetingLink}
                    onChange={e => setFutureMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                  />
                </Field>
              </div>
            </div>
          )}

          {bulkModalType === 'generate' && (
            <div className="space-y-4 pt-2">
              <Field label="Lớp học" required>
                <Select
                  value={genClassId}
                  onChange={e => setGenClassId(e.target.value)}
                >
                  <option value="all">Tất cả lớp học</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Từ ngày" required>
                  <Input
                    type="date"
                    value={genStartDate}
                    onChange={e => setGenStartDate(e.target.value)}
                  />
                </Field>
                <Field label="Đến ngày" required>
                  <Input
                    type="date"
                    value={genEndDate}
                    onChange={e => setGenEndDate(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Khung giờ / Ca học" required>
                <Select
                  value={genShiftId}
                  onChange={e => setGenShiftId(Number(e.target.value))}
                >
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Các thứ trong tuần" required>
                <div className="flex gap-2 flex-wrap pt-1">
                  {[
                    { day: 2, label: 'Thứ 2' },
                    { day: 3, label: 'Thứ 3' },
                    { day: 4, label: 'Thứ 4' },
                    { day: 5, label: 'Thứ 5' },
                    { day: 6, label: 'Thứ 6' },
                    { day: 7, label: 'Thứ 7' },
                    { day: 0, label: 'Chủ nhật' },
                  ].map(item => {
                    const active = genScheduleDays.includes(item.day);
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => toggleScheduleDay(item.day)}
                        className={cn(
                          'px-3 py-1.5 rounded-pill text-[13px] font-semibold border transition cursor-pointer',
                          active
                            ? 'bg-primary text-white border-primary shadow-primary'
                            : 'bg-muted text-muted-foreground border-line hover:text-foreground'
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <label className="flex items-center gap-2.5 text-[13px] font-medium text-foreground cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={genOverwrite}
                  onChange={e => setGenOverwrite(e.target.checked)}
                  className="rounded border-line text-primary focus:ring-primary h-4 w-4"
                />
                <span>Ghi đè ca học trùng lịch nếu đã tồn tại</span>
              </label>
            </div>
          )}
        </Sheet>
      </div>
    </RoleGuard>
  );
}
