'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { ClassEntity } from '@/types/classroom';
import { Student } from '@/types/student';
import { Teacher } from '@/types/teacher';
import { BookOpen, Users, UserCheck, Search, Plus, Trash2, X, Check, Edit3, Video, ExternalLink, Calendar, Clock, RefreshCw, Sparkles } from 'lucide-react';
import { PaginationControls } from '@/components/common/PaginationControls';

export default function AdminClassesPage() {
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassFormData, setNewClassFormData] = useState({
    name: '',
    code: '',
    subject: '',
    teacherId: '',
    roomId: 'P.101',
    shiftId: 1,
    startTime: '18:30',
    endTime: '20:30',
    scheduleDays: [2, 4, 6] as number[],
    isRecurring: true,
    tuitionFee: 1500000,
    meetingLink: '',
    autoGenerateSchedule: true,
    generateMonths: 3,
  });

  // Modal Sinh lịch nhanh cho riêng 1 lớp
  const [quickScheduleClass, setQuickScheduleClass] = useState<ClassEntity | null>(null);
  const [quickScheduleStartDate, setQuickScheduleStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickScheduleEndDate, setQuickScheduleEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [quickScheduleStartTime, setQuickScheduleStartTime] = useState('18:30');
  const [quickScheduleEndTime, setQuickScheduleEndTime] = useState('20:30');
  const [quickScheduleDays, setQuickScheduleDays] = useState<number[]>([2, 4, 6]);
  const [quickScheduleOverwrite, setQuickScheduleOverwrite] = useState(false);
  const [quickScheduleSubmitting, setQuickScheduleSubmitting] = useState(false);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modal quản lý học viên của lớp
  const [selectedClass, setSelectedClass] = useState<ClassEntity | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modal đổi giáo viên quản lý lớp
  const [changingTeacherClass, setChangingTeacherClass] = useState<ClassEntity | null>(null);
  const [newTeacherId, setNewTeacherId] = useState('');
  const [editingMeetClass, setEditingMeetClass] = useState<ClassEntity | null>(null);
  const [meetLinkInput, setMeetLinkInput] = useState('');

  const formatScheduleDays = (days?: number[]) => {
    if (!days || days.length === 0) return 'Chưa xếp thứ';
    const sorted = [...days].sort((a, b) => a - b);
    return sorted.map(d => (d === 8 ? 'CN' : `T${d}`)).join(', ');
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassFormData.name || !newClassFormData.code || !newClassFormData.subject || !newClassFormData.teacherId) {
      alert('Vui lòng điền đủ Tên lớp, Mã môn, Chuyên môn và Giảng viên');
      return;
    }

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClassFormData),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Tạo lớp học mới thành công!');
        setShowAddClassModal(false);
        setNewClassFormData({
          name: '',
          code: '',
          subject: '',
          teacherId: teachers[0]?.id || '',
          roomId: 'P.101',
          shiftId: 1,
          startTime: '18:30',
          endTime: '20:30',
          scheduleDays: [2, 4, 6],
          isRecurring: true,
          tuitionFee: 1500000,
          meetingLink: '',
          autoGenerateSchedule: true,
          generateMonths: 3,
        });
        await loadData();
      } else {
        alert(data.error || 'Tạo lớp học thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi kết nối mạng');
    }
  };

  const handleQuickSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScheduleClass) return;
    setQuickScheduleSubmitting(true);

    try {
      const res = await fetch('/api/schedule/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classIds: [quickScheduleClass.id],
          startDate: quickScheduleStartDate,
          endDate: quickScheduleEndDate,
          startTime: quickScheduleStartTime,
          endTime: quickScheduleEndTime,
          shiftId: quickScheduleClass.shiftId || 1,
          scheduleDays: quickScheduleDays,
          overwriteExisting: quickScheduleOverwrite,
          actorId: 'ADMIN001',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Đã lên lịch thành công cho lớp ${quickScheduleClass.name}: tạo mới ${data.summary.createdCount} ca!`);
        setQuickScheduleClass(null);
      } else {
        alert(data.error || 'Lên lịch thất bại');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi mạng');
    } finally {
      setQuickScheduleSubmitting(false);
    }
  };

  const handleDeleteClass = async (cls: ClassEntity) => {
    const studentCount = (cls.studentIds || []).length;
    const confirmMsg = studentCount > 0 
      ? `CẢNH BÁO: Lớp "${cls.name}" (${cls.id}) hiện có ${studentCount} học viên. Bạn có chắc chắn muốn xóa lớp học này không?`
      : `Bạn có chắc chắn muốn xóa lớp "${cls.name}" (${cls.id}) không?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/classes?id=${cls.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Đã xóa lớp học thành công');
        await loadData();
      } else {
        alert(data.error || 'Xóa lớp học thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const loadData = async () => {
    try {
      const [clsRes, tcRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/teachers'),
      ]);
      const clsData = await clsRes.json();
      const tcData = await tcRes.json();
      setClasses(clsData.classes || []);
      setTeachers(tcData.teachers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openClassStudentsModal = async (cls: ClassEntity) => {
    setSelectedClass(cls);
    setModalLoading(true);
    setActionMessage(null);
    setStudentSearch('');
    try {
      const allRes = await fetch('/api/students?limit=400');
      const allData = await allRes.json();
      const studentsList: Student[] = allData.students || [];
      setAllStudents(studentsList);
      setEnrolledStudents(studentsList.filter(s => (cls.studentIds || []).includes(s.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  };

  const handleEnrollAction = async (studentId: string, action: 'ENROLL' | 'UNENROLL') => {
    if (!selectedClass) return;
    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass.id,
          studentId,
          action,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        let updatedIds = [...(selectedClass.studentIds || [])];
        if (action === 'ENROLL') {
          updatedIds.push(studentId);
        } else {
          updatedIds = updatedIds.filter(id => id !== studentId);
        }
        const updatedCls = { ...selectedClass, studentIds: updatedIds };
        setSelectedClass(updatedCls);
        setEnrolledStudents(allStudents.filter(s => updatedIds.includes(s.id)));
        setClasses(prev => prev.map(c => c.id === updatedCls.id ? updatedCls : c));
      } else {
        alert(data.error || 'Thao tác thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const handleSaveMeetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeetClass) return;
    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: editingMeetClass.id,
          meetingLink: meetLinkInput,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || 'Đã cập nhật Link Phòng Discord thành công!');
        setClasses(prev => prev.map(c => c.id === editingMeetClass.id ? { ...c, meetingLink: meetLinkInput } : c));
        setEditingMeetClass(null);
      } else {
        alert(data.error || 'Cập nhật link thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const handleChangeTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingTeacherClass || !newTeacherId) return;

    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: changingTeacherClass.id,
          teacherId: newTeacherId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message);
        setClasses(prev => prev.map(c => c.id === changingTeacherClass.id ? { ...c, teacherId: newTeacherId } : c));
        setChangingTeacherClass(null);
      } else {
        alert(data.error || 'Đổi giáo viên thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const teacherMap: Record<string, string> = {};
  teachers.forEach(t => {
    teacherMap[t.id] = t.name;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filtered = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.teacherId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacherMap[c.teacherId] && teacherMap[c.teacherId].toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.roomId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedClasses = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const availableToAdd = allStudents
    .filter(s => !(selectedClass?.studentIds || []).includes(s.id))
    .filter(s => 
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.phone.includes(studentSearch)
    )
    .slice(0, 10);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header 
        title="Quản lý Lớp học & Lịch đào tạo" 
        subtitle="Quản lý thời khóa biểu custom, thứ học và tùy chọn chạy xuyên suốt" 
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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên lớp, GV, môn, phòng..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs text-slate-500 font-medium">
              Tổng cộng: <span className="font-bold text-slate-800">{classes.length}</span> lớp học
            </div>
            <button
              onClick={(e) => {
                            e.stopPropagation();
                setNewClassFormData(prev => ({
                  ...prev,
                  teacherId: prev.teacherId || teachers[0]?.id || ''
                }));
                setShowAddClassModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <Plus size={15} /> Thêm Lớp Học Mới
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedClasses.map(cls => {
            const classStartTime = cls.startTime || '18:30';
            const classEndTime = cls.endTime || '20:30';
            const isRecurringClass = cls.isRecurring !== false;

            return (
              <div 
                key={cls.id} 
                onClick={() => openClassStudentsModal(cls)}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 hover:border-indigo-500 hover:shadow-md transition-all space-y-4 flex flex-col justify-between cursor-pointer group"
                title="Bấm vào lớp để xem danh sách học viên"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {cls.code} • {cls.id}
                        </span>
                        {isRecurringClass && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-0.5">
                            <RefreshCw size={10} className="shrink-0" /> Chạy xuyên suốt
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-base mt-1.5 line-clamp-1">{cls.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {cls.status}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls); }}
                        title="Xóa lớp học"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    {/* Khung giờ & Thứ học trực quan */}
                    <div className="flex items-center justify-between bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      <span className="text-amber-900 font-bold flex items-center gap-1">
                        <Clock size={13} className="text-amber-600" /> {classStartTime} - {classEndTime}
                      </span>
                      <span className="text-amber-800 font-semibold bg-white/80 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                        Thứ {formatScheduleDays(cls.scheduleDays)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5"><UserCheck size={14} /> Giảng viên:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">{teacherMap[cls.teacherId] || cls.teacherId}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({cls.teacherId})</span>
                        <button
                          onClick={() => {
                            setChangingTeacherClass(cls);
                            setNewTeacherId(cls.teacherId);
                          }}
                          title="Đổi giáo viên phụ trách"
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition ml-1"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5"><Users size={14} /> Sĩ số hiện tại:</span>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{(cls.studentIds || []).length} học viên</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5"><Video size={14} className="text-emerald-600" /> Lớp học Online:</span>
                      <div className="flex items-center gap-1">
                        {cls.meetingLink ? (
                          <a 
                            href={cls.meetingLink} 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          className="font-bold text-emerald-600 hover:text-emerald-700 underline text-xs inline-flex items-center gap-1 whitespace-nowrap truncate max-w-[150px]"
                          >
                            Phòng học Discord <ExternalLink size={11} className="shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa gắn link</span>
                        )}
                        <button
                          onClick={() => {
                            setEditingMeetClass(cls);
                            setMeetLinkInput(cls.meetingLink || `https://discord.com/channels/edu-center/room-${cls.id.toLowerCase()}`);
                          }}
                          title="Đổi link Phòng học Discord"
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded ml-1"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openClassStudentsModal(cls); }}
                    className="flex-1 py-2 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap truncate min-w-0 shadow-2xs"
                  >
                    <Users size={14} className="shrink-0" /> <span className="truncate">Quản lý học viên ({(cls.studentIds || []).length})</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickScheduleClass(cls);
                      const now = new Date();
                      setQuickScheduleStartDate(now.toISOString().split('T')[0]);
                      const later = new Date(now);
                      later.setMonth(later.getMonth() + 3);
                      setQuickScheduleEndDate(later.toISOString().split('T')[0]);
                      setQuickScheduleStartTime(cls.startTime || '18:30');
                      setQuickScheduleEndTime(cls.endTime || '20:30');
                      setQuickScheduleDays(cls.scheduleDays && cls.scheduleDays.length > 0 ? cls.scheduleDays : [2, 4, 6]);
                      setQuickScheduleOverwrite(false);
                    }}
                    className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Lên lịch học nhanh cho lớp này"
                  >
                    <Calendar size={14} className="text-emerald-600" /> Lên lịch
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChangingTeacherClass(cls);
                      setNewTeacherId(cls.teacherId);
                    }}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap shrink-0"
                    title="Đổi giáo viên phụ trách"
                  >
                    <Edit3 size={14} /> Đổi GV
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Thanh điều khiển phân trang */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mt-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            itemLabel="lớp học"
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </div>
      </main>

      {/* Modal Thêm Lớp Học Mới */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Thêm Lớp Học Mới</h3>
                  <p className="text-xs text-slate-400">Khởi tạo lớp học với khung giờ và thứ học tùy chọn linh hoạt</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddClassModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên lớp học *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Lập trình Python & Web Fullstack"
                    value={newClassFormData.name}
                    onChange={e => setNewClassFormData({ ...newClassFormData, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mã lớp / Code môn *</label>
                  <input
                    type="text"
                    required
                    placeholder="MTH101, PROG201..."
                    value={newClassFormData.code}
                    onChange={e => setNewClassFormData({ ...newClassFormData, code: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bộ môn / Chuyên môn *</label>
                  <input
                    type="text"
                    required
                    placeholder="Toán, Tiếng Anh, Vẽ Manga, Lập trình..."
                    value={newClassFormData.subject}
                    onChange={e => setNewClassFormData({ ...newClassFormData, subject: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giảng viên phụ trách *</label>
                  <select
                    required
                    value={newClassFormData.teacherId}
                    onChange={e => setNewClassFormData({ ...newClassFormData, teacherId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs bg-white font-semibold"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.id} - {t.name} ({t.specialty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BỘ CHỌN THỜI GIAN CUSTOM (BỎ HOÀN TOÀN DROPDOWN CA 1, 2, 3...) */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <Clock size={15} className="text-amber-700" /> Cấu hình khung giờ học của lớp:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Giờ bắt đầu: *</label>
                    <input
                      type="time"
                      required
                      value={newClassFormData.startTime}
                      onChange={e => setNewClassFormData({ ...newClassFormData, startTime: e.target.value })}
                      className="w-full p-2 border border-amber-200 rounded-lg bg-white font-mono font-bold text-xs text-slate-800 focus:outline-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Giờ kết thúc: *</label>
                    <input
                      type="time"
                      required
                      value={newClassFormData.endTime}
                      onChange={e => setNewClassFormData({ ...newClassFormData, endTime: e.target.value })}
                      className="w-full p-2 border border-amber-200 rounded-lg bg-white font-mono font-bold text-xs text-slate-800 focus:outline-indigo-600"
                    />
                  </div>
                </div>
              </div>



              {/* Lịch học trong tuần: Thứ 2 đến Chủ Nhật */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Lịch học trong tuần:</label>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 6, 7, 8].map(day => {
                    const isSelected = newClassFormData.scheduleDays.includes(day);
                    const label = day === 8 ? 'Chủ Nhật' : `Thứ ${day}`;
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          let updated = [...newClassFormData.scheduleDays];
                          if (isSelected) {
                            if (updated.length > 1) {
                              updated = updated.filter(d => d !== day);
                            }
                          } else {
                            updated.push(day);
                            updated.sort((a, b) => a - b);
                          }
                          setNewClassFormData({ ...newClassFormData, scheduleDays: updated });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Link phòng Discord / Phòng Online</label>
                <input
                  type="url"
                  placeholder="https://discord.com/channels/edu-center/room-..."
                  value={newClassFormData.meetingLink}
                  onChange={e => setNewClassFormData({ ...newClassFormData, meetingLink: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs font-mono"
                />
              </div>

              {/* Tùy chọn Chạy xuyên suốt liên tục qua các ngày/tuần về sau */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border border-purple-200 rounded-xl space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClassFormData.isRecurring}
                    onChange={e => {
                      const val = e.target.checked;
                      setNewClassFormData({
                        ...newClassFormData,
                        isRecurring: val,
                        autoGenerateSchedule: val ? true : newClassFormData.autoGenerateSchedule,
                      });
                    }}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <span className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                    <RefreshCw size={14} className="text-purple-600" /> ☑️ Chạy xuyên suốt liên tục qua các ngày/tuần về sau
                  </span>
                </label>

                {newClassFormData.isRecurring && (
                  <div className="pl-6.5 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <label className="font-semibold text-slate-700 text-xs">Khoảng thời gian sinh lịch sẵn:</label>
                      <select
                        value={newClassFormData.generateMonths}
                        onChange={e => setNewClassFormData({ ...newClassFormData, generateMonths: Number(e.target.value) })}
                        className="p-1.5 border border-purple-200 rounded-lg bg-white font-semibold text-xs text-purple-900 focus:outline-indigo-600"
                      >
                        <option value={1}>🗓️ 1 tháng tới</option>
                        <option value={2}>🗓️ 2 tháng tới</option>
                        <option value={3}>🗓️ 3 tháng tới (Khuyến nghị)</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Hệ thống tự động sinh lịch học định kỳ theo đúng khung giờ <strong className="text-slate-700">{newClassFormData.startTime} - {newClassFormData.endTime}</strong> cho tất cả các ngày khớp với thứ đã chọn.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Lưu Lớp Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa Link Phòng học Discord / Room Link */}
      {editingMeetClass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <Video size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Cấu hình Link Phòng học Discord</h3>
                  <p className="text-xs text-slate-500">Lớp: <strong className="text-slate-800">{editingMeetClass.name}</strong> ({editingMeetClass.id})</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingMeetClass(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMeetLink} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Link phòng học Phòng học Discord *</label>
                <input
                  type="url"
                  required
                  placeholder="https://discord.com/channels/edu-center/room-..."
                  value={meetLinkInput}
                  onChange={e => setMeetLinkInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-emerald-600 text-xs font-mono"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] leading-relaxed">
                💡 Toàn bộ lớp học là 100% Online. Link Phòng học Discord này sẽ được cập nhật tự động đến thời khóa biểu của Giảng viên và Học viên trong lớp.
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMeetClass(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Cập nhật Link Phòng Discord
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đổi Giáo Viên */}
      {changingTeacherClass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">Đổi Giáo Viên Quản Lý Lớp</h3>
              <button 
                onClick={() => setChangingTeacherClass(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangeTeacher} className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-500">Lớp học:</span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">
                  {changingTeacherClass.name} ({changingTeacherClass.id})
                </div>
                <div className="text-slate-500 mt-1">
                  Giáo viên hiện tại: <strong className="text-slate-800">{teacherMap[changingTeacherClass.teacherId] || changingTeacherClass.teacherId}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Chọn giáo viên thay thế:</label>
                <select
                  value={newTeacherId}
                  onChange={e => setNewTeacherId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-indigo-600 text-xs bg-white"
                >
                  {teachers.map(tc => (
                    <option key={tc.id} value={tc.id}>
                      {tc.id} - {tc.name} ({tc.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] leading-relaxed">
                💡 Hệ thống sẽ tự động chuyển phân công lớp, cập nhật lại lịch giảng dạy cho giáo viên mới và ghi nhật ký hệ thống.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangingTeacherClass(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quản lý học viên */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {selectedClass.code}
                  </span>
                  <h3 className="font-bold text-slate-800 text-lg">{selectedClass.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Giảng viên: <strong className="text-slate-700">{teacherMap[selectedClass.teacherId] || selectedClass.teacherId}</strong> • Khung giờ: <strong className="text-slate-700">{selectedClass.startTime || '18:30'} - {selectedClass.endTime || '20:30'}</strong> • Sĩ số: <strong className="text-indigo-600">{(selectedClass.studentIds || []).length}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedClass(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Danh sách đã có trong lớp */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Học viên đang học ({enrolledStudents.length})</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {enrolledStudents.map(st => (
                    <div key={st.id} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-800">{st.id} - {st.name}</div>
                        <div className="text-[11px] text-slate-400">{st.phone} • {st.email}</div>
                      </div>
                      <button
                        onClick={() => handleEnrollAction(st.id, 'UNENROLL')}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Xoá học viên khỏi lớp"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {enrolledStudents.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">Lớp hiện chưa có học viên nào.</div>
                  )}
                </div>
              </div>

              {/* Thêm học viên mới */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Thêm học viên vào lớp này
                </h4>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã ST, tên hoặc SĐT để thêm..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-indigo-600"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {availableToAdd.map(st => (
                    <div key={st.id} className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-800">{st.id} - {st.name}</div>
                        <div className="text-[11px] text-slate-400">{st.phone} • Hiện học {(st.enrolledClassIds || []).length} lớp</div>
                      </div>
                      <button
                        onClick={() => handleEnrollAction(st.id, 'ENROLL')}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <Plus size={13} /> Thêm vào lớp
                      </button>
                    </div>
                  ))}
                  {studentSearch && availableToAdd.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">Không tìm thấy học viên phù hợp.</div>
                  )}
                  {!studentSearch && (
                    <div className="p-3 text-center text-[11px] text-slate-400">Nhập từ khóa để tra cứu trong 400 học viên.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClass(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lên lịch học nhanh cho lớp */}
      {quickScheduleClass && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Lên Lịch Nhanh Cho Lớp Học</h3>
                  <p className="text-xs text-slate-500">{quickScheduleClass.name} ({quickScheduleClass.id})</p>
                </div>
              </div>
              <button 
                onClick={() => setQuickScheduleClass(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickSchedule} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Khung giờ lớp:</span>
                  <strong className="text-amber-800 font-mono">{quickScheduleStartTime} - {quickScheduleEndTime}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thứ học:</span>
                  <strong className="text-indigo-600">Thứ {formatScheduleDays(quickScheduleDays)}</strong>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    required
                    value={quickScheduleStartTime}
                    onChange={e => setQuickScheduleStartTime(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    required
                    value={quickScheduleEndTime}
                    onChange={e => setQuickScheduleEndTime(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    required
                    value={quickScheduleStartDate}
                    onChange={e => setQuickScheduleStartDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    required
                    value={quickScheduleEndDate}
                    onChange={e => setQuickScheduleEndDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => {
                    const base = quickScheduleStartDate ? new Date(quickScheduleStartDate) : new Date();
                    base.setMonth(base.getMonth() + 1);
                    setQuickScheduleEndDate(base.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-bold border border-emerald-200 cursor-pointer"
                >
                  +1 Tháng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const base = quickScheduleStartDate ? new Date(quickScheduleStartDate) : new Date();
                    base.setMonth(base.getMonth() + 3);
                    setQuickScheduleEndDate(base.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded text-xs font-bold border border-teal-200 cursor-pointer"
                >
                  +3 Tháng
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={quickScheduleOverwrite}
                  onChange={e => setQuickScheduleOverwrite(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-slate-700 font-semibold text-xs">Ghi đè lịch nếu ngày đó đã có ca của lớp</span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickScheduleClass(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={quickScheduleSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {quickScheduleSubmitting ? 'Đang tạo...' : <><Sparkles size={14} /> Sinh Lịch Ngay</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
