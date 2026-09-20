'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { ScheduleSlot, TIME_SHIFTS } from '@/types/schedule';
import { Teacher } from '@/types/teacher';
import { Classroom, ClassEntity } from '@/types/classroom';
import { Calendar, ChevronLeft, ChevronRight, AlertCircle, Plus, UserCheck, Edit3, Trash2, X, Check, Video, ExternalLink, Headphones } from 'lucide-react';

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState('2026-09-02');
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal Thêm ca học
  const [showAddModal, setShowAddModal] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [newSlotData, setNewSlotData] = useState({
    classId: 'CLS01',
    teacherId: 'GV001',
    roomId: 'P.101',
    date: '2026-09-02',
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
      const [slotRes, tcRes, clsRes] = await Promise.all([
        fetch(`/api/schedule?date=${date}`),
        fetch('/api/teachers'),
        fetch('/api/classes'),
      ]);
      const slotData = await slotRes.json();
      const tcData = await tcRes.json();
      const clsData = await clsRes.json();

      setSlots(slotData.slots || []);
      setTeachers(tcData.teachers || []);
      setClasses(clsData.classes || []);
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    setConflictError(null);
    const shift = TIME_SHIFTS.find(s => s.id === Number(editFormData.shiftId)) || TIME_SHIFTS[0];

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
    const shift = TIME_SHIFTS.find(s => s.id === Number(newSlotData.shiftId)) || TIME_SHIFTS[0];

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
                  if (d.toISOString().slice(0, 7) === '2026-09') {
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }
                }}
                className="p-1 hover:bg-white rounded text-slate-600 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 font-semibold text-sm text-slate-800 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                {selectedDate}
              </span>
              <button 
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  if (d.toISOString().slice(0, 7) === '2026-09') {
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }
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

          <button
            onClick={() => {
              setNewSlotData(prev => ({ ...prev, date: selectedDate }));
              setConflictError(null);
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-xs transition whitespace-nowrap w-full sm:w-auto shrink-0"
          >
            <Plus size={16} /> Thêm ca học mới
          </button>
        </div>

        {/* Schedule Grid by Time Shifts */}
        <div className="space-y-4">
          {TIME_SHIFTS.map(shift => {
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
                      {TIME_SHIFTS.map(s => (
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
                      {TIME_SHIFTS.map(s => (
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
      </main>
    </div>
  );
}
