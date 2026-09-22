'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { Calendar, Clock, MapPin, UserCheck, BookOpen, CheckCircle2, ChevronRight, Video, ExternalLink } from 'lucide-react';
import Link from 'next/link';

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

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Thời Khóa Biểu & Box Lịch Học Viên" 
          subtitle={`Lịch học chi tiết của ${currentUser?.name || ''} (${currentUser?.id || ''}) trong tháng 09/2026`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Tổng số buổi học trong tháng: <strong className="text-emerald-600 text-base font-bold">{slots.length}</strong> buổi
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Kỳ học: Tháng 09/2026 • Khung giờ ca học được cập nhật theo cấu hình mới nhất
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
              <p>Bạn chưa có lịch học nào trong tháng này.</p>
              <Link
                href="/student/classes"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
              >
                Đăng ký ca học ngay
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {slots.map(slot => {
                const cls = classMap.get(slot.classId);
                const shift = shiftMap.get(slot.shiftId);
                const startTime = shift?.startTime || slot.startTime;
                const endTime = shift?.endTime || slot.endTime;
                const meetingLink = slot.meetingLink || cls?.meetingLink;

                return (
                  <div
                    key={slot.id}
                    className="bg-blue-50/40 rounded-2xl border-2 border-blue-300 shadow-xs p-5 hover:border-blue-400 hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                              {slot.classId}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                              {slot.id}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-base mt-2 leading-snug">{slot.subject}</h3>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${
                          slot.status === 'Đã hoàn thành' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-blue-600 text-white shadow-2xs'
                        }`}>
                          {slot.status}
                        </span>
                      </div>

                      {/* Box thông tin lịch & ca học */}
                      <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-2xs space-y-2 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={14} className="text-blue-500" /> Ngày học:</span>
                          <strong className="text-slate-800 font-semibold">{slot.date}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5"><Clock size={14} className="text-indigo-500" /> Ca học:</span>
                          <strong className="text-indigo-600 font-bold">Ca {slot.shiftId} ({startTime} - {endTime})</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> Phòng học:</span>
                          <strong className="text-slate-700">{slot.roomId}</strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-400 flex items-center gap-1.5"><UserCheck size={14} className="text-indigo-600" /> Giảng viên:</span>
                          <strong className="text-indigo-700 font-semibold">{slot.teacherId}</strong>
                        </div>
                      </div>

                      {slot.topic && (
                        <div className="p-2.5 bg-white/70 rounded-lg text-[11px] text-slate-600 italic border border-blue-100/60">
                          Chủ đề: {slot.topic}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-blue-100 mt-2 flex items-center justify-between gap-2">
                      {meetingLink ? (
                        <a
                          href={meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Video size={14} /> Vào phòng Discord / Online
                        </a>
                      ) : (
                        <Link
                          href="/student/classes"
                          className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold text-center transition flex items-center justify-center gap-1"
                        >
                          Xem chi tiết lớp <ChevronRight size={14} />
                        </Link>
                      )}
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
