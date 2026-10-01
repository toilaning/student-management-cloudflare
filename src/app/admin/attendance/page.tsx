'use client';

import { getTodayDateStr } from '@/utils/date';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { ScheduleSlot } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { Student } from '@/types/student';
import { 
  Calendar, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Edit3,
  X,
  Clock,
  Sparkles
} from 'lucide-react';

interface ExtendedAttendanceRecord extends AttendanceRecord {
  studentName?: string;
  studentPhone?: string;
}

// 3 ca học đặc thù của Mr. Thuyết
const SHIFT_OPTIONS = [
  { id: 'shift_afternoon', name: 'Ca Chiều', time: '14:00 - 17:00' },
  { id: 'shift_evening', name: 'Ca Tối', time: '18:00 - 21:00' },
  { id: 'shift_night', name: 'Ca Đêm', time: '21:00 - 23:00' },
];

function AttendanceContent() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [selectedShiftPreset, setSelectedShiftPreset] = useState<string>('ALL');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [studentsMap, setStudentsMap] = useState<Map<string, Student>>(new Map());
  const [records, setRecords] = useState<ExtendedAttendanceRecord[]>([]);

  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal chỉnh nhanh số buổi còn lại
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editRemainingInput, setEditRemainingInput] = useState<number>(12);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Tải danh mục lớp & danh sách học viên
  useEffect(() => {
    async function initData() {
      try {
        const [clsRes, stRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/students?limit=1000')
        ]);
        const clsData = await clsRes.json();
        const stData = await stRes.json();

        if (clsData.classes) setClasses(clsData.classes);
        if (stData.students) {
          const map = new Map<string, Student>();
          stData.students.forEach((s: Student) => map.set(s.id, s));
          setStudentsMap(map);
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
        showToast('Không thể nạp danh mục lớp hoặc học viên', 'error');
      }
    }
    initData();
  }, []);

  // 2. Nạp ca học theo ngày
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDate) return;
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/schedule?date=${selectedDate}`);
        const data = await res.json();
        const loadedSlots: ScheduleSlot[] = data.slots || [];
        setSlots(loadedSlots);

        if (loadedSlots.length > 0) {
          const currentExists = loadedSlots.some(s => s.id === selectedSlotId);
          if (!currentExists) {
            setSelectedSlotId(loadedSlots[0].id);
          }
        } else {
          setSelectedSlotId('');
          setRecords([]);
        }
      } catch (err) {
        console.error('Lỗi nạp ca học:', err);
        showToast('Lỗi khi tải danh sách ca học', 'error');
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedDate]);

  // Lọc slots hiển thị theo 3 ca hoặc tất cả
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

  // Tự chọn ca đầu tiên của filter nếu selectedSlotId không nằm trong filter
  useEffect(() => {
    if (filteredSlots.length > 0) {
      const exists = filteredSlots.some(s => s.id === selectedSlotId);
      if (!exists) {
        setSelectedSlotId(filteredSlots[0].id);
      }
    }
  }, [filteredSlots]);

  // 3. Nạp danh sách điểm danh cho Ca học đang chọn
  useEffect(() => {
    if (!selectedSlotId) {
      setRecords([]);
      return;
    }

    const currentSlot = slots.find(s => s.id === selectedSlotId);
    if (!currentSlot) return;

    async function loadSlotAttendance(slot: ScheduleSlot) {
      setLoadingAttendance(true);
      try {
        const attRes = await fetch(`/api/attendance?slotId=${slot.id}`);
        const attData = await attRes.json();
        const existingRecords: AttendanceRecord[] = attData.records || [];

        const cls = classes.find(c => c.id === slot.classId);
        const studentIds: string[] = cls?.studentIds || [];

        const existingMap = new Map<string, AttendanceRecord>();
        existingRecords.forEach(r => existingMap.set(r.studentId, r));

        const allStudentIds = Array.from(new Set([...studentIds, ...Array.from(existingMap.keys())]));

        const mergedRecords: ExtendedAttendanceRecord[] = allStudentIds.map(stId => {
          const student = studentsMap.get(stId);
          const existing = existingMap.get(stId);

          if (existing) {
            return {
              ...existing,
              studentName: student?.name || `Học viên ${stId}`,
              studentPhone: student?.phone || '-',
            };
          }

          return {
            id: `ATT_NEW_${slot.id}_${stId}`,
            scheduleSlotId: slot.id,
            classId: slot.classId,
            studentId: stId,
            date: slot.date,
            status: 'Có mặt',
            checkinTime: slot.startTime ? `${slot.startTime}:00` : '18:00:00',
            updatedBy: 'ADMIN001',
            updatedAt: new Date().toISOString(),
            method: 'MANUAL',
            studentName: student?.name || `Học viên ${stId}`,
            studentPhone: student?.phone || '-',
          };
        });

        setRecords(mergedRecords);
      } catch (err) {
        console.error('Lỗi khi nạp điểm danh:', err);
        showToast('Lỗi khi nạp danh sách học viên của ca học', 'error');
      } finally {
        setLoadingAttendance(false);
      }
    }

    loadSlotAttendance(currentSlot);
  }, [selectedSlotId, slots, classes, studentsMap]);

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

  // 1-Click Action lưu ngay lập tức
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
        updatedBy: 'ADMIN001',
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [recordToSave],
          slotId: selectedSlotId,
          updatedBy: 'ADMIN001',
          updaterName: 'Quản trị viên',
          userRole: 'ADMIN'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        rec.id = recordToSave.id;
        showToast(`Đã lưu: ${rec.studentName} 👉 [${newStatus}]`);
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

  // Cập nhật số buổi
  const handleUpdateStudentSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const res = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainingSessions: editRemainingInput })
      });
      if (res.ok) {
        showToast(`Đã đổi số buổi của ${editingStudent.name} thành ${editRemainingInput}`);
        const updated = new Map(studentsMap);
        const st = updated.get(editingStudent.id);
        if (st) {
          st.remainingSessions = editRemainingInput;
          updated.set(editingStudent.id, { ...st });
          setStudentsMap(updated);
        }
        setEditingStudent(null);
      } else {
        showToast('Lỗi cập nhật số buổi', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi kết nối', 'error');
    }
  };

  const currentSlot = slots.find(s => s.id === selectedSlotId);

  return (
    <RoleGuard allowedRoles={['ADMIN', 'TEACHER']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Sổ Điểm Danh Siêu Tinh Gọn" 
          subtitle="Thao tác 5 giây - Bấm nút là lưu ngay lập tức - Không rườm rà thủ tục" 
        />

        <main className="p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-5">
          {/* Toast thông báo nổi */}
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

          {/* KHỐI 1: BỘ CHỌN NGÀY & 3 CA TO RÕ BẢN LỚN (FLAPPY BIRD VIBE) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-indigo-600" />
                <span className="font-extrabold text-sm sm:text-base text-slate-900 uppercase tracking-tight">Chọn ngày:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-indigo-50 border-2 border-indigo-200 rounded-xl px-3 py-1.5 font-bold text-indigo-900 text-sm focus:outline-indigo-600 cursor-pointer"
                />
              </div>

              {currentSlot && (
                <div className="text-xs font-semibold px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
                  Phòng: <strong className="text-indigo-600">{currentSlot.roomId}</strong> • Môn: <strong className="text-slate-900">{currentSlot.subject}</strong>
                </div>
              )}
            </div>

            {/* 3 NÚT CA TO RÕ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {SHIFT_OPTIONS.map(shift => {
                const isSelected = selectedShiftPreset === shift.id;
                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => setSelectedShiftPreset(isSelected ? 'ALL' : shift.id)}
                    className={`p-3.5 rounded-xl border-2 text-left font-sans transition-all cursor-pointer flex flex-col justify-between ${
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

            {/* Nếu có nhiều slot trong ngày/ca đã lọc */}
            {filteredSlots.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500">Lớp cụ thể:</span>
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
                      {s.subject} ({s.classId}) - {s.startTime}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 2: THỐNG KÊ 3 SỐ CHỈ SỐ TO RÕ (KHÔNG CÓ ĐI MUỘN NỮA) */}
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
              <div className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">🔴 Không phép (Cần chăm sóc)</div>
              <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{counts.unexcused}</div>
            </div>
          </div>

          {/* KHỐI 3: DANH SÁCH BẢNG DỌC TINH GIẢN VỚI 3 NÚT BẤM TO BẢN (1-CLICK LƯU NGAY) */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="font-extrabold text-slate-800 text-sm">
                Danh sách học viên ({records.length} bạn)
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                ⚡ Bấm nút là lưu tự động 100%
              </span>
            </div>

            {loadingAttendance || loadingSlots ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                <RotateCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
                Đang nạp danh sách học sinh...
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                {selectedSlotId ? 'Không có học viên trong ca học này.' : 'Không có ca học nào trong ngày hoặc bộ lọc đã chọn.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {records.map((rec, idx) => {
                  const student = studentsMap.get(rec.studentId);
                  const remaining = student?.remainingSessions ?? 12;
                  const isSavingThis = savingId === rec.studentId;

                  return (
                    <div 
                      key={rec.id || idx} 
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
                              {rec.studentName}
                            </span>
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {rec.studentId}
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
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStudent(student || { id: rec.studentId, name: rec.studentName || '', phone: '', status: 'Đang học', enrolledClassIds: [], createdAt: '' });
                                setEditRemainingInput(remaining);
                              }}
                              className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 text-[11px] cursor-pointer"
                              title="Bấm để chỉnh số buổi còn lại"
                            >
                              <span>Còn {remaining} buổi</span>
                              <Edit3 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Cột 2: 3 NÚT BẤM TO BẢN (1-CLICK LƯU NGAY) */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* 1. NÚT CÓ MẶT (XANH LÁ TO BẢN) */}
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSingleClickStatus(idx, 'Có mặt')}
                          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 flex items-center justify-center gap-1.5 shadow-xs ${
                            rec.status === 'Có mặt'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105 ring-2 ring-emerald-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          🟢 Có mặt
                        </button>

                        {/* 2. NÚT NGHỈ PHÉP (VÀNG TO BẢN) */}
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSingleClickStatus(idx, 'Vắng có phép')}
                          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 flex items-center justify-center gap-1.5 shadow-xs ${
                            rec.status === 'Vắng có phép' || rec.status === 'Điểm danh bù'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105 ring-2 ring-amber-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          🟡 Nghỉ phép
                        </button>

                        {/* 3. NÚT KHÔNG PHÉP (ĐỎ TO BẢN) */}
                        <button
                          type="button"
                          disabled={isSavingThis}
                          onClick={() => handleSingleClickStatus(idx, 'Vắng không phép')}
                          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer border-2 flex items-center justify-center gap-1.5 shadow-xs ${
                            rec.status === 'Vắng không phép'
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

        {/* Modal Sửa Số Buổi Còn Lại Nhanh */}
        {editingStudent && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Chỉnh số buổi còn lại</h3>
                <button 
                  onClick={() => setEditingStudent(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateStudentSessions} className="mt-4 space-y-4">
                <div>
                  <div className="text-xs text-slate-500 font-semibold mb-1">
                    Học viên: <strong className="text-slate-900">{editingStudent.name}</strong> ({editingStudent.id})
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setEditRemainingInput(prev => Math.max(0, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 text-base"
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editRemainingInput}
                      onChange={e => setEditRemainingInput(parseInt(e.target.value) || 0)}
                      className="flex-1 p-2 border-2 border-slate-200 rounded-xl font-mono font-black text-center text-lg focus:outline-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setEditRemainingInput(prev => prev + 1)}
                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 text-base"
                    >
                      +1
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                  >
                    Lưu số buổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

export default function AdminAttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Đang nạp sổ điểm danh...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
