'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { Calendar, Clock, MapPin, CheckCircle2, Users, BookOpen, Sparkles, Plus, Check } from 'lucide-react';
import Link from 'next/link';

export default function TeacherSchedulePage() {
  const { currentUser, isReady } = useApp();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [allClasses, setAllClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [claimingClassId, setClaimingClassId] = useState<string | null>(null);

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
        setActionMessage(`Đã nhận ca dạy thành công cho lớp ${cls.name}!`);
        await loadData();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.error || 'Nhận ca dạy thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    } finally {
      setClaimingClassId(null);
    }
  };

  const classMap = new Map(allClasses.map(c => [c.id, c]));
  const shiftMap = new Map(shifts.map(s => [s.id, s]));

  // Ca mở chưa có GV phân công
  const openClasses = allClasses.filter(c => !c.teacherId || c.teacherId === 'CHUA_PHAN_CONG' || c.teacherId === '');

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Lịch Dạy & Box Ca Học Giảng Viên" 
          subtitle={`Lịch giảng dạy chi tiết của Thầy/Cô ${currentUser?.name || ''} (${currentUser?.id || ''}) - Tháng 09/2026`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {actionMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span className="font-medium">{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:underline font-bold">
                Đóng
              </button>
            </div>
          )}

          {/* Banner Thống kê */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Tổng số buổi dạy được phân công: <strong className="text-blue-600 text-base font-bold">{slots.length}</strong> buổi
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Lịch đã được đồng bộ với giờ ca học mới nhất từ Quản trị viên
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/teacher/classes"
                className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <BookOpen size={14} /> Danh mục các lớp giảng dạy
              </Link>
            </div>
          </div>

          {/* Section 1: Ca đã phân công (Box nổi bật) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                Các ca học đã phân công phụ trách ({slots.length} buổi)
              </h2>
              <span className="text-xs text-slate-500 font-medium">Hiển thị theo Box thẻ trực quan</span>
            </div>

            {slots.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
                Thầy/Cô hiện chưa có lịch dạy buổi nào trong tháng này. Vui lòng nhận các ca mở bên dưới!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {slots.map(slot => {
                  const cls = classMap.get(slot.classId);
                  const shift = shiftMap.get(slot.shiftId);
                  const startTime = shift?.startTime || slot.startTime;
                  const endTime = shift?.endTime || slot.endTime;
                  const studentCount = cls?.studentIds?.length || 0;

                  return (
                    <div
                      key={slot.id}
                      className="bg-blue-50/30 rounded-2xl border-2 border-blue-300 shadow-xs p-5 hover:border-blue-400 hover:shadow-md transition space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                              {slot.classId} • {slot.id}
                            </span>
                            <h3 className="font-bold text-slate-800 text-base mt-2">{slot.subject}</h3>
                          </div>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${
                            slot.status === 'Đã hoàn thành' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-blue-600 text-white shadow-2xs'
                          }`}>
                            {slot.status}
                          </span>
                        </div>

                        {/* Thẻ Box chi tiết */}
                        <div className="bg-white rounded-xl p-3 border border-blue-100/80 shadow-2xs space-y-2 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={14} className="text-blue-500" /> Ngày dạy:</span>
                            <strong className="text-slate-800 font-semibold">{slot.date}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><Clock size={14} className="text-indigo-500" /> Khung giờ:</span>
                            <strong className="text-indigo-600 font-bold">Ca {slot.shiftId} ({startTime} - {endTime})</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> Phòng học:</span>
                            <strong className="text-slate-700">{slot.roomId}</strong>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-400 flex items-center gap-1.5"><Users size={14} className="text-emerald-500" /> Sĩ số học sinh:</span>
                            <strong className="text-emerald-700 font-bold">{studentCount} học viên</strong>
                          </div>
                        </div>

                        {slot.topic && (
                          <div className="p-2.5 bg-white/70 rounded-lg text-[11px] text-slate-600 italic border border-blue-100/60">
                            Chủ đề bài giảng: {slot.topic}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-blue-100/80 mt-2 flex items-center justify-between gap-2">
                        <Link
                          href={`/teacher/attendance?classId=${slot.classId}&slotId=${slot.id}`}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={14} /> Điểm danh buổi học
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Ca mở / Trống cần tuyển GV (Có nút Nhận ca dạy này) */}
          {openClasses.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  Các ca mở / Lớp trống chưa có giảng viên ({openClasses.length} lớp)
                </h2>
                <span className="text-xs text-emerald-600 font-semibold">Thầy/Cô có thể nhận trực tiếp</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {openClasses.map(cls => {
                  const shift = shiftMap.get(cls.shiftId ?? 1);
                  const startTime = shift?.startTime || '08:00';
                  const endTime = shift?.endTime || '10:00';

                  return (
                    <div
                      key={cls.id}
                      className="bg-emerald-50/40 rounded-2xl border-2 border-emerald-300 shadow-xs p-5 hover:border-emerald-400 hover:shadow-md transition space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {cls.code} • {cls.id}
                            </span>
                            <h3 className="font-bold text-slate-800 text-base mt-2">{cls.name}</h3>
                          </div>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                            <Sparkles size={12} /> Ca mở
                          </span>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs space-y-2 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><Clock size={14} className="text-indigo-500" /> Khung ca:</span>
                            <strong className="text-indigo-600 font-bold">Ca {cls.shiftId} ({startTime} - {endTime})</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={14} className="text-emerald-600" /> Ngày trong tuần:</span>
                            <strong className="text-slate-700">Thứ {cls.scheduleDays.join(', ')}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> Phòng học:</span>
                            <strong className="text-slate-700">{cls.roomId}</strong>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-slate-400 flex items-center gap-1.5"><Users size={14} className="text-blue-500" /> Sĩ số hiện tại:</span>
                            <strong className="text-slate-800 font-bold">{cls.studentIds.length} học viên đã chọn</strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-emerald-100 mt-2">
                        <button
                          onClick={() => handleClaimClass(cls)}
                          disabled={claimingClassId === cls.id}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} /> {claimingClassId === cls.id ? 'Đang nhận ca...' : 'Nhận ca dạy này'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
