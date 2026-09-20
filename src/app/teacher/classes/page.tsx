'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassEntity } from '@/types/classroom';
import { BookOpen, Users, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

export default function TeacherClassesPage() {
  const { currentUser, isReady } = useApp();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const res = await fetch(`/api/classes?teacherId=${currentUser?.id || ""}`);
        const data = await res.json();
        setClasses(data.classes || []);
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
          title="Danh sách Lớp học Giảng dạy" 
          subtitle={`Các lớp do Thầy/Cô (${currentUser?.id || ""} - ${currentUser?.name || ""}) trực tiếp đứng lớp`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Số lượng lớp: <strong className="text-blue-600">{classes.length}</strong> lớp
            </div>
            <div className="text-xs text-slate-500">
              Kỳ đào tạo Tháng 09/2026
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map(cls => (
              <div key={cls.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-blue-300 transition space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                      {cls.code}
                    </span>
                    <h3 className="font-bold text-slate-800 text-base mt-1.5">{cls.name}</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {cls.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Users size={14} /> Sĩ số:</span>
                    <span className="font-semibold text-slate-800">{cls.studentIds.length} học viên</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><MapPin size={14} /> Phòng học:</span>
                    <span className="font-semibold text-slate-800">{cls.roomId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Clock size={14} /> Ca dạy:</span>
                    <span className="font-semibold text-slate-800">Ca {cls.shiftId} (Thứ {cls.scheduleDays.join(', ')})</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Mã lớp: {cls.id}</span>
                  <Link
                    href={`/teacher/attendance?classId=${cls.id}`}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Xem điểm danh lớp
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
