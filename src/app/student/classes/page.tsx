'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassEntity } from '@/types/classroom';
import { BookOpen, Users, UserCheck, Search, Check, Plus, AlertCircle, Clock, Calendar, MapPin, CheckCircle2, ChevronRight, Video, ExternalLink } from 'lucide-react';

interface ShiftInfo {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
}

export default function StudentClassesPage() {
  const { currentUser, isReady } = useApp();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<ShiftInfo[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [clsRes, stRes, shiftRes] = await Promise.all([
        fetch('/api/classes'),
        fetch(`/api/students?id=${currentUser.id}`),
        fetch('/api/shifts'),
      ]);
      const clsData = await clsRes.json();
      const stData = await stRes.json();
      const shiftData = await shiftRes.json();
      setClasses(clsData.classes || []);
      setStudent(stData.student || null);
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

  const handleRegister = async (classId: string, className: string) => {
    if (!student) return;
    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: currentUser?.id || '',
          action: 'ENROLL',
          actorId: currentUser?.id || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Đăng ký thành công ca học lớp "${className}"!`);
        await loadData();
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        alert(data.error || 'Đăng ký thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const shiftMap = new Map<number, ShiftInfo>();
  shifts.forEach(s => shiftMap.set(s.id, s));

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.teacherId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header
          title="Chọn Ca & Lịch Học Trực Quan"
          subtitle="Học viên chọn ca học theo các Box lịch được Admin thiết lập sẵn cho kỳ Tháng 09/2026"
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {actionMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between font-semibold animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:underline">
                Đóng
              </button>
            </div>
          )}

          {/* Thanh tìm kiếm & Trạng thái */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo môn học, tên ca, giáo viên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-emerald-600"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Số ca bạn đã đăng ký: <strong className="text-emerald-600 font-bold">{student?.enrolledClassIds?.length || 0} ca/lớp</strong>
            </div>
          </div>

          {/* HƯỚNG DẪN MÀU SẮC BOX */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 flex-wrap bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider">Trạng thái Box:</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> 🟩 Còn chỗ (Được chọn)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span> 🟦 Ca bạn đang học</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block"></span> ⬛ Đã đủ sĩ số (Hết chỗ)</span>
          </div>

          {/* GRID CÁC BOX CA HỌC ĐƯỢC THIẾT LẬP BỞI ADMIN */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(cls => {
              const isEnrolled = student?.enrolledClassIds?.includes(cls.id);
              const currentStudents = (cls.studentIds || []).length;
              const maxCapacity = 15;
              const isFull = currentStudents >= maxCapacity;
              const shift = shiftMap.get(cls.shiftId) || {
                id: cls.shiftId,
                name: `Ca ${cls.shiftId}`,
                startTime: '08:00',
                endTime: '10:00'
              };

              return (
                <div 
                  key={cls.id} 
                  className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs flex flex-col justify-between ${
                    isEnrolled 
                      ? 'border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-50/20' 
                      : isFull
                      ? 'border-slate-200 opacity-75 bg-slate-50/50'
                      : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Top Box Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {cls.code} • {cls.id}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {cls.subject}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-base mt-1.5 leading-snug">{cls.name}</h3>
                      </div>

                      {isEnrolled ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-600 text-white flex items-center gap-1 shrink-0 shadow-xs">
                          <Check size={13} /> Đang học
                        </span>
                      ) : isFull ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-200 text-slate-600 shrink-0">
                          Hết chỗ
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Còn chỗ
                        </span>
                      )}
                    </div>

                    {/* Lịch học & Khung giờ Admin tùy chỉnh */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Clock size={13} /> Khung giờ:
                        </span>
                        <span className="font-bold text-indigo-700 font-mono">
                          {shift.startTime} - {shift.endTime} ({shift.name})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar size={13} /> Lịch học tuần:
                        </span>
                        <span className="font-bold text-slate-800">
                          Thứ {cls.scheduleDays.join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1 font-medium">
                          <MapPin size={13} /> Phòng / Link:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {cls.roomId}
                        </span>
                      </div>
                    </div>

                    {/* Sĩ số & Giảng viên */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={14} className="text-slate-400" />
                        <span>GV: <strong className="text-slate-800">{cls.teacherId}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        <span>Sĩ số: <strong className={`${isFull ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{currentStudents}/{maxCapacity}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    {isEnrolled ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 flex items-center justify-center gap-1.5 cursor-default"
                      >
                        <Check size={14} /> Bạn đã ở trong ca học này
                      </button>
                    ) : isFull ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center"
                      >
                        Ca học đã đủ sĩ số ({currentStudents}/{maxCapacity})
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(cls.id, cls.name)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus size={14} /> Chọn Ca Học Này
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
