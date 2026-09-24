'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassEntity } from '@/types/classroom';
import { TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { BookOpen, Users, MapPin, Clock, CheckCircle2, UserCheck, AlertCircle, Sparkles, Check, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

export default function TeacherClassesPage() {
  const { currentUser, isReady } = useApp();
  const [allClasses, setAllClasses] = useState<ClassEntity[]>([]);
  const [selectedClassForView, setSelectedClassForView] = useState<ClassEntity | null>(null);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [loading, setLoading] = useState(true);
  const [claimingClassId, setClaimingClassId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'MINE' | 'AVAILABLE'>('ALL');

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [clsRes, shiftRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/shifts'),
      ]);
      const clsData = await clsRes.json();
      const shiftData = await shiftRes.json();

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

  
  const handleOpenClassStudents = async (cls: ClassEntity) => {
    setSelectedClassForView(cls);
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/students?limit=1000');
      const data = await res.json();
      const allSt = data.students || [];
      const enrolled = allSt.filter((s: any) => (cls.studentIds || []).includes(s.id));
      setClassStudents(enrolled);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClaimShift = async (cls: ClassEntity) => {
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
        setActionMessage(`Thầy/Cô đã nhận ca dạy lớp ${cls.name} (${cls.code}) thành công!`);
        await loadData();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.error || 'Nhận ca dạy thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng khi nhận ca dạy');
    } finally {
      setClaimingClassId(null);
    }
  };

  const shiftMap = new Map<number, TimeShift>(shifts.map(s => [s.id, s]));

  const myClasses = allClasses.filter(c => c.teacherId === currentUser?.id);
  const availableClasses = allClasses.filter(c => !c.teacherId || c.teacherId === 'CHUA_PHAN_CONG' || c.teacherId === '');

  const displayedClasses = allClasses.filter(c => {
    if (filterMode === 'MINE') return c.teacherId === currentUser?.id;
    if (filterMode === 'AVAILABLE') return !c.teacherId || c.teacherId === 'CHUA_PHAN_CONG' || c.teacherId === '';
    return true;
  });

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Thời Khóa Biểu & Quản Lý Ca Dạy" 
          subtitle={`Giảng viên: ${currentUser?.name || ''} (${currentUser?.id || ''}) - Kỳ đào tạo Tháng 09/2026`} 
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

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Ca bạn trực tiếp giảng dạy</span>
                <div className="text-xl font-bold text-blue-600 mt-1">{myClasses.length} lớp / ca</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <UserCheck size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Ca mở đang chờ nhận lớp</span>
                <div className="text-xl font-bold text-emerald-600 mt-1">{availableClasses.length} ca trống</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Sparkles size={20} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Tổng số lớp trung tâm mở</span>
                <div className="text-xl font-bold text-slate-800 mt-1">{allClasses.length} lớp</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                <BookOpen size={20} />
              </div>
            </div>
          </div>

          {/* Filter & View Navigation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterMode === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ca học ({allClasses.length})
              </button>
              <button
                onClick={() => setFilterMode('MINE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterMode === 'MINE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ca bạn đang dạy ({myClasses.length})
              </button>
              <button
                onClick={() => setFilterMode('AVAILABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterMode === 'AVAILABLE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ca mở / Trống ({availableClasses.length})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Ca đã phân công</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Ca mở / Nhận ca</span>
            </div>
          </div>

          {/* Interactive Schedule Box Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedClasses.map(cls => {
              const isMine = cls.teacherId === currentUser?.id;
              const isOpen = !cls.teacherId || cls.teacherId === 'CHUA_PHAN_CONG' || cls.teacherId === '';
              const shiftInfo = shiftMap.get(cls.shiftId ?? 1);
              const shiftTimeLabel = shiftInfo ? `${shiftInfo.startTime} - ${shiftInfo.endTime}` : 'Theo lịch ca';
              const shiftName = shiftInfo?.name || `Ca ${cls.shiftId}`;

              return (
                <div
                  key={cls.id}
                  className={`rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isMine 
                      ? 'bg-blue-50/40 border-blue-300 ring-2 ring-blue-500/20 shadow-md' 
                      : isOpen
                      ? 'bg-emerald-50/30 border-emerald-300 hover:border-emerald-400 hover:shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Header Box */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shadow-2xs">
                            {cls.code} • {cls.id}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {cls.subject}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-2 leading-snug">{cls.name}</h3>
                      </div>

                      {isMine ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-600 text-white shadow-2xs flex items-center gap-1 shrink-0">
                          <Check size={12} /> Đang dạy
                        </span>
                      ) : isOpen ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-600 text-white shadow-2xs flex items-center gap-1 shrink-0 animate-pulse">
                          <Sparkles size={12} /> Ca mở
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          GV: {cls.teacherId}
                        </span>
                      )}
                    </div>

                    {/* Box Details: Ca học, Khung giờ, Phòng, Thứ */}
                    <div className="bg-white rounded-xl p-3 border border-slate-100/80 shadow-2xs space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5"><Clock size={13} className="text-indigo-500" /> Ca học:</span>
                        <span className="font-bold text-slate-800">{shiftName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> Khung giờ:</span>
                        <span className="font-semibold text-indigo-600">{shiftTimeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> Phòng học:</span>
                        <span className="font-semibold text-slate-700">{cls.roomId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Lịch trong tuần:</span>
                        <span className="font-semibold text-emerald-700">Thứ {cls.scheduleDays.join(', ')}</span>
                      </div>
                      <div 
                        onClick={() => handleOpenClassStudents(cls)}
                        className="flex items-center justify-between pt-1 border-t border-slate-100 hover:bg-slate-50 p-1 rounded-lg cursor-pointer transition"
                        title="Bấm để xem danh sách học sinh của lớp"
                      >
                        <span className="text-slate-600 font-medium flex items-center gap-1.5">
                          <Users size={13} className="text-blue-600" /> Sĩ số đăng ký:
                        </span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs hover:underline flex items-center gap-1">
                          {cls.studentIds.length} học viên <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between gap-2">
                    {isMine ? (
                      <Link
                        href={`/teacher/attendance?classId=${cls.id}`}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <UserCheck size={14} /> Sổ điểm danh & Đánh giá
                      </Link>
                    ) : isOpen ? (
                      <button
                        onClick={() => handleClaimShift(cls)}
                        disabled={claimingClassId === cls.id}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus size={14} /> {claimingClassId === cls.id ? 'Đang xử lý...' : 'Nhận ca dạy này'}
                      </button>
                    ) : (
                      <div className="w-full py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold text-center">
                        Đã phân công giảng viên: <strong>{cls.teacherId}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    
      {/* Modal Giáo viên xem chi tiết Lớp học & Danh sách học sinh */}
      {selectedClassForView && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono">
                    {selectedClassForView.code} • {selectedClassForView.id}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{selectedClassForView.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Môn học: <strong className="text-slate-800">{selectedClassForView.subject}</strong> • Khung giờ: <strong className="text-slate-800">{selectedClassForView.startTime || '18:30'} - {selectedClassForView.endTime || '20:30'}</strong> • Thứ: <strong className="text-slate-800">{selectedClassForView.scheduleDays?.join(', ')}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedClassForView(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Danh sách học sinh đang học ({classStudents.length} học viên)
                </span>
                {selectedClassForView.meetingLink && (
                  <a
                    href={selectedClassForView.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    Vào phòng học Discord ↗
                  </a>
                )}
              </div>

              {loadingStudents ? (
                <div className="p-8 text-center text-xs text-slate-400">Đang tải danh sách học sinh...</div>
              ) : classStudents.length === 0 ? (
                <div className="p-8 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400">
                  Lớp học này hiện chưa có học sinh nào đăng ký.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {classStudents.map((st, idx) => (
                    <div key={st.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono text-[11px] w-5 text-center">{idx + 1}</span>
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span>{st.name}</span>
                            <span className="font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {st.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span>Mục tiêu: <strong>{st.targetUniversity === 'KHAC' ? (st.customUniversity || 'Trường khác') : (st.targetUniversity || 'HAU')}</strong></span>
                            <span>• Khối: <strong className="text-indigo-700">{st.examBlock === 'KHOI_H' ? 'Khối H' : 'Khối V'}</strong></span>
                            <span>• {st.gradeLevel || 'Lớp 12'}</span>
                            {st.homeTown && <span>• Quê: {st.homeTown}</span>}
                          </div>
                          {st.otherNotes && (
                            <div className="text-[10px] text-amber-800 italic mt-0.5 bg-amber-50/60 px-1.5 py-0.5 rounded inline-block">
                              Ghi chú: {st.otherNotes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          Còn {st.remainingSessions ?? 12} buổi
                        </div>
                        {st.phone && (
                          <div className="text-[11px] text-slate-400 mt-1 font-mono">
                            {st.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Thầy/Cô có thể điểm danh và đánh giá buổi học trong mục <strong>Sổ điểm danh</strong>.
              </span>
              <button
                type="button"
                onClick={() => setSelectedClassForView(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </RoleGuard>
  );
}
