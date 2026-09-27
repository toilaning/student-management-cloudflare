'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { Calendar, Clock, MapPin, UserCheck, BookOpen, Video, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const DAY_LABELS: Record<number, string> = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ Nhật',
};
const DAY_ORDER = [2, 3, 4, 5, 6, 7, 8];

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

export default function StudentSchedulePage() {
  const { currentUser, isReady } = useApp();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [loading, setLoading] = useState(true);

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

  // Group slot theo NGÀY (sort ASC theo ngày), trong mỗi ngày sort theo giờ bắt đầu thực tế
  const groupedByDate = new Map<string, ScheduleSlot[]>();
  slots.forEach(slot => {
    const key = slot.date;
    if (!groupedByDate.has(key)) groupedByDate.set(key, []);
    groupedByDate.get(key)!.push(slot);
  });
  const sortedDays = [...groupedByDate.keys()].sort((a, b) => a.localeCompare(b));
  sortedDays.forEach(day =>
    groupedByDate.get(day)!.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
  );

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header
          title="Thời Khóa Biểu & Box Lịch Học Viên"
          subtitle={`Lịch học chi tiết của ${currentUser?.name || ''} (${currentUser?.id || ''}) - xem theo ngày học`}
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Tổng số buổi học trong kỳ: <strong className="text-emerald-600 text-base font-bold">{slots.length}</strong> buổi
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Danh sách lịch học nhóm theo <strong>ngày học</strong>, mỗi buổi hiển thị đầy đủ giờ học thực tế
              </div>
            </div>
            <Link
              href="/student/classes"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <BookOpen size={14} /> Tra cứu & Đổi ca học
            </Link>
          </div>

          {slots.length === 0 && !loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm space-y-3">
              <p>Bạn chưa có lịch học nào trong kỳ này.</p>
              <Link
                href="/student/classes"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
              >
                Đăng ký ca học ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDays.map(day => {
                const daySlots = groupedByDate.get(day) || [];
                return (
                  <div key={day} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                      <h2 className="text-base font-bold text-slate-800">
                        {formatDayLabel(day)}
                      </h2>
                      <span className="text-xs text-slate-500 font-medium">{daySlots.length} buổi</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {daySlots.map(slot => {
                        const cls = classMap.get(slot.classId);
                        const meetingLink = slot.meetingLink || cls?.meetingLink;
                        return (
                          <div
                            key={slot.id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2.5 hover:border-blue-200 hover:shadow-md transition"
                          >
                            <div className="flex items-center justify-between gap-1">
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
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 w-fit">
                              <Clock size={12} className="shrink-0" />
                              {slot.startTime} - {slot.endTime}
                            </div>

                            <h4 className="font-bold text-slate-800 text-sm leading-snug">{slot.subject}</h4>

                            <div className="text-xs text-slate-500 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={12} className="text-blue-500 shrink-0" />
                                <span>{slot.date}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <UserCheck size={12} className="text-indigo-500 shrink-0" />
                                <span className="truncate">{slot.teacherId}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                <span>{slot.roomId}</span>
                              </div>
                            </div>

                            {meetingLink ? (
                              <a
                                href={meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold"
                              >
                                <Video size={12} /> Vào Phòng học online <ExternalLink size={10} />
                              </a>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">Chưa có link phòng học online</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}