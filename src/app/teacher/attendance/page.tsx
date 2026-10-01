'use client';

import { getTodayDateStr } from '@/utils/date';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { ScheduleSlot } from '@/types/schedule';
import { Student } from '@/types/student';
import { Calendar, RotateCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const SHIFT_OPTIONS = [
  { id: 'shift_afternoon', name: 'Ca Chiều', time: '14:00 - 17:00' },
  { id: 'shift_evening', name: 'Ca Tối', time: '18:00 - 21:00' },
  { id: 'shift_night', name: 'Ca Đêm', time: '21:00 - 23:00' },
];

function TeacherAttendanceContent() {
  const { currentUser, isReady } = useApp();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [selectedShiftPreset, setSelectedShiftPreset] = useState<string>('ALL');

  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Tải danh sách ca dạy của GV & danh sách học viên
  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function loadData() {
      setLoadingSlots(true);
      try {
        const [slotsRes, stRes] = await Promise.all([
          fetch(`/api/schedule?teacherId=${currentUser?.id || ""}`),
          fetch('/api/students?limit=1000')
        ]);
        const slotsData = await slotsRes.json();
        const stData = await stRes.json();

        const loadedSlots: ScheduleSlot[] = slotsData.slots || [];
        setSlots(loadedSlots);

        const stMap: Record<string, Student> = {};
        if (stData.students) {
          stData.students.forEach((s: Student) => { stMap[s.id] = s; });
        }
        setStudents(stMap);

        if (loadedSlots.length > 0) {
          setSelectedSlotId(loadedSlots[0].id);
        }
      } catch (e) {
        console.error(e);
        showToast('Lỗi khi tải lịch dạy của giảng viên', 'error');
      } finally {
        setLoadingSlots(false);
      }
    }
    loadData();
  }, [currentUser, isReady]);

  // Lọc slot theo ca nếu có chọn
  const filteredSlots = useMemo(() => {
    if (selectedShiftPreset === 'ALL') return slots;
    if (selectedShiftPreset === 'shift_afternoon') {
      return slots.filter(s => s.startTime.startsWith('14') || s.startTime.startsWith('13') || s.startTime.startsWith('15'));
    }
    if (selectedShiftPreset === 'shift_evening') {
      return slots.filter(s => s.startTime.startsWith('18') || s.startTime.startsWith('17') || s.startTime.startsWith('19'));
    }
    if (selectedShiftPreset === 'shift_night') {
      return slots.filter(s => s.startTime.startsWith('21') || s.startTime.startsWith('20') || s.startTime.startsWith('22'));
    }
    return slots;
  }, [slots, selectedShiftPreset]);

  // Load chi tiết điểm danh của slot đang chọn
  useEffect(() => {
    if (!isReady || !currentUser?.id || !selectedSlotId) return;

    async function loadAttendance() {
      setLoadingAttendance(true);
      try {
        const attRes = await fetch(`/api/attendance?slotId=${selectedSlotId}`);
        const attData = await attRes.json();

        if (attData.records && attData.records.length > 0) {
          setRecords(attData.records);
        } else {
          // Tạo bản ghi draft nếu chưa có
          const currentSlot = slots.find(s => s.id === selectedSlotId);
          if (currentSlot) {
            const clsRes = await fetch(`/api/classes?id=${currentSlot.classId}`);
            const clsData = await clsRes.json();
            const cls = clsData.class;
            if (cls && cls.studentIds) {
              const drafts: AttendanceRecord[] = (cls.studentIds || []).map((stId: string, idx: number) => ({
                id: `ATT_NEW_${selectedSlotId}_${idx}`,
                scheduleSlotId: selectedSlotId,
                classId: currentSlot.classId,
                studentId: stId,
                date: currentSlot.date,
                status: 'Có mặt',
                checkinTime: currentSlot.startTime ? `${currentSlot.startTime}:00` : '18:00:00',
                updatedBy: currentUser?.id || "",
                updatedAt: new Date().toISOString(),
              }));
              setRecords(drafts);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAttendance(false);
      }
    }
    loadAttendance();
  }, [selectedSlotId, slots, currentUser, isReady]);

  // 1-Click Action đổi trạng thái & lưu ngay lập tức
  const handleSingleClickStatus = async (index: number, newStatus: AttendanceStatus) => {
    const updated = [...records];
    const rec = updated[index];
    const oldStatus = rec.status;
    rec.status = newStatus;
    setRecords(updated);
    setSavingId(rec.studentId);

    try {
      const recordToSave: AttendanceRecord = {
        id: rec.id.startsWith('ATT_NEW_') ? `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` : rec.id,
        scheduleSlotId: rec.scheduleSlotId,
        classId: rec.classId,
        studentId: rec.studentId,
        date: rec.date,
        status: newStatus,
        checkinTime: newStatus === 'Có mặt' ? (rec.checkinTime || '18:00:00') : undefined,
        method: 'MANUAL',
        updatedBy: currentUser?.id || 'GV001',
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [recordToSave],
          slotId: selectedSlotId,
          updatedBy: currentUser?.id || 'GV001',
          updaterName: currentUser?.name || 'Giảng viên',
          userRole: 'TEACHER'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        rec.id = recordToSave.id;
        const stName = students[rec.studentId]?.name || rec.studentId;
        showToast(`Đã lưu: ${stName} 👉 [${newStatus}]`);
      } else {
        rec.status = oldStatus;
        setRecords([...records]);
        showToast('Không lưu được trạng thái, thử lại', 'error');
      }
    } catch (e: any) {
      rec.status = oldStatus;
      setRecords([...records]);
      showToast(e.message || 'Lỗi mạng khi lưu', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const currentSlot = slots.find(s => s.id === selectedSlotId);

  // Đếm nhanh 3 trạng thái
  const counts = useMemo(() => {
    let present = 0;
    let excused = 0;
    let unexcused = 0;

    records.forEach(r => {
      if (r.status === 'Có mặt') present++;
      else if (r.status === 'Vắng có phép' || r.status === 'Điểm danh bù') excused++;
      else if (r.status === 'Vắng không phép') unexcused++;
    });

    return { present, excused, unexcused, total: records.length };
  }, [records]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
      <Header 
        title="Sổ Điểm Danh Giảng Viên" 
        subtitle="1-Click Lưu Ngay • Bỏ Đi Muộn • Siêu Tinh Gọn 5 Giây Là Xong" 
      />

      <main className="p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-5">
        {toastMessage && (
          <div className={`p-3.5 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in fade-in duration-150 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
            <span className="text-xs sm:text-sm font-bold">{toastMessage.text}</span>
          </div>
        )}

        {/* 1. KHỐI CHỌN CA TO RÕ */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              <span className="font-extrabold text-sm sm:text-base text-slate-900 uppercase tracking-tight">Chọn ca dạy của thầy/cô:</span>
            </div>
            {currentSlot && (
              <div className="text-xs font-semibold px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
                Lớp: <strong className="text-indigo-600">{currentSlot.classId}</strong> • Phòng: <strong className="text-slate-900">{currentSlot.roomId}</strong> • Môn: <strong className="text-slate-900">{currentSlot.subject}</strong>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SHIFT_OPTIONS.map(shift => {
              const isSelected = selectedShiftPreset === shift.id;
              return (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => setSelectedShiftPreset(isSelected ? 'ALL' : shift.id)}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md scale-[1.01]'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg font-black tracking-tight">{shift.name}</span>
                    <Clock size={16} className={isSelected ? 'text-indigo-200' : 'text-slate-400'} />
                  </div>
                  <div className={`text-xs font-bold mt-1 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {shift.time}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredSlots.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">Ca học cụ thể:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {filteredSlots.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlotId(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedSlotId === s.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    [{s.date}] {s.subject} ({s.classId}) - {s.startTime}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. THỐNG KÊ 3 CHỈ SỐ TO RÕ (BỎ ĐI MUỘN) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border-2 border-emerald-200 p-3 sm:p-4 rounded-2xl text-center shadow-xs">
            <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">🟢 Có mặt</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{counts.present}</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-200 p-3 sm:p-4 rounded-2xl text-center shadow-xs">
            <div className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">🟡 Nghỉ phép</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{counts.excused}</div>
          </div>
          <div className="bg-rose-50 border-2 border-rose-300 p-3 sm:p-4 rounded-2xl text-center shadow-xs">
            <div className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">🔴 Không phép</div>
            <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{counts.unexcused}</div>
          </div>
        </div>

        {/* 3. BẢNG DANH SÁCH HỌC VIÊN TINH GIẢN & 3 NÚT BẤM TO BẢN (1-CLICK LƯU NGAY) */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="font-extrabold text-slate-800 text-sm">
              Danh sách học viên ca {currentSlot?.shiftId || ''} ({records.length} bạn)
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              ⚡ Thao tác 1 chạm - Lưu tức thì
            </span>
          </div>

          {loadingAttendance || loadingSlots ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <RotateCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
              Đang nạp danh sách học viên...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium">
              Không có học viên trong ca học này.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {records.map((r, idx) => {
                const student = students[r.studentId];
                const remaining = student?.remainingSessions ?? 12;
                const isSavingThis = savingId === r.studentId;

                return (
                  <div 
                    key={r.id || idx}
                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Cột 1: Thông tin học viên */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                            {student ? student.name : `Học viên ${r.studentId}`}
                          </span>
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {r.studentId}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{student?.gradeLevel || 'Lớp 12'}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            {student?.examBlock === 'KHOI_H' ? 'Khối H' : 'Khối V'}
                          </span>
                          <span>•</span>
                          <span className="text-indigo-600 font-semibold">
                            {student?.targetUniversity === 'KHAC' ? student?.customUniversity : (student?.targetUniversity || 'HAU')}
                          </span>
                          <span>•</span>
                          <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            Còn {remaining} buổi
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: 3 Nút bấm to bản */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Có mặt */}
                      <button
                        type="button"
                        disabled={isSavingThis}
                        onClick={() => handleSingleClickStatus(idx, 'Có mặt')}
                        className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 flex items-center justify-center gap-1.5 shadow-xs ${
                          r.status === 'Có mặt'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105 ring-2 ring-emerald-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        🟢 Có mặt
                      </button>

                      {/* Nghỉ phép */}
                      <button
                        type="button"
                        disabled={isSavingThis}
                        onClick={() => handleSingleClickStatus(idx, 'Vắng có phép')}
                        className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 flex items-center justify-center gap-1.5 shadow-xs ${
                          r.status === 'Vắng có phép' || r.status === 'Điểm danh bù'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105 ring-2 ring-amber-300'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        🟡 Nghỉ phép
                      </button>

                      {/* Không phép */}
                      <button
                        type="button"
                        disabled={isSavingThis}
                        onClick={() => handleSingleClickStatus(idx, 'Vắng không phép')}
                        className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 flex items-center justify-center gap-1.5 shadow-xs ${
                          r.status === 'Vắng không phép'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-105 ring-2 ring-rose-300'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        🔴 Không phép
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TeacherAttendancePage() {
  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Đang tải sổ điểm danh...</div>}>
        <TeacherAttendanceContent />
      </Suspense>
    </RoleGuard>
  );
}
