'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { ScheduleSlot, TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { Teacher } from '@/types/teacher';
import { ClassEntity } from '@/types/classroom';
import { Student } from '@/types/student';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Video, ExternalLink, Users, Clock, BookOpen, UserCheck, AlertCircle, X, CheckCircle, HelpCircle, MapPin } from 'lucide-react';
import { getTodayDateStr } from '@/utils/date';

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);

  // Modal xem chi tiết học sinh buổi học
  const [selectedSlotForStudents, setSelectedSlotForStudents] = useState<ScheduleSlot | null>(null);

  const loadData = async (date: string) => {
    setLoading(true);
    try {
      const [slotRes, tcRes, clsRes, stRes] = await Promise.all([
        fetch(`/api/schedule?date=${date}`),
        fetch('/api/teachers'),
        fetch('/api/classes'),
        fetch('/api/students?limit=400'),
      ]);
      const slotData = await slotRes.json();
      const tcData = await tcRes.json();
      const clsData = await clsRes.json();
      const stData = await stRes.json();

      setSlots(slotData.slots || []);
      if (slotData.shifts) setShifts(slotData.shifts);
      setTeachers(tcData.teachers || []);
      setClasses(clsData.classes || []);
      setStudents(stData.students || []);
    } catch (e) {
      console.error('Lỗi khi tải lịch học:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const teacherMap: Record<string, string> = {};
  teachers.forEach(t => { teacherMap[t.id] = t.name; });

  const classMap: Record<string, ClassEntity> = {};
  classes.forEach(c => { classMap[c.id] = c; });

  const studentMap: Record<string, Student> = {};
  students.forEach(s => { studentMap[s.id] = s; });

  // Tính trạng thái thực tế: Đang diễn ra, Sắp diễn ra, Đã kết thúc, hoặc Đã hủy
  const getSlotRuntimeStatus = (slot: ScheduleSlot) => {
    if (slot.status === 'Đã hủy') return { label: 'Đã hủy', color: 'bg-rose-50 text-rose-700 border-rose-200' };

    const todayStr = getTodayDateStr();
    if (slot.date < todayStr) {
      return { label: 'Đã kết thúc', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (slot.date > todayStr) {
      return { label: 'Sắp diễn ra', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }

    // Ngày hôm nay: so sánh giờ
    const now = new Date();
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    const startTime = slot.startTime || '00:00';
    const endTime = slot.endTime || '23:59';

    if (currentTimeStr < startTime) {
      return { label: 'Sắp diễn ra', color: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    if (currentTimeStr >= startTime && currentTimeStr <= endTime) {
      return { label: 'Đang diễn ra', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-400/30' };
    }
    return { label: 'Đã kết thúc', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  // Sắp xếp các lớp học trong ngày từ sáng đến tối theo startTime
  const activeSlots = slots
    .filter(s => s.status !== 'Đã hủy')
    .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

  const canceledSlots = slots.filter(s => s.status === 'Đã hủy');

  const sortedShifts = [...shifts].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Lịch Học & Ca Dạy Trong Ngày" 
        subtitle="Xem trong ngày hôm nay hoặc những ngày khác có những lớp học nào đang diễn ra" 
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header: Bộ chọn ngày linh hoạt [<] [📅 Chọn ngày] [>] kèm [📍 Hôm nay] */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button 
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                title="Ngày hôm trước"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <CalendarIcon size={16} className="text-indigo-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => e.target.value && setSelectedDate(e.target.value)}
                  className="font-bold text-xs sm:text-sm text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                />
              </div>

              <button 
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-1 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                title="Ngày tiếp theo"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateStr())}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition border border-indigo-200 shadow-2xs cursor-pointer flex items-center gap-1"
            >
              📍 Hôm nay
            </button>
          </div>

          {/* Thanh tổng quan: Ngày DD/MM/YYYY có tổng cộng X lớp học đang diễn ra */}
          <div className="text-xs text-slate-500 font-medium">
            Ngày <strong className="text-slate-800 font-bold">{selectedDate}</strong> có tổng cộng:{' '}
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              {activeSlots.length} lớp học đang diễn ra
            </span>
          </div>
        </div>

        {/* Lưới ma trận: trục ngang = Ca giờ (5 ca), trục dọc = lớp/ca dạy trong ngày */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Đang tải danh sách lớp học ngày {selectedDate}...</div>
        ) : activeSlots.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 w-48 sticky left-0 bg-slate-50">
                      Lớp / Ca dạy
                    </th>
                    {sortedShifts.map(shift => (
                      <th key={shift.id} className="p-3 text-center text-xs font-bold text-slate-700 border-r border-slate-200">
                        <div className="font-bold text-indigo-700 text-xs">Ca {shift.id}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 font-normal">
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeSlots.map(slot => {
                    const cls = classMap[slot.classId];
                    const studentCount = (cls?.studentIds || []).length;
                    const runtimeStatus = getSlotRuntimeStatus(slot);
                    const teacherName = teacherMap[slot.teacherId] || slot.teacherId;

                    return (
                      <tr key={slot.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 align-top bg-slate-50/60 border-r border-slate-200 sticky left-0 bg-slate-50">
                          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                            Mã lớp: {slot.classId}
                          </div>
                          <div className="font-bold text-slate-800 text-sm mt-0.5 leading-snug">
                            {cls?.name || slot.subject}
                          </div>
                          <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                            {slot.subject}
                          </div>
                        </td>
                        {sortedShifts.map(shift => {
                          const active = slot.shiftId === shift.id;
                          return (
                            <td
                              key={shift.id}
                              className={`p-2 align-top border-r border-slate-100 min-h-[120px] ${active ? 'bg-blue-50/30' : 'bg-white'}`}
                            >
                              {active ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[10px] font-bold font-mono flex items-center gap-1">
                                      <Clock size={11} className="text-amber-600" />
                                      {slot.startTime} - {slot.endTime}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${runtimeStatus.color}`}>
                                      {runtimeStatus.label}
                                    </span>
                                  </div>

                                  <div className="space-y-1 text-[11px] text-slate-500">
                                    <div className="flex items-center gap-1">
                                      <UserCheck size={11} className="text-indigo-500 shrink-0" />
                                      <span className="truncate">{teacherName} ({slot.teacherId})</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users size={11} className="text-emerald-500 shrink-0" />
                                      <span className="font-bold text-indigo-600">{studentCount} học viên</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin size={11} className="text-slate-400 shrink-0" />
                                      <span>{slot.roomId}</span>
                                    </div>
                                  </div>

                                  {slot.meetingLink ? (
                                    <a
                                      href={slot.meetingLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold"
                                    >
                                      <Video size={12} /> Vào Phòng học online <ExternalLink size={10} />
                                    </a>
                                  ) : (
                                    <div className="text-[10px] text-slate-400 italic">
                                      Chưa gắn link phòng học online
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedSlotForStudents(slot)}
                                      className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Users size={11} /> Danh sách ({studentCount})
                                    </button>
                                    <a
                                      href={`/admin/attendance?classId=${slot.classId}&date=${selectedDate}`}
                                      className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold transition shadow-xs flex items-center gap-1"
                                    >
                                      Điểm danh &rarr;
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-200 text-center text-[11px]">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Các lớp đã hủy trong ngày nếu có */}
            {canceledSlots.length > 0 && (
              <div className="pt-6 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Ca học đã hủy trong ngày ({canceledSlots.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {canceledSlots.map(s => (
                    <div key={s.id} className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-400 flex items-center justify-between opacity-70">
                      <div>
                        <div className="font-semibold line-through">{s.subject} ({s.classId})</div>
                        <div className="text-[11px] font-mono">{s.startTime} - {s.endTime}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 font-bold">Đã hủy</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty state nhẹ nhàng khi không có lớp nào trong ngày */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <CalendarIcon size={24} />
            </div>
            <h4 className="font-bold text-slate-700 text-base">Không có lớp học nào trong ngày này</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Ngày {selectedDate} hiện không có lớp học nào được xếp lịch. Bạn có thể chọn ngày khác hoặc sang mục <strong>Quản lý lớp học</strong> để tạo lớp mới.
            </p>
          </div>
        )}
      </main>

      {/* Modal Xem Chi Tiết Học Sinh Buổi Học */}
      {selectedSlotForStudents && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Danh Sách Học Viên Buổi Học</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lớp: <strong className="text-slate-700">{selectedSlotForStudents.subject}</strong> ({selectedSlotForStudents.classId}) • Khung giờ: <span className="font-mono font-bold text-indigo-600">{selectedSlotForStudents.startTime} - {selectedSlotForStudents.endTime}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedSlotForStudents(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {(() => {
                const cls = classMap[selectedSlotForStudents.classId];
                const studentIds = cls?.studentIds || [];

                if (studentIds.length === 0) {
                  return <div className="p-8 text-center text-xs text-slate-400">Lớp học này hiện chưa có học viên nào ghi danh.</div>;
                }

                return (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {studentIds.map(stId => {
                      const st = studentMap[stId];
                      return (
                        <div key={stId} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                          <div>
                            <div className="font-bold text-slate-800">{st ? st.name : stId} <span className="font-mono text-[10px] text-slate-400 font-normal">({stId})</span></div>
                            <div className="text-[11px] text-slate-400">{st?.phone || 'Chưa cập nhật SĐT'} • {st?.email || ''}</div>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                            Ghi danh
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`/admin/attendance?classId=${selectedSlotForStudents.classId}&date=${selectedDate}`}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                Chuyển đến Sổ điểm danh &rarr;
              </a>
              <button
                onClick={() => setSelectedSlotForStudents(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
