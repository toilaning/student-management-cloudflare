'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot } from '@/types/schedule';
import { Calendar, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function TeacherSchedulePage() {
  const { currentUser, isReady } = useApp();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const res = await fetch(`/api/schedule?teacherId=${currentUser?.id || ""}`);
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
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Thời khóa biểu Giảng dạy Cá nhân" 
          subtitle={`Danh sách tất cả các ca dạy của Thầy/Cô (${currentUser?.id || ""}) trong tháng 09/2026`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Tổng số: <strong className="text-blue-600">{slots.length}</strong> ca dạy được phân công
            </div>
            <div className="text-xs text-slate-500">
              Tháng 09/2026 (Từ 01/09 đến 30/09)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(slot => (
              <div key={slot.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-blue-300 transition space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
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

                <div className="space-y-1.5 text-xs text-slate-600">
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
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 italic">Mã ca: {slot.id}</span>
                  <Link
                    href={`/teacher/attendance?slotId=${slot.id}`}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs whitespace-nowrap shrink-0"
                  >
                    Sổ điểm danh
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
