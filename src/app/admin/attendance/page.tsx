'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Modal } from '@/components/common/Modal';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { ScheduleSlot } from '@/types/schedule';
import { ClassEntity } from '@/types/classroom';
import { Student } from '@/types/student';
import { 
  Calendar, 
  BookOpen, 
  Clock, 
  Save, 
  CheckCircle2, 
  UserCheck, 
  AlertCircle, 
  Check, 
  RotateCw, 
  PlusCircle, 
  Search, 
  X,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ExtendedAttendanceRecord extends AttendanceRecord {
  studentName?: string;
  studentPhone?: string;
}

function AdminAttendanceContent() {
  // Bộ lọc
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-20');
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  
  // Dữ liệu học viên & điểm danh
  const [studentsMap, setStudentsMap] = useState<Map<string, Student>>(new Map());
  const [records, setRecords] = useState<ExtendedAttendanceRecord[]>([]);
  
  // Loading & Toast thông báo
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Điểm danh bù
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState<boolean>(false);
  const [makeupStudentId, setMakeupStudentId] = useState<string>('');
  const [makeupStudentSearch, setMakeupStudentSearch] = useState<string>('');
  const [makeupOriginalSlotId, setMakeupOriginalSlotId] = useState<string>('');
  const [makeupReason, setMakeupReason] = useState<string>('');
  const [makeupPastAbsences, setMakeupPastAbsences] = useState<AttendanceRecord[]>([]);
  const [loadingAbsences, setLoadingAbsences] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Tải danh sách tất cả lớp học & toàn bộ học viên
  useEffect(() => {
    async function initData() {
      try {
        const [clsRes, stRes] = await Promise.all([
          fetch('/api/classes'),
          fetch('/api/students?limit=1000')
        ]);
        const clsData = await clsRes.json();
        const stData = await stRes.json();

        if (clsData.classes) {
          setClasses(clsData.classes);
        }

        const map = new Map<string, Student>();
        if (stData.students) {
          stData.students.forEach((s: Student) => map.set(s.id, s));
        }
        setStudentsMap(map);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
        showToast('Không thể tải danh mục lớp hoặc học viên', 'error');
      }
    }
    initData();
  }, []);

  // 2. Nạp danh sách Ca học (`slots`) theo `date` và `classId`
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDate) return;
      setLoadingSlots(true);
      try {
        let url = `/api/schedule?date=${selectedDate}`;
        if (selectedClassId && selectedClassId !== 'ALL') {
          url += `&classId=${selectedClassId}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        const loadedSlots: ScheduleSlot[] = data.slots || [];
        setSlots(loadedSlots);

        // Tự động chọn ca đầu tiên khả dụng nếu có
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
        console.error('Lỗi khi tải danh sách ca học:', err);
        showToast('Lỗi khi tải ca học', 'error');
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [selectedDate, selectedClassId]);

  // 3. Nạp dữ liệu sổ điểm danh cho Ca học đang chọn
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
        const res = await fetch(`/api/attendance?slotId=${selectedSlotId}`);
        const data = await res.json();
        const existingRecords: AttendanceRecord[] = data.records || [];

        // Lấy thông tin lớp học của slot này để lấy studentIds chuẩn
        const clsRes = await fetch(`/api/classes?id=${slot.classId}`);
        const clsData = await clsRes.json();
        const targetClass: ClassEntity = clsData.class;
        const rosterStudentIds: string[] = targetClass?.studentIds || [];

        // Hợp nhất danh sách học viên trong lớp + các bản ghi điểm danh bù ngoài ca (nếu có)
        const allStudentIds = new Set<string>([...rosterStudentIds]);
        existingRecords.forEach(r => allStudentIds.add(r.studentId));

        const mergedRecords: ExtendedAttendanceRecord[] = Array.from(allStudentIds).map((stId, idx) => {
          const student = studentsMap.get(stId);
          const found = existingRecords.find(r => r.studentId === stId);

          if (found) {
            return {
              ...found,
              studentName: student?.name || `Học viên ${stId}`,
              studentPhone: student?.phone || '-',
            };
          }

          // Tạo record mới nháp nếu chưa được điểm danh
          return {
            id: `ATT_NEW_${selectedSlotId}_${stId}`,
            scheduleSlotId: selectedSlotId,
            classId: slot.classId,
            studentId: stId,
            date: slot.date,
            status: 'Có mặt',
            checkinTime: slot.startTime ? `${slot.startTime}:00` : '08:00:00',
            updatedBy: 'ADMIN001',
            updatedAt: new Date().toISOString(),
            method: 'MANUAL',
            studentName: student?.name || `Học viên ${stId}`,
            studentPhone: student?.phone || '-',
          };
        });

        setRecords(mergedRecords);
      } catch (err) {
        console.error('Lỗi khi tải chi tiết điểm danh:', err);
        showToast('Lỗi khi nạp danh sách điểm danh của ca học', 'error');
      } finally {
        setLoadingAttendance(false);
      }
    }

    loadSlotAttendance(currentSlot);
  }, [selectedSlotId, slots, studentsMap]);

  // Thống kê nhanh số lượng 5 trạng thái
  const counts = useMemo(() => {
    let present = 0;
    let late = 0;
    let excused = 0;
    let unexcused = 0;
    let makeup = 0;

    records.forEach(r => {
      if (r.status === 'Có mặt') present++;
      else if (r.status === 'Đi muộn') late++;
      else if (r.status === 'Vắng có phép') excused++;
      else if (r.status === 'Vắng không phép') unexcused++;
      else if (r.status === 'Điểm danh bù') makeup++;
    });

    return { present, late, excused, unexcused, makeup, total: records.length };
  }, [records]);

  // Handler đổi trạng thái cho từng học viên
  const handleStatusChange = (index: number, newStatus: AttendanceStatus) => {
    const updated = [...records];
    const rec = updated[index];
    rec.status = newStatus;

    const currentSlot = slots.find(s => s.id === selectedSlotId);
    const now = new Date();
    const nowTimeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss

    if (newStatus === 'Có mặt') {
      if (!rec.checkinTime) {
        rec.checkinTime = currentSlot?.startTime ? `${currentSlot.startTime}:00` : nowTimeStr;
      }
    } else if (newStatus === 'Đi muộn') {
      rec.checkinTime = nowTimeStr;
    } else if (newStatus === 'Điểm danh bù') {
      if (!rec.checkinTime) {
        rec.checkinTime = nowTimeStr;
      }
      // Mở modal nếu chưa có thông tin bù
      if (!rec.originalSlotId) {
        openMakeupModalForStudent(rec.studentId);
      }
    } else {
      // Vắng có phép hoặc Vắng không phép -> xóa checkinTime
      rec.checkinTime = undefined;
    }

    setRecords(updated);
  };

  // Handler cập nhật giờ Check-in thủ công
  const handleCheckinTimeChange = (index: number, val: string) => {
    const updated = [...records];
    updated[index].checkinTime = val;
    setRecords(updated);
  };

  // Handler lấy giờ hiện tại
  const handleSetCurrentTime = (index: number) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const updated = [...records];
    updated[index].checkinTime = timeStr;
    if (updated[index].status === 'Vắng có phép' || updated[index].status === 'Vắng không phép') {
      updated[index].status = 'Có mặt';
    }
    setRecords(updated);
  };

  // Handler cập nhật ghi chú
  const handleNoteChange = (index: number, note: string) => {
    const updated = [...records];
    updated[index].note = note;
    setRecords(updated);
  };

  // Đánh dấu tất cả Có mặt
  const handleMarkAllPresent = () => {
    const currentSlot = slots.find(s => s.id === selectedSlotId);
    const defaultTime = currentSlot?.startTime ? `${currentSlot.startTime}:00` : '08:00:00';
    const updated = records.map(r => ({
      ...r,
      status: 'Có mặt' as AttendanceStatus,
      checkinTime: r.checkinTime || defaultTime,
    }));
    setRecords(updated);
    showToast(`Đã đánh dấu ${updated.length} học viên "Có mặt"`);
  };

  // Lưu sổ điểm danh (POST batch)
  const handleSaveAttendance = async () => {
    if (!selectedSlotId || records.length === 0) {
      showToast('Không có dữ liệu điểm danh để lưu', 'error');
      return;
    }

    setSaving(true);
    try {
      // Chuẩn hóa records trước khi gửi
      const cleanedRecords: AttendanceRecord[] = records.map(r => ({
        id: r.id.startsWith('ATT_NEW_') ? `ATT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` : r.id,
        scheduleSlotId: r.scheduleSlotId,
        classId: r.classId,
        studentId: r.studentId,
        date: r.date,
        status: r.status,
        checkinTime: r.checkinTime || undefined,
        note: r.note || undefined,
        originalSlotId: r.originalSlotId || undefined,
        makeupReason: r.makeupReason || undefined,
        method: r.method || 'MANUAL',
        updatedBy: 'ADMIN001',
        updatedAt: new Date().toISOString(),
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: cleanedRecords,
          slotId: selectedSlotId,
          updatedBy: 'ADMIN001',
          updaterName: 'Quản trị viên',
          userRole: 'ADMIN'
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast(`Đã lưu thành công sổ điểm danh (${cleanedRecords.length} học viên)!`);
        // Đồng bộ lại id bản ghi
        setRecords(prev => prev.map((item, idx) => ({
          ...item,
          id: cleanedRecords[idx].id
        })));
      } else {
        throw new Error(resData.error || 'Lưu thất bại');
      }
    } catch (err: any) {
      console.error('Lỗi lưu sổ điểm danh:', err);
      showToast(err.message || 'Lỗi khi lưu sổ điểm danh', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Mở Modal Điểm danh bù cho 1 học sinh cụ thể
  const openMakeupModalForStudent = async (studentId: string) => {
    setMakeupStudentId(studentId);
    setMakeupOriginalSlotId('');
    setMakeupReason('');
    setIsMakeupModalOpen(true);

    if (studentId) {
      setLoadingAbsences(true);
      try {
        const res = await fetch(`/api/attendance?studentId=${studentId}`);
        const data = await res.json();
        const allAtt: AttendanceRecord[] = data.records || [];
        // Lọc các ca vắng
        const absences = allAtt.filter(a => a.status === 'Vắng có phép' || a.status === 'Vắng không phép');
        setMakeupPastAbsences(absences);
        if (absences.length > 0) {
          setMakeupOriginalSlotId(absences[0].scheduleSlotId);
        }
      } catch (e) {
        console.error('Lỗi khi nạp lịch sử vắng:', e);
      } finally {
        setLoadingAbsences(false);
      }
    }
  };

  // Khi chọn học viên trong Modal
  const handleSelectStudentInModal = async (sId: string) => {
    setMakeupStudentId(sId);
    setMakeupOriginalSlotId('');
    if (!sId) {
      setMakeupPastAbsences([]);
      return;
    }

    setLoadingAbsences(true);
    try {
      const res = await fetch(`/api/attendance?studentId=${sId}`);
      const data = await res.json();
      const allAtt: AttendanceRecord[] = data.records || [];
      const absences = allAtt.filter(a => a.status === 'Vắng có phép' || a.status === 'Vắng không phép');
      setMakeupPastAbsences(absences);
      if (absences.length > 0) {
        setMakeupOriginalSlotId(absences[0].scheduleSlotId);
      }
    } catch (e) {
      console.error('Lỗi nạp lịch sử vắng:', e);
    } finally {
      setLoadingAbsences(false);
    }
  };

  // Xác nhận lưu Điểm danh bù trong Modal
  const handleConfirmMakeup = () => {
    if (!makeupStudentId) {
      showToast('Vui lòng chọn học viên cần điểm danh bù', 'error');
      return;
    }

    const currentSlot = slots.find(s => s.id === selectedSlotId);
    if (!currentSlot) {
      showToast('Không xác định được ca học hiện tại', 'error');
      return;
    }

    const student = studentsMap.get(makeupStudentId);
    const existingIndex = records.findIndex(r => r.studentId === makeupStudentId);
    const nowTimeStr = new Date().toTimeString().split(' ')[0];

    if (existingIndex >= 0) {
      // Cập nhật học viên đã có trong ca
      const updated = [...records];
      updated[existingIndex] = {
        ...updated[existingIndex],
        status: 'Điểm danh bù',
        originalSlotId: makeupOriginalSlotId || 'SCH_MANUAL_MAKEUP',
        makeupReason: makeupReason || 'Học bù ca vắng',
        checkinTime: updated[existingIndex].checkinTime || nowTimeStr,
        method: 'MANUAL',
      };
      setRecords(updated);
    } else {
      // Thêm học viên ngoài ca vào danh sách ca hiện tại
      const newMakeupRecord: ExtendedAttendanceRecord = {
        id: `ATT_NEW_${selectedSlotId}_${makeupStudentId}`,
        scheduleSlotId: selectedSlotId,
        classId: currentSlot.classId,
        studentId: makeupStudentId,
        date: currentSlot.date,
        status: 'Điểm danh bù',
        originalSlotId: makeupOriginalSlotId || 'SCH_MANUAL_MAKEUP',
        makeupReason: makeupReason || 'Học bù ca vắng ngoài ca',
        checkinTime: nowTimeStr,
        updatedBy: 'ADMIN001',
        updatedAt: new Date().toISOString(),
        method: 'MANUAL',
        studentName: student?.name || `Học viên ${makeupStudentId}`,
        studentPhone: student?.phone || '-',
      };
      setRecords([newMakeupRecord, ...records]);
    }

    setIsMakeupModalOpen(false);
    showToast(`Đã thiết lập Điểm danh bù cho học viên ${student?.name || makeupStudentId}`);
  };

  const currentSlot = slots.find(s => s.id === selectedSlotId);

  // Danh sách học viên gợi ý tìm kiếm trong Modal
  const filteredStudentsForModal = useMemo(() => {
    const list = Array.from(studentsMap.values());
    if (!makeupStudentSearch) return list.slice(0, 30);
    const q = makeupStudentSearch.toLowerCase();
    return list.filter(s => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 30);
  }, [studentsMap, makeupStudentSearch]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Sổ Điểm Danh Toàn Trường" 
        subtitle="Quản lý chuyên cần, giờ check-in và điểm danh bù cho tất cả các lớp học" 
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className={`p-4 rounded-xl shadow-md border flex items-center gap-3 transition-all animate-in fade-in duration-200 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-rose-600" />}
            <span className="text-sm font-semibold">{toastMessage.text}</span>
          </div>
        )}

        {/* Khối Bộ lọc Điều hành (Control Filter Bar) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Calendar size={15} /> Bộ Lọc Điều Hành Ca Học
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Chọn ngày học */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày học:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-indigo-600 transition shadow-2xs"
              />
            </div>

            {/* 2. Chọn lớp học */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lớp học:</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-indigo-600 transition shadow-2xs"
              >
                <option value="ALL">-- Tất cả các lớp --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Chọn ca học */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ca học cụ thể:</label>
              <select
                value={selectedSlotId}
                onChange={e => setSelectedSlotId(e.target.value)}
                disabled={loadingSlots || slots.length === 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:outline-indigo-600 transition shadow-2xs disabled:opacity-50"
              >
                {slots.length === 0 ? (
                  <option value="">{loadingSlots ? 'Đang nạp ca...' : 'Không có ca học nào trong ngày này'}</option>
                ) : (
                  slots.map(s => (
                    <option key={s.id} value={s.id}>
                      [Ca {s.shiftId}] {s.startTime} - {s.endTime} | {s.subject} ({s.classId}) | GV: {s.teacherId}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {currentSlot && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  Mã ca: {currentSlot.id}
                </span>
                <span>Phòng học: <strong className="text-slate-800">{currentSlot.roomId}</strong></span>
                <span>Môn học: <strong className="text-slate-800">{currentSlot.subject}</strong></span>
                <span>Thời gian: <strong className="text-slate-800">{currentSlot.startTime} - {currentSlot.endTime}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Thanh Thống kê Nhanh (Summary Metrics Bar) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng học viên</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{counts.total}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Có mặt</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{counts.present}</div>
          </div>
          <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Đi muộn</div>
            <div className="text-2xl font-black text-amber-800 mt-1">{counts.late}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200/80 p-3.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Vắng có phép</div>
            <div className="text-2xl font-black text-blue-800 mt-1">{counts.excused}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200/80 p-3.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Vắng không phép</div>
            <div className="text-2xl font-black text-rose-800 mt-1">{counts.unexcused}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200/80 p-3.5 rounded-xl shadow-2xs">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Điểm danh bù</div>
            <div className="text-2xl font-black text-purple-800 mt-1">{counts.makeup}</div>
          </div>
        </div>

        {/* Thanh Công cụ Tiện ích (Actions Bar) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleMarkAllPresent}
              disabled={records.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50"
            >
              <Check size={16} /> Đánh dấu tất cả Có mặt
            </button>
            <button
              onClick={() => openMakeupModalForStudent('')}
              disabled={!selectedSlotId}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50"
            >
              <PlusCircle size={16} /> + Điểm danh bù
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAttendance}
              disabled={saving || records.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RotateCw size={18} className="animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save size={18} /> Lưu Sổ Điểm Danh
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bảng Dữ liệu Điểm danh (Attendance Table) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserCheck size={18} className="text-indigo-600" />
                Danh Sách Học Viên Trong Ca Học
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentSlot ? `Ca ${currentSlot.shiftId} (${currentSlot.startTime} - ${currentSlot.endTime}) | ${currentSlot.subject} | Lớp ${currentSlot.classId}` : 'Chưa chọn ca học'}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-200/70 text-slate-700 rounded-full">
              {records.length} Học viên
            </span>
          </div>

          {loadingAttendance ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <RotateCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
              Đang tải dữ liệu điểm danh...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              {selectedSlotId ? 'Không có học viên nào trong ca học này.' : 'Vui lòng chọn ca học để hiển thị sổ điểm danh.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">STT</th>
                    <th className="px-4 py-3.5 w-44">Mã HV & Họ Tên</th>
                    <th className="px-4 py-3.5 w-28">Số điện thoại</th>
                    <th className="px-4 py-3.5">Trạng thái điểm danh (5 tùy chọn)</th>
                    <th className="px-4 py-3.5 w-40">Giờ vào lớp (Check-in)</th>
                    <th className="px-4 py-3.5 w-56">Thông tin bù / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec, idx) => {
                    return (
                      <tr key={rec.id || idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 text-slate-400 font-semibold text-center">{idx + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs ring-1 ring-slate-200 flex-shrink-0">
                              {rec.studentName ? rec.studentName.charAt(0) : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-[13px]">{rec.studentName}</div>
                              <div className="font-mono text-[11px] font-semibold text-indigo-600">{rec.studentId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">{rec.studentPhone}</td>
                        <td className="px-4 py-3.5">
                          {/* 5 Nút Trực Quan */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(['Có mặt', 'Đi muộn', 'Vắng có phép', 'Vắng không phép', 'Điểm danh bù'] as AttendanceStatus[]).map((statusOpt) => {
                              const isCurrent = rec.status === statusOpt;
                              let activeClass = '';
                              if (isCurrent) {
                                switch (statusOpt) {
                                  case 'Có mặt':
                                    activeClass = 'bg-emerald-600 text-white shadow-xs font-bold';
                                    break;
                                  case 'Đi muộn':
                                    activeClass = 'bg-amber-500 text-white shadow-xs font-bold';
                                    break;
                                  case 'Vắng có phép':
                                    activeClass = 'bg-blue-600 text-white shadow-xs font-bold';
                                    break;
                                  case 'Vắng không phép':
                                    activeClass = 'bg-rose-600 text-white shadow-xs font-bold';
                                    break;
                                  case 'Điểm danh bù':
                                    activeClass = 'bg-purple-600 text-white shadow-xs font-bold';
                                    break;
                                }
                              } else {
                                activeClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium';
                              }

                              return (
                                <button
                                  key={statusOpt}
                                  type="button"
                                  onClick={() => handleStatusChange(idx, statusOpt)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs transition ${activeClass}`}
                                >
                                  {statusOpt}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={rec.checkinTime || ''}
                              onChange={e => handleCheckinTimeChange(idx, e.target.value)}
                              placeholder="HH:mm:ss"
                              className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-slate-700 focus:outline-indigo-600"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetCurrentTime(idx)}
                              title="Lấy giờ hiện tại"
                              className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                            >
                              <Clock size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 space-y-1">
                          {rec.status === 'Điểm danh bù' && (
                            <div className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 font-semibold">
                              <Info size={12} /> Ca gốc: {rec.originalSlotId || 'Chưa gán'}
                              {rec.makeupReason && ` - ${rec.makeupReason}`}
                            </div>
                          )}
                          <input
                            type="text"
                            value={rec.note || ''}
                            onChange={e => handleNoteChange(idx, e.target.value)}
                            placeholder="Ghi chú thêm..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Điểm danh bù (Makeup Attendance Modal dùng createPortal) */}
      <Modal isOpen={isMakeupModalOpen} onClose={() => setIsMakeupModalOpen(false)}>
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlusCircle className="text-purple-600" size={20} />
              <h3 className="font-bold text-slate-900 text-base">Ghi Nhận Điểm Danh Bù</h3>
            </div>
            <button 
              onClick={() => setIsMakeupModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-purple-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* 1. Chọn học viên */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">1. Chọn học viên:</label>
              <input
                type="text"
                value={makeupStudentSearch}
                onChange={e => setMakeupStudentSearch(e.target.value)}
                placeholder="Tìm mã hoặc họ tên học viên..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs mb-2 focus:outline-purple-600"
              />
              <select
                value={makeupStudentId}
                onChange={e => handleSelectStudentInModal(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-purple-600"
              >
                <option value="">-- Chọn học viên --</option>
                {filteredStudentsForModal.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name} ({s.phone})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Chọn ca học gốc bị vắng */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Ca học gốc bị vắng (cần bù):
              </label>
              {loadingAbsences ? (
                <div className="text-xs text-slate-400 py-2">Đang tải lịch sử vắng...</div>
              ) : makeupPastAbsences.length > 0 ? (
                <select
                  value={makeupOriginalSlotId}
                  onChange={e => setMakeupOriginalSlotId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-purple-600"
                >
                  <option value="">-- Chọn ca học đã vắng --</option>
                  {makeupPastAbsences.map(a => (
                    <option key={a.id} value={a.scheduleSlotId}>
                      [{a.date}] Ca {a.scheduleSlotId} - {a.classId} ({a.status})
                    </option>
                  ))}
                </select>
              ) : (
                <div>
                  <input
                    type="text"
                    value={makeupOriginalSlotId}
                    onChange={e => setMakeupOriginalSlotId(e.target.value)}
                    placeholder="Nhập mã ca gốc (vd: SCH0012) hoặc để trống..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-purple-600"
                  />
                  <p className="text-[11px] text-amber-600 mt-1">
                    * Học viên chưa có lịch sử vắng tự động, bạn có thể tự nhập mã ca gốc.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Lý do học bù */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">3. Lý do học bù:</label>
              <textarea
                value={makeupReason}
                onChange={e => setMakeupReason(e.target.value)}
                placeholder="VD: Bị ốm có đơn phép, Trùng lịch thi đại học, Đổi ca sang lớp song song..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-purple-600"
              />
            </div>

            <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-800 border border-purple-100 flex items-start gap-2">
              <Info size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                Ca hiện tại tiếp nhận học bù: <strong>{currentSlot?.id}</strong> (Lớp {currentSlot?.classId} ngày {currentSlot?.date}).
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              onClick={() => setIsMakeupModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmMakeup}
              disabled={!makeupStudentId}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              Xác nhận Điểm danh bù
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminAttendancePage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải trang Sổ Điểm danh Toàn trường...</div>}>
        <AdminAttendanceContent />
      </Suspense>
    </RoleGuard>
  );
}
