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
  const shiftMap = new Map(shifts.map(s => [s.id, s]));
  const sortedShifts = [...shifts].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Group slot theo (thứ, ca) để render lưới
  const grid = new Map<string, ScheduleSlot[]>();
  slots.forEach(slot => {
    const day = dayOfWeekNumber(slot.date);
    const key = `${day}-${slot.shiftId}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(slot);
  });

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header
          title="Thời Khóa Biểu & Box Lịch Học Viên"
          subtitle={`Lịch học chi tiết của ${currentUser?.name || ''} (${currentUser?.id || ''}) - xem theo Lưới Thứ x Giờ`}
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Tổng số buổi học trong kỳ: <strong className="text-emerald-600 text-base font-bold">{slots.length}</strong> buổi
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Lưới thời khóa biểu: cột ngang là <strong>Thứ (T2 → CN)</strong>, hàng dọc là <strong>ca học (5 ca)</strong>
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 w-36 sticky left-0 bg-slate-50">
                      Ca học / Giờ
                    </th>
                    {DAY_ORDER.map(day => (
                      <th key={day} className="p-3 text-center text-xs font-bold text-slate-700 border-r border-slate-200">
                        <div className="text-slate-700">{DAY_LABELS[day]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedShifts.map(shift => (
                    <tr key={shift.id} className="border-b border-slate-100">
                      <td className="p-3 align-top bg-slate-50/60 border-r border-slate-200 sticky left-0 bg-slate-50">
                        <div className="font-bold text-indigo-700 text-xs">Ca {shift.id}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </td>
                      {DAY_ORDER.map(day => {
                        const cellSlots = grid.get(`${day}-${shift.id}`) || [];
                        return (
                          <td
                            key={day}
                            className={`p-2 align-top border-r border-slate-100 min-h-[96px] ${
                              cellSlots.length > 0 ? 'bg-blue-50/30' : 'bg-white'
                            }`}
                          >
                            {cellSlots.length > 0 ? (
                              <div className="space-y-2">
                                {cellSlots.map(slot => {
                                  const cls = classMap.get(slot.classId);
                                  const meetingLink = slot.meetingLink || cls?.meetingLink;
                                  return (
                                    <div
                                      key={slot.id}
                                      className="bg-white rounded-lg border border-blue-200 shadow-2xs p-2.5 space-y-1.5"
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
                                      <h4 className="font-bold text-slate-800 text-xs leading-snug">{slot.subject}</h4>
                                      <div className="text-[11px] text-slate-500 space-y-0.5">
                                        <div className="flex items-center gap-1">
                                          <Calendar size={11} className="text-blue-500 shrink-0" />
                                          <span>{slot.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <UserCheck size={11} className="text-indigo-500 shrink-0" />
                                          <span className="truncate">{slot.teacherId}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <MapPin size={11} className="text-slate-400 shrink-0" />
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
                            ) : (
                              <div className="text-slate-200 text-center text-[11px]">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}