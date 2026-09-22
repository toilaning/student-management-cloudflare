'use client';

import { getTodayDateStr } from '@/utils/date';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { ScheduleSlot, TIME_SHIFTS } from '@/types/schedule';
import { Teacher } from '@/types/teacher';
import { Classroom, ClassEntity } from '@/types/classroom';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, Plus, UserCheck, Edit3, Trash2, X, Check, ExternalLink, Headphones, RefreshCw, Sparkles, Zap, CalendarRange } from 'lucide-react';

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<typeof TIME_SHIFTS>(TIME_SHIFTS);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCreateShiftForm, setShowCreateShiftForm] = useState(false);
  const [newShiftInput, setNewShiftInput] = useState({ name: '', startTime: '07:00', endTime: '09:00' });
  const [editingShift, setEditingShift] = useState<{ id: number; name: string; startTime: string; endTime: string } | null>(null);
  const [syncFutureShiftsOption, setSyncFutureShiftsOption] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal Thao Tác Lịch Hôm Nay / Theo Ngày
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyAction, setDailyAction] = useState<'RESCHEDULE_DAY' | 'SHIFT_MIGRATION' | 'CANCEL_DAY'>('RESCHEDULE_DAY');
  const [dailyTargetDate, setDailyTargetDate] = useState('');
  const [dailyFromShift, setDailyFromShift] = useState(1);
  const [dailyToShift, setDailyToShift] = useState(2);
  const [dailySubmitting, setDailySubmitting] = useState(false);

  // Modal Đổi Ca/Lịch Từ Nay Về Sau
  const [showFutureModal, setShowFutureModal] = useState(false);
  const [futureClassId, setFutureClassId] = useState('');
  const [futureFromDate, setFutureFromDate] = useState(selectedDate);
  const [futureShiftId, setFutureShiftId] = useState<string>('');
  const [futureRoomId, setFutureRoomId] = useState('');
  const [futureTeacherId, setFutureTeacherId] = useState('');
  const [futureSubmitting, setFutureSubmitting] = useState(false);

  // Modal Sinh Lịch Hàng Loạt Dài Hạn
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('all');
  const [bulkStartDate, setBulkStartDate] = useState(selectedDate);
  const [bulkEndDate, setBulkEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    summary: { totalAttempted: number; createdCount: number; updatedCount: number; skippedCount: number; conflictCount: number };
    message?: string;
  } | null>(null);

  // Modal Thêm ca học
  const [showAddModal, setShowAddModal] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [newSlotData, setNewSlotData] = useState({
    classId: 'CLS01',
    teacherId: 'GV001',
    roomId: 'P.101',
    date: getTodayDateStr(),
    shiftId: 1,
    subject: 'Toán Cao Cấp',
    topic: 'Buổi học định kỳ',
    meetingLink: 'https://discord.com/channels/edu-center/room-general',
  });

  // Modal Sửa Nhanh ca học
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [editFormData, setEditFormData] = useState({
    classId: '',
    teacherId: '',
    roomId: '',
    date: '',
    shiftId: 1,
    subject: '',
    topic: '',
    meetingLink: '',
    status: 'Đã lên lịch' as ScheduleSlot['status'],
  });

  const loadData = async (date: string) => {
    setLoading(true);
    try {
      const [slotRes, tcRes, clsRes, shiftRes] = await Promise.all([
        fetch(`/api/schedule?date=${date}`),
        fetch('/api/teachers'),
        fetch('/api/classes'),
        fetch('/api/shifts'),
      ]);
      const slotData = await slotRes.json();
      const tcData = await tcRes.json();
      const clsData = await clsRes.json();

      setSlots(slotData.slots || []);
      setTeachers(tcData.teachers || []);
      setClasses(clsData.classes || []);
      if (clsData.classes && clsData.classes.length > 0 && !futureClassId) {
        setFutureClassId(clsData.classes[0].id);
      }
      const shiftData = await shiftRes.json();
      if (shiftData.shifts) setShifts(shiftData.shifts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const teacherMap: Record<string, string> = {};
  teachers.forEach(t => {
    teacherMap[t.id] = t.name;
  });

  const handleOpenEdit = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setConflictError(null);
    setEditFormData({
      classId: slot.classId,
      teacherId: slot.teacherId,
      roomId: slot.roomId,
      date: slot.date,
      shiftId: slot.shiftId,
      subject: slot.subject,
      topic: slot.topic || '',
      meetingLink: slot.meetingLink || 'https://discord.com/channels/edu-center/room-general',
      status: slot.status,
    });
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkSubmitting(true);
    setBulkResult(null);

    try {
      const res = await fetch('/api/schedule/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: bulkClassId === 'all' ? ['all'] : [bulkClassId],
          startDate: bulkStartDate,
          endDate: bulkEndDate,
          overwriteExisting: bulkOverwrite,
          actorId: 'ADMIN001',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkResult(data);
        setActionMessage(data.message || 'Sinh lịch thành công!');
        await loadData(selectedDate);
      } else {
        alert(data.error || 'Sinh lịch hàng loạt thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi mạng khi sinh lịch');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleAddMonthsToBulkEnd = (months: number) => {
    const base = bulkStartDate ? new Date(bulkStartDate) : new Date();
    base.setMonth(base.getMonth() + months);
    setBulkEndDate(base.toISOString().split('T')[0]);
  };

  // Thao tác hàng loạt theo ngày
  const handleDailyActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDailySubmitting(true);
    try {
      const body: any = {
        currentDate: selectedDate,
        action: dailyAction,
      };
      if (dailyAction === 'RESCHEDULE_DAY') {
        if (!dailyTargetDate) {
          alert('Vui lòng chọn ngày chuyển đến!');
          setDailySubmitting(false);
          return;
        }
        body.targetDate = dailyTargetDate;
      } else if (dailyAction === 'SHIFT_MIGRATION') {
        body.fromShiftId = Number(dailyFromShift);
        body.toShiftId = Number(dailyToShift);
      } else if (dailyAction === 'CANCEL_DAY') {
        body.cancelStatus = 'Đã hủy';
      }

      const res = await fetch('/api/schedule/bulk-daily-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || 'Thực hiện thao tác thành công!');
        setShowDailyModal(false);
        await loadData(selectedDate);
      } else {
        alert(data.error || 'Thực hiện thao tác thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    } finally {
      setDailySubmitting(false);
    }
  };

  // Thay đổi ca/lịch từ nay về sau
  const handleFutureUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!futureClassId) {
      alert('Vui lòng chọn lớp học');
      return;
    }
    setFutureSubmitting(true);
    try {
      const body: any = {
        classId: futureClassId,
        fromDate: futureFromDate,
      };
      if (futureShiftId) body.targetShiftId = Number(futureShiftId);
      if (futureRoomId) body.targetRoomId = futureRoomId;
      if (futureTeacherId) body.targetTeacherId = futureTeacherId;

      const res = await fetch('/api/schedule/bulk-update-future', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || `Đã cập nhật ${data.updatedCount} ca học tương lai thành công!`);
        setShowFutureModal(false);
        await loadData(selectedDate);
      } else {
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    } finally {
      setFutureSubmitting(false);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftInput.startTime || !newShiftInput.endTime) {
      alert('Vui lòng điền đủ giờ bắt đầu và kết thúc');
      return;
    }

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShiftInput),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Đã thêm ca học mới: ' + data.shift.name);
        setShifts(prev => [...prev, data.shift]);
        setShowCreateShiftForm(false);
        setNewShiftInput({ name: '', startTime: '07:00', endTime: '09:00' });
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error || 'Thêm ca học thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    }
  };

  const handleDeleteShift = async (shiftId: number, shiftName: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa "' + shiftName + '" không?')) return;

    try {
      const res = await fetch('/api/shifts?id=' + shiftId, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Đã xóa ' + shiftName + ' thành công');
        setShifts(prev => prev.filter(s => s.id !== shiftId));
        if (editingShift?.id === shiftId) setEditingShift(null);
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error || 'Xóa ca học thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi mạng');
    }
  };

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;

    try {
      // Sử dụng PUT hoặc POST bulkShifts hỗ trợ syncFutureSlots
      const updatedShifts = shifts.map(s => s.id === editingShift.id ? { ...s, ...editingShift } : s);
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulkShifts: updatedShifts,
          syncFutureSlots: syncFutureShiftsOption,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Cập nhật khung giờ ${editingShift.name} thành công! ${syncFutureShiftsOption ? `(Đã đồng bộ ${data.syncedSlotsCount || 0} ca học tương lai)` : ''}`);
        setShifts(data.shifts || updatedShifts);
        setEditingShift(null);
        await loadData(selectedDate);
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi mạng');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    setConflictError(null);
    const shift = shifts.find(s => s.id === Number(editFormData.shiftId)) || TIME_SHIFTS[0];

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingSlot,
          ...editFormData,
          shiftId: Number(editFormData.shiftId),
          startTime: shift.startTime,
          endTime: shift.endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setConflictError(data.error || 'Có xung đột lịch học');
      } else {
        setActionMessage(`Đã cập nhật ca học ${editingSlot.id} thành công!`);
        setEditingSlot(null);
        await loadData(selectedDate);
      }
    } catch (err: any) {
      setConflictError(err.message);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn hủy ca học ${slotId}?`)) return;
    try {
      const res = await fetch(`/api/schedule?id=${slotId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || `Đã hủy ca học ${slotId}`);
        await loadData(selectedDate);
      } else {
        alert(data.error || 'Hủy ca học thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    const shift = shifts.find(s => s.id === Number(newSlotData.shiftId)) || TIME_SHIFTS[0];

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSlotData,
          shiftId: Number(newSlotData.shiftId),
          startTime: shift.startTime,
          endTime: shift.endTime,
          status: 'Đã lên lịch',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setConflictError(data.error || 'Có lỗi xảy ra khi tạo lịch học');
      } else {
        setShowAddModal(false);
        setActionMessage('Đã thêm ca học mới vào thời khóa biểu!');
        loadData(selectedDate);
      }
    } catch (err: any) {
      setConflictError(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Thời khóa biểu & Lịch học Trung tâm" 
        subtitle="Quản lý và chỉnh sửa nhanh ca học với Conflict Engine phát hiện trùng phòng/GV" 
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {actionMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-emerald-600" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold hover:underline">
              Đóng
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-1 hover:bg-white rounded text-slate-600 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                <Calendar size={16} className="text-indigo-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => e.target.value && setSelectedDate(e.target.value)}
                  className="font-semibold text-xs sm:text-sm text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateStr())}
                className="px-2.5 py-1 bg-white hover:bg-slate-200 text-indigo-700 rounded text-xs font-bold transition shadow-2xs border border-slate-200"
                title="Quay về ngày hôm nay"
              >
                Hôm nay
              </button>
              <button 
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-1 hover:bg-white rounded text-slate-600 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-500 hidden sm:block">
              * Bấm icon <Edit3 size={13} className="inline text-indigo-600" /> trên từng ca học để đổi nhanh Giáo viên, Phòng học, Ca học hoặc Hủy ca.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Thao Tác Lịch Hôm Nay / Theo Ngày */}
            <button
              onClick={() => {
                setShowDailyModal(true);
                setDailyTargetDate(selectedDate);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition whitespace-nowrap cursor-pointer"
            >
              <Zap size={16} className="text-amber-100" /> ⚡ Thao tác Lịch Hôm Nay / Theo Ngày
            </button>

            {/* Nút Đổi Ca/Lịch Từ Nay Về Sau */}
            <button
              onClick={() => {
                setShowFutureModal(true);
                setFutureFromDate(selectedDate);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition whitespace-nowrap cursor-pointer"
            >
              <CalendarRange size={16} className="text-blue-100" /> 📅 Đổi Ca/Lịch Từ Nay Về Sau
            </button>

            <button
              onClick={() => {
                setShowBulkModal(true);
                setBulkResult(null);
                setBulkStartDate(selectedDate);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition whitespace-nowrap cursor-pointer"
            >
              <RefreshCw size={16} className="text-emerald-100" /> Sinh Lịch Định Kỳ
            </button>

            <button
              onClick={() => setShowShiftModal(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs transition whitespace-nowrap"
            >
              <Clock size={16} className="text-amber-400" /> Cấu hình Khung giờ Ca học
            </button>

            <button
              onClick={() => {
                setNewSlotData(prev => ({ ...prev, date: selectedDate }));
                setConflictError(null);
                setShowAddModal(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs transition whitespace-nowrap"
            >
              <Plus size={16} /> Thêm ca học mới
            </button>
          </div>
        </div>

        {/* Schedule Grid by Time Shifts */}
        <div className="space-y-4">
          {shifts.map(shift => {
            const shiftSlots = slots.filter(s => s.shiftId === shift.id && s.status !== 'Đã hủy');
            return (
              <div key={shift.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span className="font-bold text-sm text-slate-800 whitespace-nowrap">{shift.name} ({shift.startTime} - {shift.endTime})</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {shiftSlots.length} lớp đang học
                  </span>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shiftSlots.length > 0 ? (
                    shiftSlots.map(slot => (
                      <div key={slot.id} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition bg-gradient-to-br from-white to-slate-50 space-y-2.5 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {slot.classId} • {slot.id}
                              </span>
                              <h3 className="font-bold text-slate-800 text-sm mt-1">{slot.subject}</h3>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                                slot.status === 'Đã hoàn thành' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {slot.status}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1"><Headphones size={13} className="text-indigo-600" /> Link Room Discord:</span>
                              {slot.meetingLink ? (
                                <a 
                                  href={slot.meetingLink} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="font-bold text-emerald-600 hover:text-emerald-700 underline text-xs inline-flex items-center gap-1 whitespace-nowrap truncate max-w-[140px]"
                                >
                                  Vào lớp Online <ExternalLink size={11} className="shrink-0" />
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Chưa gắn link</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Phòng học:</span>
                              <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded font-mono whitespace-nowrap">{slot.roomId}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <UserCheck size={13} className="text-slate-400" /> Giáo viên:
                              </span>
                              <div className="text-right truncate max-w-[160px]">
                                <span className="font-bold text-indigo-700">
                                  {teacherMap[slot.teacherId] || slot.teacherId}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono ml-1 whitespace-nowrap">
                                  ({slot.teacherId})
                                </span>
                              </div>
                            </div>
                            {slot.topic && (
                              <p className="text-[11px] text-slate-500 italic mt-1 bg-white p-1.5 rounded border border-slate-100">
                                {slot.topic}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleOpenEdit(slot)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Edit3 size={13} /> Sửa nhanh ca học
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            title="Hủy ca học này"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 whitespace-nowrap"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400">
                      Không có lớp nào xếp lịch vào ca này trong ngày {selectedDate}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Thao tác Lịch Hôm Nay / Theo Ngày */}
        {showDailyModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-white">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Thao Tác Lịch Hàng Loạt Theo Ngày</h3>
                    <p className="text-xs text-slate-500">Áp dụng cho toàn bộ các ca học ngày: <strong className="text-amber-700">{selectedDate}</strong></p>
                  </div>
                </div>
                <button onClick={() => setShowDailyModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleDailyActionSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
                <div>
                  <label className="block font-bold text-slate-700 mb-2">Chọn Hành Động Hàng Loạt:</label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${dailyAction === 'RESCHEDULE_DAY' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="dailyAction"
                        checked={dailyAction === 'RESCHEDULE_DAY'}
                        onChange={() => setDailyAction('RESCHEDULE_DAY')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">Dời toàn bộ ca hôm nay sang ngày khác</span>
                        <span className="text-[11px] text-slate-500">Giữ nguyên ca học, dời tất cả các lớp của ngày sang một ngày mới</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${dailyAction === 'SHIFT_MIGRATION' ? 'border-amber-500 bg-amber-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="dailyAction"
                        checked={dailyAction === 'SHIFT_MIGRATION'}
                        onChange={() => setDailyAction('SHIFT_MIGRATION')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">Đổi ca hàng loạt trong ngày</span>
                        <span className="text-[11px] text-slate-500">Chuyển toàn bộ các lớp từ ca nguồn sang ca đích trong cùng ngày</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${dailyAction === 'CANCEL_DAY' ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="dailyAction"
                        checked={dailyAction === 'CANCEL_DAY'}
                        onChange={() => setDailyAction('CANCEL_DAY')}
                        className="mt-0.5 text-rose-600"
                      />
                      <div>
                        <span className="font-bold text-rose-800 block text-xs">Hủy / Hoãn tất cả các ca trong ngày</span>
                        <span className="text-[11px] text-slate-500">Đổi trạng thái toàn bộ ca học hôm nay thành "Đã hủy"</span>
                      </div>
                    </label>
                  </div>
                </div>

                {dailyAction === 'RESCHEDULE_DAY' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <label className="block font-bold text-slate-700">Chọn Ngày Dời Đến (Target Date) *</label>
                    <input
                      type="date"
                      required
                      value={dailyTargetDate}
                      onChange={e => setDailyTargetDate(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold"
                    />
                  </div>
                )}

                {dailyAction === 'SHIFT_MIGRATION' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Từ Ca (Nguồn) *</label>
                        <select
                          value={dailyFromShift}
                          onChange={e => setDailyFromShift(Number(e.target.value))}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold"
                        >
                          {shifts.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Chuyển sang Ca (Đích) *</label>
                        <select
                          value={dailyToShift}
                          onChange={e => setDailyToShift(Number(e.target.value))}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold"
                        >
                          {shifts.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {dailyAction === 'CANCEL_DAY' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                    <p className="font-semibold">⚠️ Cảnh báo:</p>
                    <p className="text-[11px] mt-0.5">Toàn bộ các ca học đang hoạt động trong ngày <strong>{selectedDate}</strong> sẽ chuyển sang trạng thái <strong>Đã hủy</strong>.</p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDailyModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={dailySubmitting}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {dailySubmitting ? 'Đang thực thi...' : 'Xác nhận thực hiện'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Đổi Ca/Lịch Từ Nay Về Sau */}
        {showFutureModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white">
                    <CalendarRange size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Đổi Ca / Lịch Học Từ Nay Về Sau</h3>
                    <p className="text-xs text-slate-500">Cập nhật tự động cho tất cả các buổi học tương lai của lớp</p>
                  </div>
                </div>
                <button onClick={() => setShowFutureModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleFutureUpdateSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chọn Lớp Học *</label>
                  <select
                    value={futureClassId}
                    onChange={e => setFutureClassId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-semibold text-xs"
                    required
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày Bắt Đầu Áp Dụng (fromDate) *</label>
                  <input
                    type="date"
                    required
                    value={futureFromDate}
                    onChange={e => setFutureFromDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Chỉ những ca học từ ngày này trở về sau mới được cập nhật thông tin mới.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ca Học Mới (tùy chọn)</label>
                    <select
                      value={futureShiftId}
                      onChange={e => setFutureShiftId(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                    >
                      <option value="">-- Giữ nguyên ca hiện tại --</option>
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phòng Học Mới (tùy chọn)</label>
                    <input
                      type="text"
                      placeholder="VD: P.202 (để trống giữ nguyên)"
                      value={futureRoomId}
                      onChange={e => setFutureRoomId(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giáo Viên Phụ Trách Mới (tùy chọn)</label>
                  <select
                    value={futureTeacherId}
                    onChange={e => setFutureTeacherId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                  >
                    <option value="">-- Giữ nguyên giáo viên hiện tại --</option>
                    {teachers.map(tc => (
                      <option key={tc.id} value={tc.id}>{tc.name} ({tc.id})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFutureModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={futureSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {futureSubmitting ? 'Đang cập nhật...' : 'Áp dụng cho tất cả các buổi tới'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Sửa Nhanh Ca Học */}
        {editingSlot && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Sửa Nhanh Thông Tin Ca Học</h3>
                  <p className="text-xs text-slate-500">Mã ca: <strong className="text-indigo-600">{editingSlot.id}</strong> • Lớp: <strong>{editingSlot.classId}</strong></p>
                </div>
                <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs overflow-y-auto">
                {conflictError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cảnh báo Conflict Engine:</p>
                      <p>{conflictError}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày học</label>
                    <input
                      type="date"
                      value={editFormData.date}
                      onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 focus:outline-indigo-600 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ca học</label>
                    <select
                      value={editFormData.shiftId}
                      onChange={e => setEditFormData({ ...editFormData, shiftId: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-lg p-2 focus:outline-indigo-600 text-xs bg-white"
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giáo viên phụ trách</label>
                  <select
                    value={editFormData.teacherId}
                    onChange={e => setEditFormData({ ...editFormData, teacherId: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:outline-indigo-600 text-xs bg-white"
                  >
                    {teachers.map(tc => (
                      <option key={tc.id} value={tc.id}>
                        {tc.id} - {tc.name} ({tc.specialty})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phòng học</label>
                    <input
                      type="text"
                      value={editFormData.roomId}
                      onChange={e => setEditFormData({ ...editFormData, roomId: e.target.value })}
                      placeholder="VD: P.101, Lab A"
                      className="w-full border border-slate-200 rounded-lg p-2 focus:outline-indigo-600 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Trạng thái ca học</label>
                    <select
                      value={editFormData.status}
                      onChange={e => setEditFormData({ ...editFormData, status: e.target.value as any })}
                      className="w-full border border-slate-200 rounded-lg p-2 focus:outline-indigo-600 text-xs bg-white"
                    >
                      <option value="Đã lên lịch">Đã lên lịch</option>
                      <option value="Đang diễn ra">Đang diễn ra</option>
                      <option value="Đã hoàn thành">Đã hoàn thành</option>
                      <option value="Đã hủy">Đã hủy</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên môn học</label>
                  <input
                    type="text"
                    value={editFormData.subject}
                    onChange={e => setEditFormData({ ...editFormData, subject: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:outline-indigo-600 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Link phòng học Discord / Room Link *</label>
                  <input
                    type="url"
                    value={editFormData.meetingLink}
                    onChange={e => setEditFormData({ ...editFormData, meetingLink: e.target.value })}
                    placeholder="https://discord.com/channels/edu-center/room-..."
                    className="w-full border border-slate-200 rounded-lg p-2 focus:outline-emerald-600 text-xs font-mono text-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nội dung bài học / Ghi chú</label>
                  <input
                    type="text"
                    value={editFormData.topic}
                    onChange={e => setEditFormData({ ...editFormData, topic: e.target.value })}
                    placeholder="VD: Kiểm tra giữa kỳ, bài tập nhóm..."
                    className="w-full border border-slate-200 rounded-lg p-2 focus:outline-indigo-600 text-xs"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Lưu cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Thêm ca học & Test Conflict Engine */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-base">Thêm ca học mới vào lịch</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
              </div>

              <form onSubmit={handleCreateSlot} className="p-6 space-y-4 text-xs overflow-y-auto">
                {conflictError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cảnh báo Conflict Engine:</p>
                      <p>{conflictError}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày học</label>
                    <input
                      type="date"
                      value={newSlotData.date}
                      onChange={e => setNewSlotData({ ...newSlotData, date: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ca học</label>
                    <select
                      value={newSlotData.shiftId}
                      onChange={e => setNewSlotData({ ...newSlotData, shiftId: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-indigo-600 bg-white"
                    >
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lớp học</label>
                    <select
                      value={newSlotData.classId}
                      onChange={e => {
                        const cid = e.target.value;
                        const c = classes.find(cl => cl.id === cid);
                        setNewSlotData({
                          ...newSlotData,
                          classId: cid,
                          teacherId: c?.teacherId || newSlotData.teacherId,
                          subject: c?.name || newSlotData.subject,
                          roomId: c?.roomId || newSlotData.roomId,
                        });
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-indigo-600 bg-white"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Giáo viên phụ trách</label>
                    <select
                      value={newSlotData.teacherId}
                      onChange={e => setNewSlotData({ ...newSlotData, teacherId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-indigo-600 bg-white"
                    >
                      {teachers.map(tc => (
                        <option key={tc.id} value={tc.id}>
                          {tc.id} - {tc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phòng học</label>
                    <input
                      type="text"
                      value={newSlotData.roomId}
                      onChange={e => setNewSlotData({ ...newSlotData, roomId: e.target.value })}
                      placeholder="VD: P.101"
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-indigo-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tên môn học</label>
                    <input
                      type="text"
                      value={newSlotData.subject}
                      onChange={e => setNewSlotData({ ...newSlotData, subject: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-indigo-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Link phòng học Discord / Room Link</label>
                  <input
                    type="url"
                    value={newSlotData.meetingLink}
                    onChange={e => setNewSlotData({ ...newSlotData, meetingLink: e.target.value })}
                    placeholder="https://discord.com/channels/edu-center/room-..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-emerald-600 font-mono text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chủ đề / Ghi chú</label>
                  <input
                    type="text"
                    value={newSlotData.topic}
                    onChange={e => setNewSlotData({ ...newSlotData, topic: e.target.value })}
                    placeholder="Chủ đề bài học..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-indigo-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Lưu lịch & Kiểm tra
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Cấu hình Khung giờ Ca học */}
        {showShiftModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Quản Lý & Cấu Hình Khung Giờ Ca Học</h3>
                    <p className="text-xs text-slate-400">Admin có thể tùy ý thêm ca mới, xóa bớt ca hoặc sửa giờ bắt đầu / kết thúc</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowShiftModal(false);
                    setEditingShift(null);
                    setShowCreateShiftForm(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Tùy chọn Đồng bộ Ca học Tương lai */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncFutureShiftsOption}
                      onChange={e => setSyncFutureShiftsOption(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-amber-900 text-xs">☑️ Tự động đồng bộ khung giờ mới vào tất cả các ca học từ nay về sau</span>
                      <p className="text-[11px] text-amber-700">Khi bạn sửa giờ bắt đầu/kết thúc của ca, toàn bộ ca học tương lai thuộc ca này sẽ tự động được cập nhật lại giờ mới.</p>
                    </div>
                  </label>
                </div>

                {/* Thanh thống kê & Nút thêm ca */}
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Hiện có:</span>
                    <strong className="text-indigo-600 font-bold ml-1.5 text-sm">{shifts.length} ca học đang hoạt động</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateShiftForm(!showCreateShiftForm);
                      setEditingShift(null);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Plus size={14} /> {showCreateShiftForm ? 'Đóng form tạo' : 'Thêm ca học mới'}
                  </button>
                </div>

                {/* Form Thêm Ca Học Mới */}
                {showCreateShiftForm && (
                  <form onSubmit={handleCreateShift} className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3 animate-in fade-in">
                    <div className="font-bold text-indigo-800 text-xs uppercase tracking-wider">Thêm Ca Học Mới Vào Hệ Thống:</div>
                    <div>
                      <label className="block font-semibold text-slate-700 text-xs mb-1">Tên ca (ví dụ: Ca 6, Ca Sáng, Ca VIP Tối, Ca Cuối Tuần...)</label>
                      <input
                        type="text"
                        placeholder="Để trống sẽ tự động đặt tên theo số thứ tự"
                        value={newShiftInput.name}
                        onChange={e => setNewShiftInput({ ...newShiftInput, name: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-semibold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 text-xs mb-1">Giờ bắt đầu *</label>
                        <input
                          type="time"
                          required
                          value={newShiftInput.startTime}
                          onChange={e => setNewShiftInput({ ...newShiftInput, startTime: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 text-xs mb-1">Giờ kết thúc *</label>
                        <input
                          type="time"
                          required
                          value={newShiftInput.endTime}
                          onChange={e => setNewShiftInput({ ...newShiftInput, endTime: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCreateShiftForm(false)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Tạo Ca Học
                      </button>
                    </div>
                  </form>
                )}

                {/* Danh Sách Các Ca Học */}
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {shifts.map(s => {
                    const isEditing = editingShift?.id === s.id;
                    return (
                      <div key={s.id} className="p-3.5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800">{s.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-semibold border border-indigo-100">
                              {s.startTime} - {s.endTime}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">Thời lượng: {s.durationHours || 2.0} giờ • ID: #{s.id}</span>
                        </div>

                        {isEditing ? (
                          <form onSubmit={handleUpdateShift} className="flex items-center gap-2 flex-wrap bg-white p-2 rounded-lg border border-indigo-200 shadow-2xs">
                            <input
                              type="text"
                              value={editingShift.name}
                              onChange={e => setEditingShift({ ...editingShift, name: e.target.value })}
                              placeholder="Tên ca"
                              className="w-28 px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                              required
                            />
                            <input
                              type="time"
                              value={editingShift.startTime}
                              onChange={e => setEditingShift({ ...editingShift, startTime: e.target.value })}
                              className="px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                              required
                            />
                            <span className="text-xs text-slate-400">-</span>
                            <input
                              type="time"
                              value={editingShift.endTime}
                              onChange={e => setEditingShift({ ...editingShift, endTime: e.target.value })}
                              className="px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                              required
                            />
                            <button
                              type="submit"
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingShift(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold"
                            >
                              Hủy
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingShift({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime });
                                setShowCreateShiftForm(false);
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-indigo-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Edit3 size={13} /> Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShift(s.id, s.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Xóa ca học này"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {shifts.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Hiện chưa có ca học nào. Bấm <strong>"Thêm ca học mới"</strong> ở trên để tạo.
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowShiftModal(false);
                    setEditingShift(null);
                    setShowCreateShiftForm(false);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Sinh Lịch Hàng Loạt Dài Hạn */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Sinh Lịch Tự Động Hàng Loạt</h3>
                    <p className="text-xs text-slate-500">Tự động tính thứ trong tuần, ca học và kiểm tra xung đột trùng phòng/GV</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBulkGenerate} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                {bulkResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                      <Check size={18} className="text-emerald-600" /> Kết quả sinh lịch hàng loạt:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="block text-[10px] text-slate-400">Tạo mới</span>
                        <strong className="text-emerald-600 text-base">{bulkResult.summary.createdCount}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="block text-[10px] text-slate-400">Cập nhật</span>
                        <strong className="text-blue-600 text-base">{bulkResult.summary.updatedCount}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="block text-[10px] text-slate-400">Bỏ qua</span>
                        <strong className="text-amber-600 text-base">{bulkResult.summary.skippedCount}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-100">
                        <span className="block text-[10px] text-slate-400">Xung đột</span>
                        <strong className="text-rose-600 text-base">{bulkResult.summary.conflictCount}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chọn Lớp Học Cần Sinh Lịch *</label>
                  <select
                    value={bulkClassId}
                    onChange={e => setBulkClassId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white font-semibold text-xs"
                    required
                  >
                    <option value="all">🌟 Tất cả các lớp đang mở ({classes.filter(c => c.status === 'Đang mở').length} lớp)</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id}) • Thứ {c.scheduleDays.join(',')} • Ca {c.shiftId}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Lớp được chọn sẽ sinh các ca học theo đúng thứ trong tuần (`scheduleDays`) và ca học (`shiftId`) đã cài đặt.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Từ ngày (Bắt đầu) *</label>
                    <input
                      type="date"
                      required
                      value={bulkStartDate}
                      onChange={e => setBulkStartDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-emerald-600 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Đến ngày (Kết thúc) *</label>
                    <input
                      type="date"
                      required
                      value={bulkEndDate}
                      onChange={e => setBulkEndDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-emerald-600 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Chọn nhanh khoảng ngày:</span>
                  <button
                    type="button"
                    onClick={() => handleAddMonthsToBulkEnd(1)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition border border-emerald-200"
                  >
                    +1 Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMonthsToBulkEnd(3)}
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold transition border border-teal-200"
                  >
                    +3 Tháng
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkOverwrite}
                      onChange={e => setBulkOverwrite(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-700">Ghi đè lịch cũ nếu đã có ca học trùng ngày</span>
                      <p className="text-[11px] text-slate-400">Nếu bỏ chọn, hệ thống sẽ tự động bỏ qua (skip) các ca học đã tồn tại trước đó.</p>
                    </div>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={bulkSubmitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {bulkSubmitting ? (
                      <>Đang xử lý sinh lịch...</>
                    ) : (
                      <>
                        <Sparkles size={15} /> Bắt đầu sinh lịch
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
