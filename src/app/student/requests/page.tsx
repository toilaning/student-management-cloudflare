'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleSlot, TIME_SHIFTS } from '@/types/schedule';
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  History,
  Check
} from 'lucide-react';

export default function StudentShiftChangePage() {
  const { currentUser, isReady } = useApp();
  const [requests, setRequests] = useState<any[]>([]);
  const [mySlots, setMySlots] = useState<ScheduleSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCurrentSlotId, setSelectedCurrentSlotId] = useState<string>('');
  const [selectedTargetSlotId, setSelectedTargetSlotId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [reqRes, mySchedRes, allSchedRes] = await Promise.all([
        fetch(`/api/requests?studentId=${currentUser.id}`),
        fetch(`/api/schedule?studentId=${currentUser.id}`),
        fetch(`/api/schedule`),
      ]);

      const [reqData, mySchedData, allSchedData] = await Promise.all([
        reqRes.json(),
        mySchedRes.json(),
        allSchedRes.json(),
      ]);

      setRequests(reqData.requests || []);
      const userSlots: ScheduleSlot[] = mySchedData.slots || [];
      const allSlots: ScheduleSlot[] = allSchedData.slots || [];
      setMySlots(userSlots);

      if (userSlots.length > 0 && !selectedCurrentSlotId) {
        setSelectedCurrentSlotId(userSlots[0].id);
      }

      setAvailableSlots(allSlots);
    } catch (e) {
      console.error(e);
      showToast('Lỗi khi nạp dữ liệu ca học', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, isReady]);

  // Các ca học tương lai khác có thể đổi sang
  const currentSlotObj = useMemo(() => {
    return mySlots.find(s => s.id === selectedCurrentSlotId);
  }, [mySlots, selectedCurrentSlotId]);

  const targetEligibleSlots = useMemo(() => {
    return availableSlots.filter(s => s.id !== selectedCurrentSlotId);
  }, [availableSlots, selectedCurrentSlotId]);

  // Xử lý đổi ca tự động 100% không cần duyệt
  const handleAutoShiftChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurrentSlotId || !selectedTargetSlotId) {
      showToast('Vui lòng chọn ca hiện tại và ca muốn chuyển đến', 'error');
      return;
    }

    const targetSlot = availableSlots.find(s => s.id === selectedTargetSlotId);
    if (!targetSlot) {
      showToast('Ca học đích không hợp lệ', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentUser?.id || "",
          classId: currentSlotObj?.classId || targetSlot.classId,
          scheduleSlotId: selectedCurrentSlotId,
          targetScheduleSlotId: selectedTargetSlotId,
          type: 'DOI_LICH',
          reason: reason.trim() || 'Học sinh đổi ca theo nguyện vọng cá nhân',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('🎉 Đổi ca thành công 100%! Lịch mới đã được cập nhật ngay lập tức.');
        setReason('');
        setSelectedTargetSlotId('');
        await loadData();
      } else {
        showToast(data.error || 'Có lỗi xảy ra khi đổi ca', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi mạng khi gửi đổi ca', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper format slot label
  const formatSlot = (slot?: ScheduleSlot) => {
    if (!slot) return '';
    return `[${slot.date}] ${slot.startTime} - ${slot.endTime} (${slot.subject || 'Lớp xưởng'}) - Phòng ${slot.roomId}`;
  };

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
        <Header 
          title="Đổi Ca Học Tự Động" 
          subtitle="Tự do chuyển ca không cần chờ duyệt • Cập nhật lịch học mới tức thì trong 5 giây" 
        />

        <main className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
          {/* Toast */}
          {toastMessage && (
            <div className={`p-4 rounded-2xl shadow-lg border flex items-center gap-3 transition-all animate-in fade-in duration-150 ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}>
              {toastMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-rose-600" />}
              <span className="text-sm font-bold">{toastMessage.text}</span>
            </div>
          )}

          {/* KHỐI 1: FLAPPY ACTION CARD - CHỌN VÀ ĐỔI CA 1-CLICK */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border-2 border-indigo-200 shadow-md space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <ArrowRightLeft size={24} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Chuyển Sang Ca Học Khác
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Đổi xong lịch mới sẽ tự kích hoạt ngay, lịch cũ tự động gỡ bỏ.
                </p>
              </div>
            </div>

            <form onSubmit={handleAutoShiftChange} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Ca học hiện tại muốn bỏ */}
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    1. Ca học hiện tại của bạn:
                  </label>
                  {mySlots.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3">Bạn chưa có ca học nào trong danh sách.</div>
                  ) : (
                    <select
                      value={selectedCurrentSlotId}
                      onChange={e => setSelectedCurrentSlotId(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-900 focus:outline-indigo-600 cursor-pointer shadow-2xs"
                    >
                      {mySlots.map(s => (
                        <option key={s.id} value={s.id}>
                          [{s.date}] {s.startTime}-{s.endTime} | {s.subject} ({s.classId})
                        </option>
                      ))}
                    </select>
                  )}
                  {currentSlotObj && (
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
                      <Clock size={13} className="text-slate-400" />
                      Phòng: {currentSlotObj.roomId} • Giảng viên: {currentSlotObj.teacherId}
                    </div>
                  )}
                </div>

                {/* 2. Ca học mới muốn chuyển sang */}
                <div className="bg-indigo-50/60 p-4 rounded-2xl border-2 border-indigo-200 space-y-2">
                  <label className="block text-xs font-black text-indigo-900 uppercase tracking-wider">
                    2. Chọn ca học mới muốn vào:
                  </label>
                  <select
                    value={selectedTargetSlotId}
                    onChange={e => setSelectedTargetSlotId(e.target.value)}
                    required
                    className="w-full bg-white border-2 border-indigo-400 rounded-xl p-3 text-xs sm:text-sm font-bold text-indigo-950 focus:outline-indigo-600 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Bấm vào đây để chọn ca mới --</option>
                    {targetEligibleSlots.map(s => (
                      <option key={s.id} value={s.id}>
                        [{s.date}] {s.startTime}-{s.endTime} | {s.subject} ({s.classId})
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1.5 mt-1">
                    <Sparkles size={13} className="text-indigo-600" />
                    Chuyển tức thì • Không cần chờ quản lý hay giáo viên phê duyệt
                  </div>
                </div>
              </div>

              {/* Lý do (tùy chọn) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Ghi chú lý do (tùy chọn):
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="VD: Trùng lịch kiểm tra tại trường, bận việc gia đình..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-indigo-600"
                />
              </div>

              {/* NÚT BẤM TO BẢN XÁC NHẬN ĐỔI CA */}
              <button
                type="submit"
                disabled={submitting || !selectedTargetSlotId || !selectedCurrentSlotId}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-2xl font-black text-base sm:text-lg transition-all shadow-md hover:shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>Đang xử lý đổi ca...</span>
                ) : (
                  <>
                    <ArrowRightLeft size={20} />
                    <span>XÁC NHẬN ĐỔI CA NGAY LẬP TỨC (5 GIÂY)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* KHỐI 2: NHẬT KÝ ĐỔI CA ĐÃ THỰC HIỆN */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                <History size={18} className="text-indigo-600" />
                Lịch sử các lần đổi ca của bạn
              </div>
              <span className="text-xs font-bold text-slate-500">{requests.length} lượt</span>
            </div>

            {requests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Bạn chưa thực hiện lần đổi ca nào.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map(req => {
                  const targetSlot = availableSlots.find(s => s.id === req.targetScheduleSlotId);
                  const origSlot = availableSlots.find(s => s.id === req.scheduleSlotId) || mySlots.find(s => s.id === req.scheduleSlotId);

                  return (
                    <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {req.id}
                          </span>
                          <span className="font-bold text-slate-800">
                            {new Date(req.createdAt).toLocaleDateString('vi-VN')} {new Date(req.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-600 font-medium flex items-center gap-1.5 flex-wrap">
                          <span>Từ ca: <strong className="text-slate-900">[{req.scheduleSlotId}] {origSlot?.startTime || ''}</strong></span>
                          <span>👉</span>
                          <span>Sang ca: <strong className="text-emerald-700">[{req.targetScheduleSlotId || 'Ca mới'}] {targetSlot?.startTime || ''}</strong></span>
                        </div>
                        {req.reason && (
                          <div className="text-[11px] text-slate-400 mt-0.5 italic">
                            Lý do: "{req.reason}"
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Check size={14} className="stroke-[3]" />
                        <span>Đã đổi thành công</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
