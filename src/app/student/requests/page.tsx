'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Modal } from '@/components/common/Modal';
import { ClassRequest, RequestType, ScheduleSlot, TIME_SHIFTS } from '@/types/schedule';
import { Inbox, Plus, Send, AlertCircle, CheckCircle, Clock, Calendar, ArrowRight, BookOpen, Check } from 'lucide-react';

export default function StudentRequestsPage() {
  const { currentUser, isReady } = useApp();
  const [requests, setRequests] = useState<ClassRequest[]>([]);
  const [studentClasses, setStudentClasses] = useState<any[]>([]);
  const [myScheduleSlots, setMyScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [allScheduleSlots, setAllScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState<{
    classId: string;
    type: RequestType;
    reason: string;
    scheduleSlotId: string;
    targetScheduleSlotId: string;
  }>({
    classId: '',
    type: 'XIN_NGHI',
    reason: '',
    scheduleSlotId: '',
    targetScheduleSlotId: '',
  });

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [reqRes, clsRes, mySchedRes, allSchedRes] = await Promise.all([
        fetch(`/api/requests?studentId=${currentUser.id}`),
        fetch(`/api/classes?studentId=${currentUser.id}`),
        fetch(`/api/schedule?studentId=${currentUser.id}`),
        fetch(`/api/schedule`),
      ]);

      const [reqData, clsData, mySchedData, allSchedData] = await Promise.all([
        reqRes.json(),
        clsRes.json(),
        mySchedRes.json(),
        allSchedRes.json(),
      ]);

      setRequests(reqData.requests || []);
      const classes = clsData.classes || [];
      setStudentClasses(classes);
      setMyScheduleSlots(mySchedData.slots || []);
      setAllScheduleSlots(allSchedData.slots || []);

      if (classes.length > 0) {
        const initialClassId = classes[0].id;
        const initialSlots = (mySchedData.slots || []).filter(
          (s: ScheduleSlot) => s.classId === initialClassId
        );
        setForm(prev => ({
          ...prev,
          classId: initialClassId,
          scheduleSlotId: initialSlots[0]?.id || '',
          targetScheduleSlotId: '',
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, isReady]);

  // Các ca học của học sinh trong lớp đang chọn
  const availableMySlots = useMemo(() => {
    if (!form.classId) return [];
    return myScheduleSlots.filter(s => s.classId === form.classId);
  }, [form.classId, myScheduleSlots]);

  // Thông tin ca học hiện tại đang chọn
  const currentSelectedSlot = useMemo(() => {
    return myScheduleSlots.find(s => s.id === form.scheduleSlotId);
  }, [form.scheduleSlotId, myScheduleSlots]);

  // Lớp học hiện tại đang chọn
  const currentSelectedClass = useMemo(() => {
    return studentClasses.find(c => c.id === form.classId);
  }, [form.classId, studentClasses]);

  // Môn học xác định từ ca học hoặc lớp học
  const activeSubject = useMemo(() => {
    return currentSelectedSlot?.subject || currentSelectedClass?.subject || currentSelectedClass?.name || '';
  }, [currentSelectedSlot, currentSelectedClass]);

  // Danh sách ca học mới khả dụng cùng môn học cho đơn đổi ca
  const targetAvailableSlots = useMemo(() => {
    if (form.type !== 'DOI_LICH' || !form.scheduleSlotId) return [];
    
    return allScheduleSlots.filter(slot => {
      // Bỏ qua chính ca học đang chọn
      if (slot.id === form.scheduleSlotId) return false;
      
      // Bắt buộc cùng môn học
      const slotSubject = (slot.subject || '').trim().toLowerCase();
      const targetSub = activeSubject.trim().toLowerCase();
      const isSameSubject = slotSubject === targetSub || (targetSub && slotSubject.includes(targetSub)) || (slotSubject && targetSub.includes(slotSubject));
      
      return isSameSubject;
    });
  }, [form.type, form.scheduleSlotId, allScheduleSlots, activeSubject]);

  // Format hiển thị ngày & thứ
  const formatSlotDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayName = days[d.getDay()] || '';
      const [year, month, day] = dateStr.split('-');
      return `${dayName}, ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const getShiftLabel = (shiftId: number) => {
    const s = TIME_SHIFTS.find(ts => ts.id === shiftId);
    return s ? `${s.name} (${s.startTime} - ${s.endTime})` : `Ca ${shiftId}`;
  };

  const handleClassChange = (newClassId: string) => {
    const slots = myScheduleSlots.filter(s => s.classId === newClassId);
    setForm(prev => ({
      ...prev,
      classId: newClassId,
      scheduleSlotId: slots[0]?.id || '',
      targetScheduleSlotId: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do chi tiết.');
      return;
    }

    if (!form.scheduleSlotId) {
      setErrorMsg('Vui lòng chọn ca học cần xin nghỉ / đổi lịch.');
      return;
    }

    if (form.type === 'DOI_LICH' && !form.targetScheduleSlotId) {
      setErrorMsg('Vui lòng chọn ca học mới mong muốn chuyển sang.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentUser?.id || "",
          classId: form.classId,
          scheduleSlotId: form.scheduleSlotId,
          targetScheduleSlotId: form.type === 'DOI_LICH' ? form.targetScheduleSlotId : undefined,
          type: form.type,
          reason: form.reason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setForm(prev => ({ ...prev, reason: '', targetScheduleSlotId: '' }));
        await loadData();
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra khi gửi đơn.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi mạng hoặc hệ thống.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper tìm thông tin slot theo ID
  const findSlotInfo = (slotId: string) => {
    return allScheduleSlots.find(s => s.id === slotId) || myScheduleSlots.find(s => s.id === slotId);
  };

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Đơn Xin Nghỉ Học & Đề Xuất Đổi Ca" 
          subtitle="Gửi yêu cầu trực tiếp tới Ban Quản lý và Giảng viên phụ trách môn học" 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Tổng số đơn đã nộp: <strong className="text-emerald-600">{requests.length}</strong> đơn
            </div>
            <button
              onClick={() => {
                setErrorMsg('');
                if (studentClasses.length > 0 && !form.classId) {
                  const initialClassId = studentClasses[0].id;
                  const initialSlots = myScheduleSlots.filter(s => s.classId === initialClassId);
                  setForm(prev => ({
                    ...prev,
                    classId: initialClassId,
                    scheduleSlotId: initialSlots[0]?.id || '',
                  }));
                }
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition shadow-xs cursor-pointer"
            >
              <Plus size={16} /> Tạo đơn mới
            </button>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {requests.map(req => {
              const origSlot = findSlotInfo(req.scheduleSlotId);
              const targetSlot = req.targetScheduleSlotId ? findSlotInfo(req.targetScheduleSlotId) : null;

              return (
                <div key={req.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-slate-300 transition space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase ${
                        req.type === 'XIN_NGHI' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {req.type === 'XIN_NGHI' ? 'Đơn xin nghỉ học' : 'Đề xuất đổi ca'}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        Mã đơn: {req.id} • Lớp {req.classId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        req.status === 'ĐÃ_DUYỆT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'TỪ_CHỐI'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Chi tiết ca học liên quan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500">
                        {req.type === 'XIN_NGHI' ? 'Ca xin nghỉ:' : 'Ca hiện tại muốn đổi:'}
                      </span>
                      {origSlot ? (
                        <div className="mt-1 text-slate-800 font-medium">
                          📅 {formatSlotDate(origSlot.date)} - {getShiftLabel(origSlot.shiftId)}
                          <div className="text-slate-500 text-[11px]">
                            Môn: {origSlot.subject} | Phòng: {origSlot.roomId} | GV: {origSlot.teacherId}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-slate-600 font-medium">Mã ca: {req.scheduleSlotId}</div>
                      )}
                    </div>

                    {req.type === 'DOI_LICH' && (
                      <div>
                        <span className="font-semibold text-indigo-600">Ca đề xuất chuyển sang:</span>
                        {targetSlot ? (
                          <div className="mt-1 text-indigo-950 font-medium">
                            📅 {formatSlotDate(targetSlot.date)} - {getShiftLabel(targetSlot.shiftId)}
                            <div className="text-slate-500 text-[11px]">
                              Môn: {targetSlot.subject} | Phòng: {targetSlot.roomId} | GV: {targetSlot.teacherId}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-slate-600 font-medium">Mã ca mới: {req.targetScheduleSlotId || 'Chưa xác định'}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 space-y-1.5">
                    <p className="p-3 bg-white rounded-lg border border-slate-100 italic text-slate-600">
                      "{req.reason}"
                    </p>

                    {req.reviewNote && (
                      <div className="mt-2 text-xs flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                        <span className="font-semibold text-slate-600">
                          Phản hồi ({req.reviewedBy || 'Ban Quản trị / Giảng viên'}):
                        </span>
                        <span className="font-medium text-slate-800">{req.reviewNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {requests.length === 0 && (
              <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                Bạn chưa gửi đơn xin nghỉ hay đổi ca học nào.
              </div>
            )}
          </div>

          {/* Modal Tạo Đơn Mới (Dùng Modal Portal chuẩn phủ 100vw x 100vh) */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Inbox size={18} className="text-emerald-600" />
                Gửi đơn xin phép & Đề xuất đổi ca
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer transition p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Loại yêu cầu */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loại yêu cầu</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, type: 'XIN_NGHI', targetScheduleSlotId: '' }));
                      setErrorMsg('');
                    }}
                    className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-2 cursor-pointer ${
                      form.type === 'XIN_NGHI'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Đơn xin nghỉ học
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, type: 'DOI_LICH' }));
                      setErrorMsg('');
                    }}
                    className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-2 cursor-pointer ${
                      form.type === 'DOI_LICH'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Đơn đề xuất đổi ca
                  </button>
                </div>
              </div>

              {/* 2. Chọn lớp học */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Chọn môn / Lớp học đang tham gia <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.classId}
                  onChange={e => handleClassChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 bg-white focus:outline-emerald-600 focus:border-emerald-600"
                  required
                >
                  {studentClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id}) - Môn: {c.subject || c.name} - GV: {c.teacherId}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Chọn ca học hiện tại */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {form.type === 'XIN_NGHI' ? 'Chọn ca học xin nghỉ' : 'Chọn ca học hiện tại muốn đổi'} <span className="text-rose-500">*</span>
                </label>
                {availableMySlots.length > 0 ? (
                  <select
                    value={form.scheduleSlotId}
                    onChange={e => {
                      setForm(prev => ({
                        ...prev,
                        scheduleSlotId: e.target.value,
                        targetScheduleSlotId: '',
                      }));
                    }}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 bg-white focus:outline-emerald-600 focus:border-emerald-600"
                    required
                  >
                    {availableMySlots.map(slot => (
                      <option key={slot.id} value={slot.id}>
                        {formatSlotDate(slot.date)} - [{getShiftLabel(slot.shiftId)}] - Phòng: {slot.roomId} - GV: {slot.teacherId}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs">
                    Lớp này hiện chưa có lịch học nào được sắp xếp.
                  </div>
                )}
              </div>

              {/* 4. Bước chọn ca học mới (Nếu là Đơn Đổi Ca) - CUỘN NGANG */}
              {form.type === 'DOI_LICH' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-600" />
                      Chọn ca học mới chuyển sang (Bắt buộc cùng môn: <span className="text-emerald-700 underline">{activeSubject || 'Môn học'}</span>)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {targetAvailableSlots.length} ca khả dụng
                    </span>
                  </div>

                  {targetAvailableSlots.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin">
                      {targetAvailableSlots.map(slot => {
                        const isSelected = form.targetScheduleSlotId === slot.id;
                        return (
                          <div
                            key={slot.id}
                            onClick={() => setForm(prev => ({ ...prev, targetScheduleSlotId: slot.id }))}
                            className={`shrink-0 w-64 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-slate-800 text-xs">
                                {formatSlotDate(slot.date)}
                              </span>
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <Check size={12} /> Đã chọn
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Nhấn để chọn</span>
                              )}
                            </div>

                            <div className="space-y-1 text-xs text-slate-600">
                              <div className="font-semibold text-indigo-700">
                                🕒 {getShiftLabel(slot.shiftId)}
                              </div>
                              <div className="text-[11px] text-slate-600">
                                🏫 Phòng: <strong>{slot.roomId}</strong>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                👨‍🏫 GV: <strong>{slot.teacherId}</strong> • Lớp {slot.classId}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                      Không tìm thấy ca học khả dụng nào khác cùng môn <strong>{activeSubject}</strong> trong hệ thống.
                    </div>
                  )}
                </div>
              )}

              {/* 5. Lý do xin phép */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Lý do chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Nêu rõ lý do xin nghỉ hoặc nguyên nhân xin chuyển đổi ca học..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-emerald-600 focus:border-emerald-600"
                  required
                ></textarea>
              </div>

              {/* Action buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition text-xs font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.scheduleSlotId || (form.type === 'DOI_LICH' && !form.targetScheduleSlotId)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  <Send size={14} /> {submitting ? 'Đang gửi...' : 'Gửi đơn phê duyệt'}
                </button>
              </div>
            </form>
          </Modal>
        </main>
      </div>
    </RoleGuard>
  );
}
