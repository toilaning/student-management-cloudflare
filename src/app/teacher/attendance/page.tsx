'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { FileCheck, CheckCircle2, UserX, Clock, AlertTriangle, Save, Check } from 'lucide-react';

function AttendanceContent() {
  const { currentUser, isReady } = useApp();
  const searchParams = useSearchParams();
  const slotIdParam = searchParams.get('slotId');
  const classIdParam = searchParams.get('classId');

  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(slotIdParam || '');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load danh sách ca dạy của GV
  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function loadTeacherSlots() {
      try {
        const res = await fetch(`/api/schedule?teacherId=${currentUser?.id || ""}`);
        const data = await res.json();
        const loadedSlots = data.slots || [];
        setSlots(loadedSlots);
        if (!selectedSlotId && loadedSlots.length > 0) {
          setSelectedSlotId(loadedSlots[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadTeacherSlots();
  }, [currentUser, isReady]);

  // Load chi tiết điểm danh của slot đang chọn
  useEffect(() => {
    if (!isReady || !currentUser?.id || !selectedSlotId) return;

    async function loadAttendance() {
      setLoading(true);
      try {
        const [attRes, stRes] = await Promise.all([
          fetch(`/api/attendance?slotId=${selectedSlotId}`),
          fetch('/api/students?limit=400'),
        ]);

        const attData = await attRes.json();
        const stData = await stRes.json();

        const stMap: Record<string, any> = {};
        if (stData.students) {
          stData.students.forEach((s: any) => { stMap[s.id] = s; });
        }
        setStudents(stMap);

        if (attData.records && attData.records.length > 0) {
          setRecords(attData.records);
        } else {
          // Nếu slot chưa có record nào, tạo draft dựa trên danh sách lớp
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
                checkinTime: currentSlot.startTime,
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
        setLoading(false);
      }
    }
    loadAttendance();
  }, [selectedSlotId, slots, currentUser, isReady]);

  const handleStatusChange = (index: number, newStatus: AttendanceStatus) => {
    const updated = [...records];
    updated[index].status = newStatus;
    if (newStatus === 'Có mặt') {
      const slot = slots.find(s => s.id === selectedSlotId);
      updated[index].checkinTime = slot ? `${slot.startTime}:05` : '08:05';
    } else if (newStatus === 'Đi muộn') {
      const slot = slots.find(s => s.id === selectedSlotId);
      updated[index].checkinTime = slot ? `${slot.startTime.split(':')[0]}:30` : '08:30';
    } else {
      updated[index].checkinTime = undefined;
    }
    setRecords(updated);
  };

  const handleNoteChange = (index: number, note: string) => {
    const updated = [...records];
    updated[index].note = note;
    setRecords(updated);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          slotId: selectedSlotId,
          updatedBy: currentUser?.id || "",
          updaterName: currentUser?.name || "",
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentSlot = slots.find(s => s.id === selectedSlotId);

  const countPresent = records.filter(r => r.status === 'Có mặt').length;
  const countLate = records.filter(r => r.status === 'Đi muộn').length;
  const countAbsentExcused = records.filter(r => r.status === 'Vắng có phép').length;
  const countAbsentUnexcused = records.filter(r => r.status === 'Vắng không phép').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Sổ Điểm Danh Học Viên" 
        subtitle="Điểm danh chuyên cần theo từng buổi học, ca học và lớp học phụ trách" 
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Slot Selector & Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Chọn ca học:</span>
            <select
              value={selectedSlotId}
              onChange={e => setSelectedSlotId(e.target.value)}
              className="w-full sm:w-96 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-indigo-600"
            >
              {slots.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.date}] Ca {s.shiftId} ({s.startTime}-{s.endTime}) - {s.subject} ({s.classId}) - Phòng {s.roomId}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check size={16} /> Đã lưu thành công!
              </span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={loading || records.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition shadow-xs disabled:opacity-50"
            >
              <Save size={16} /> Lưu sổ điểm danh
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
            <div className="text-xs font-semibold text-emerald-700 uppercase">Có mặt</div>
            <div className="text-xl font-bold text-emerald-800 mt-1">{countPresent}</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-center">
            <div className="text-xs font-semibold text-amber-700 uppercase">Đi muộn</div>
            <div className="text-xl font-bold text-amber-800 mt-1">{countLate}</div>
          </div>
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-center">
            <div className="text-xs font-semibold text-blue-700 uppercase">Vắng có phép</div>
            <div className="text-xl font-bold text-blue-800 mt-1">{countAbsentExcused}</div>
          </div>
          <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-center">
            <div className="text-xs font-semibold text-rose-700 uppercase">Vắng không phép</div>
            <div className="text-xl font-bold text-rose-800 mt-1">{countAbsentUnexcused}</div>
          </div>
        </div>

        {/* Attendance List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Danh sách học viên ca {currentSlot?.shiftId} ({currentSlot?.subject} - {currentSlot?.classId})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Ngày học: {currentSlot?.date} • Phòng: {currentSlot?.roomId}</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{records.length} học viên</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">STT</th>
                  <th className="px-4 py-3">Mã SV</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Trạng thái điểm danh</th>
                  <th className="px-4 py-3">Giờ vào lớp</th>
                  <th className="px-4 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, idx) => {
                  const student = students[r.studentId];
                  return (
                    <tr key={r.id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-indigo-600">{r.studentId}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {student ? student.name : `Học viên ${r.studentId}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(['Có mặt', 'Đi muộn', 'Vắng có phép', 'Vắng không phép'] as AttendanceStatus[]).map(statusOpt => (
                            <button
                              key={statusOpt}
                              type="button"
                              onClick={() => handleStatusChange(idx, statusOpt)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                                r.status === statusOpt
                                  ? statusOpt === 'Có mặt'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : statusOpt === 'Đi muộn'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : statusOpt === 'Vắng có phép'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {statusOpt}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {r.checkinTime || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={r.note || ''}
                          onChange={e => handleNoteChange(idx, e.target.value)}
                          placeholder="Nhập ghi chú (nếu có)..."
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-indigo-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TeacherAttendancePage() {
  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Đang tải sổ điểm danh...</div>}>
        <AttendanceContent />
      </Suspense>
    </RoleGuard>
  );
}
