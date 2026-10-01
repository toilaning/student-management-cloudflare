'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassRequest, ScheduleSlot } from '@/types/schedule';
import { 
  History, 
  ArrowRightLeft, 
  Search, 
  Clock, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';

export default function TeacherShiftChangeLogPage() {
  const { currentUser, isReady } = useApp();
  const [requests, setRequests] = useState<ClassRequest[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allScheduleSlots, setAllScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [reqRes, stuRes, schedRes] = await Promise.all([
        fetch(`/api/requests?teacherId=${currentUser.id}`),
        fetch('/api/students?limit=1000'),
        fetch('/api/schedule'),
      ]);

      const [reqData, stuData, schedData] = await Promise.all([
        reqRes.json(),
        stuRes.json(),
        schedRes.json(),
      ]);

      setRequests(reqData.requests || []);
      setAllStudents(stuData.students || []);
      setAllScheduleSlots(schedData.slots || []);
    } catch (e) {
      console.error('Lỗi khi nạp nhật ký đổi ca:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, isReady]);

  const studentMap = useMemo(() => {
    return new Map(allStudents.map(s => [s.id, s]));
  }, [allStudents]);

  const slotMap = useMemo(() => {
    return new Map(allScheduleSlots.map(s => [s.id, s]));
  }, [allScheduleSlots]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const student = studentMap.get(r.studentId);
      const studentName = student?.name?.toLowerCase() || '';
      return !searchTerm || 
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentName.includes(searchTerm.toLowerCase());
    });
  }, [requests, searchTerm, studentMap]);

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
        <Header 
          title="Nhật Ký Đổi Ca Học Sinh" 
          subtitle="Giáo viên liếc mắt là biết ngay ai vừa đổi ca • Hệ thống tự động chuyển lịch 100%" 
        />

        <main className="p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-5">
          {/* SEARCH & FILTER */}
          <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs flex items-center gap-3">
            <Search size={18} className="text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="Tìm nhanh học viên theo mã hoặc tên..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                Xóa
              </button>
            )}
          </div>

          {/* TIMELINE LIST */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                <History size={18} className="text-indigo-600" />
                Học sinh đổi ca trong các lớp của thầy/cô
              </div>
              <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                {filteredRequests.length} lượt đổi
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Đang nạp nhật ký đổi ca...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm font-medium">
                Chưa có học sinh nào đổi ca trong các lớp phụ trách.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRequests.map(req => {
                  const student = studentMap.get(req.studentId);
                  const origSlot = slotMap.get(req.scheduleSlotId);
                  const targetSlot = req.targetScheduleSlotId ? slotMap.get(req.targetScheduleSlotId) : null;
                  const reqDate = new Date(req.createdAt);

                  return (
                    <div 
                      key={req.id} 
                      className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      {/* Thông tin học viên */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-bold text-slate-700 shrink-0">
                          {student?.name?.charAt(0) || 'H'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {student?.name || `Học viên ${req.studentId}`}
                            </span>
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {req.studentId}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 font-medium">
                              Lớp {student?.gradeLevel || '12'} ({student?.examBlock === 'KHOI_H' ? 'Khối H' : 'Khối V'})
                            </span>
                          </div>

                          {/* Ca gốc -> Ca đích */}
                          <div className="mt-1 text-slate-700 font-medium flex items-center gap-2 flex-wrap">
                            <div className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              <span className="text-slate-400 font-bold">Từ ca:</span>
                              <strong className="text-slate-800">
                                {origSlot ? `[${origSlot.date}] ${origSlot.startTime}-${origSlot.endTime}` : req.scheduleSlotId}
                              </strong>
                            </div>
                            <span className="text-indigo-600 font-black">➔</span>
                            <div className="inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <span className="text-emerald-700 font-bold">Sang ca:</span>
                              <strong className="text-emerald-800">
                                {targetSlot ? `[${targetSlot.date}] ${targetSlot.startTime}-${targetSlot.endTime}` : (req.targetScheduleSlotId || 'Ca mới')}
                              </strong>
                            </div>
                          </div>

                          {req.reason && (
                            <div className="text-[11px] text-slate-400 italic mt-1">
                              Lý do: "{req.reason}"
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Trạng thái & Thời gian */}
                      <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                        <div className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                          <Clock size={12} />
                          <span>{reqDate.toLocaleDateString('vi-VN')} {reqDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 font-extrabold text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Đã tự động chuyển</span>
                        </div>
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
