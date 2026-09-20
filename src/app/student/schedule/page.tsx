'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot } from '@/types/schedule';
import { Calendar, Clock, MapPin, UserCheck, BookOpen } from 'lucide-react';

export default function StudentSchedulePage() {
  const { currentUser, isReady } = useApp();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const res = await fetch(`/api/schedule?studentId=${currentUser?.id || ""}`);
        const data = await res.json();
        setSlots(data.slots || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Thời Khóa Biểu Học Viên" 
          subtitle={`Lịch học của ${currentUser?.name || ""} (${currentUser?.id || ""}) trong tháng 09/2026`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Tổng số buổi học trong tháng: <strong className="text-emerald-600">{slots.length}</strong> buổi
            </div>
            <div className="text-xs text-slate-500">
              Kỳ học: Tháng 09/2026
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(slot => (
              <div key={slot.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-emerald-300 transition space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {slot.classId}
                    </span>
                    <h3 className="font-bold text-slate-800 text-base mt-1.5">{slot.subject}</h3>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                    slot.status === 'Đã hoàn thành' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {slot.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span>Ngày: <strong className="text-slate-800">{slot.date}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span>Ca {slot.shiftId} ({slot.startTime} - {slot.endTime})</span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>Phòng học: <strong className="text-slate-800">{slot.roomId}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <UserCheck size={14} className="text-slate-400 shrink-0" />
                    <span>Giảng viên: <strong className="text-indigo-600">{slot.teacherId}</strong></span>
                  </div>
                </div>

                {slot.topic && (
                  <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-500 italic">
                    Chủ đề: {slot.topic}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
