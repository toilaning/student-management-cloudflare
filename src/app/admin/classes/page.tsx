'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassEntity } from '@/types/classroom';
import { Student } from '@/types/student';
import { Teacher } from '@/types/teacher';
import {
  Card,
  Button,
  Badge,
  Field,
  Input,
  Select,
  Sheet,
  useToast,
  EmptyState,
  SearchInput,
  Pager,
} from '@/components/ui';
import {
  BookOpen,
  Users,
  UserCheck,
  Plus,
  Trash2,
  Edit3,
  Video,
  ExternalLink,
  Calendar,
  Clock,
  RotateCw,
  Sparkles,
} from 'lucide-react';

export default function AdminClassesPage() {
  const toast = useToast();

  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [addClassLoading, setAddClassLoading] = useState(false);
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

  // Sheet Lên lịch nhanh cho riêng 1 lớp
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

  // Sheet quản lý học viên của lớp
  const [selectedClass, setSelectedClass] = useState<ClassEntity | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Sheet đổi giáo viên quản lý lớp
  const [changingTeacherClass, setChangingTeacherClass] = useState<ClassEntity | null>(null);
  const [changingTeacherLoading, setChangingTeacherLoading] = useState(false);
  const [newTeacherId, setNewTeacherId] = useState('');

  // Sheet sửa link phòng học trực tuyến
  const [editingMeetClass, setEditingMeetClass] = useState<ClassEntity | null>(null);
  const [savingMeetLink, setSavingMeetLink] = useState(false);
  const [meetLinkInput, setMeetLinkInput] = useState('');

  // Sheet xác nhận xoá lớp
  const [classToDelete, setClassToDelete] = useState<ClassEntity | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  const formatScheduleDays = (days?: number[]) => {
    if (!days || days.length === 0) return 'Chưa xếp thứ';
    const sorted = [...days].sort((a, b) => a - b);
    return sorted.map((d) => (d === 8 ? 'CN' : 'T' + d)).join(', ');
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
    } catch (e: any) {
      toast.error(e?.message || 'Không thể tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassFormData.name || !newClassFormData.code || !newClassFormData.subject || !newClassFormData.teacherId) {
      toast.error('Vui lòng điền đủ Tên lớp, Mã môn, Chuyên môn và Giảng viên');
      return;
    }

    setAddClassLoading(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClassFormData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Tạo lớp học mới thành công');
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
        toast.error(data.error || 'Tạo lớp học thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi kết nối mạng');
    } finally {
      setAddClassLoading(false);
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
        toast.success(
          'Đã lên lịch cho lớp ' + quickScheduleClass.name + ': tạo mới ' + data.summary.createdCount + ' ca'
        );
        setQuickScheduleClass(null);
      } else {
        toast.error(data.error || 'Lên lịch thất bại');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi mạng');
    } finally {
      setQuickScheduleSubmitting(false);
    }
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeletingClass(true);
    try {
      const res = await fetch('/api/classes?id=' + classToDelete.id, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Đã xoá lớp học thành công');
        setClassToDelete(null);
        await loadData();
      } else {
        toast.error(data.error || 'Xoá lớp học thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi mạng');
    } finally {
      setIsDeletingClass(false);
    }
  };

  const openClassStudentsModal = async (cls: ClassEntity) => {
    setSelectedClass(cls);
    setModalLoading(true);
    setStudentSearch('');
    try {
      const allRes = await fetch('/api/students?limit=400');
      const allData = await allRes.json();
      const studentsList: Student[] = allData.students || [];
      setAllStudents(studentsList);
      setEnrolledStudents(studentsList.filter((s) => (cls.studentIds || []).includes(s.id)));
    } catch (e: any) {
      toast.error(e?.message || 'Không thể tải danh sách học viên');
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
        toast.success(data.message || (action === 'ENROLL' ? 'Đã thêm học viên vào lớp' : 'Đã xoá học viên khỏi lớp'));
        let updatedIds = [...(selectedClass.studentIds || [])];
        if (action === 'ENROLL') {
          updatedIds.push(studentId);
        } else {
          updatedIds = updatedIds.filter((id) => id !== studentId);
        }
        const updatedCls = { ...selectedClass, studentIds: updatedIds };
        setSelectedClass(updatedCls);
        setEnrolledStudents(allStudents.filter((s) => updatedIds.includes(s.id)));
        setClasses((prev) => prev.map((c) => (c.id === updatedCls.id ? updatedCls : c)));
      } else {
        toast.error(data.error || 'Thao tác thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi mạng');
    }
  };

  const handleSaveMeetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeetClass) return;
    setSavingMeetLink(true);
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
        toast.success(data.message || 'Đã cập nhật liên kết phòng học trực tuyến');
        setClasses((prev) =>
          prev.map((c) => (c.id === editingMeetClass.id ? { ...c, meetingLink: meetLinkInput } : c))
        );
        setEditingMeetClass(null);
      } else {
        toast.error(data.error || 'Cập nhật liên kết thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi mạng');
    } finally {
      setSavingMeetLink(false);
    }
  };

  const handleChangeTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingTeacherClass || !newTeacherId) return;
    setChangingTeacherLoading(true);
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
        toast.success(data.message || 'Đã đổi giáo viên quản lý lớp');
        setClasses((prev) =>
          prev.map((c) => (c.id === changingTeacherClass.id ? { ...c, teacherId: newTeacherId } : c))
        );
        setChangingTeacherClass(null);
      } else {
        toast.error(data.error || 'Đổi giáo viên thất bại');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi mạng');
    } finally {
      setChangingTeacherLoading(false);
    }
  };

  const teacherMap: Record<string, string> = {};
  teachers.forEach((t) => {
    teacherMap[t.id] = t.name;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.teacherId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (teacherMap[c.teacherId] && teacherMap[c.teacherId].toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.roomId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedClasses = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const availableToAdd = allStudents
    .filter((s) => !(selectedClass?.studentIds || []).includes(s.id))
    .filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.phone.includes(studentSearch)
    )
    .slice(0, 10);

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title="Quản lý lớp học & lịch đào tạo"
          subtitle="Quản lý thời khóa biểu, lịch học và phân công giảng viên"
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* Thanh tìm kiếm và nút khởi tạo */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <SearchInput
              placeholder="Tìm theo mã lớp, môn học, giảng viên..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full sm:w-96"
            />

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-xs text-muted-foreground font-medium hidden md:block">
                Tổng số: <span className="font-bold font-mono text-foreground">{classes.length}</span> lớp học
              </div>
              <Button
                variant="primary"
                icon={<Plus size={15} />}
                onClick={() => {
                  setNewClassFormData((prev) => ({
                    ...prev,
                    teacherId: prev.teacherId || teachers[0]?.id || '',
                  }));
                  setShowAddClassModal(true);
                }}
              >
                Khởi tạo lớp mới
              </Button>
            </div>
          </div>

          {/* Lưới danh sách lớp học */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-card bg-card border border-line p-5 space-y-3">
                  <div className="h-5 w-24 bg-muted rounded-pill animate-pulse" />
                  <div className="h-6 w-3/4 bg-muted rounded-field animate-pulse" />
                  <div className="h-16 bg-muted rounded-field animate-pulse" />
                  <div className="h-10 bg-muted rounded-field animate-pulse" />
                </div>
              ))}
            </div>
          ) : paginatedClasses.length === 0 ? (
            <Card padded>
              <EmptyState
                icon={<BookOpen size={32} />}
                title="Không tìm thấy lớp học"
                description="Thử thay đổi từ khóa tìm kiếm hoặc khởi tạo lớp học mới."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedClasses.map((cls) => {
                const classStartTime = cls.startTime || '18:30';
                const classEndTime = cls.endTime || '20:30';
                const isRecurringClass = cls.isRecurring !== false;

                return (
                  <Card
                    key={cls.id}
                    padded
                    className="flex flex-col justify-between transition-all duration-150 group"
                  >
                    <div className="space-y-3">
                      {/* Tiêu đề & huy hiệu */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-field bg-muted text-foreground border border-line">
                              {cls.code} • {cls.id}
                            </span>
                            {isRecurringClass && (
                              <Badge tone="info" className="text-[11px]">
                                <RotateCw size={10} className="mr-1" />
                                Định kỳ
                              </Badge>
                            )}
                          </div>
                          <h3
                            onClick={() => openClassStudentsModal(cls)}
                            className="font-bold text-foreground text-base line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                            title="Bấm để xem danh sách học viên"
                          >
                            {cls.name}
                          </h3>
                          <p className="text-[12px] text-muted-foreground truncate">
                            {cls.subject || 'Đồ án kiến trúc / Mỹ thuật'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Badge tone="success">{cls.status || 'Đang mở'}</Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger-soft"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClassToDelete(cls);
                            }}
                            aria-label="Xóa lớp học"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Khung giờ & thứ học */}
                      <div className="bg-muted p-2.5 rounded-field border border-line flex items-center justify-between text-xs">
                        <span className="font-bold font-mono text-foreground flex items-center gap-1.5">
                          <Clock size={13} className="text-muted-foreground" />
                          {classStartTime} – {classEndTime}
                        </span>
                        <span className="font-medium text-foreground bg-card px-2 py-0.5 rounded-pill border border-line">
                          Thứ {formatScheduleDays(cls.scheduleDays)}
                        </span>
                      </div>

                      {/* Chi tiết phụ: Giảng viên, Sĩ số, Discord */}
                      <div className="space-y-1.5 text-xs text-muted-foreground border-t border-line pt-2.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <UserCheck size={13} /> Giảng viên:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground truncate max-w-[120px]">
                              {teacherMap[cls.teacherId] || cls.teacherId}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setChangingTeacherClass(cls);
                                setNewTeacherId(cls.teacherId);
                              }}
                              className="text-subtle-foreground hover:text-foreground cursor-pointer p-0.5"
                              title="Đổi giáo viên phụ trách"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Users size={13} /> Sĩ số:
                          </span>
                          <span className="font-mono font-semibold text-foreground">
                            {(cls.studentIds || []).length} học viên
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-line/60 pt-1.5">
                          <span className="flex items-center gap-1.5">
                            <Video size={13} className="text-primary" /> Phòng trực tuyến:
                          </span>
                          <div className="flex items-center gap-1">
                            {cls.meetingLink ? (
                              <a
                                href={cls.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline max-w-[120px] truncate"
                                title={cls.meetingLink}
                              >
                                <span>Vào phòng</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            ) : (
                              <span className="text-subtle-foreground text-[11px] italic">Chưa gắn link</span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMeetClass(cls);
                                setMeetLinkInput(cls.meetingLink || 'https://discord.gg/' + cls.id.toLowerCase());
                              }}
                              className="text-subtle-foreground hover:text-foreground cursor-pointer p-0.5"
                              title="Chỉnh sửa liên kết phòng học"
                            >
                              <Edit3 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động ở chân thẻ */}
                    <div className="pt-3 border-t border-line flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Users size={13} />}
                        className="flex-1"
                        onClick={() => openClassStudentsModal(cls)}
                      >
                        Quản lý ({(cls.studentIds || []).length})
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Calendar size={13} />}
                        onClick={() => {
                          setQuickScheduleClass(cls);
                          const now = new Date();
                          setQuickScheduleStartDate(now.toISOString().split('T')[0]);
                          const later = new Date(now);
                          later.setMonth(later.getMonth() + 3);
                          setQuickScheduleEndDate(later.toISOString().split('T')[0]);
                          setQuickScheduleStartTime(cls.startTime || '18:30');
                          setQuickScheduleEndTime(cls.endTime || '20:30');
                          setQuickScheduleDays(
                            cls.scheduleDays && cls.scheduleDays.length > 0 ? cls.scheduleDays : [2, 4, 6]
                          );
                          setQuickScheduleOverwrite(false);
                        }}
                        title="Lên lịch học cho lớp"
                      >
                        Lịch
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Edit3 size={13} />}
                        onClick={() => {
                          setChangingTeacherClass(cls);
                          setNewTeacherId(cls.teacherId);
                        }}
                        title="Đổi giáo viên phụ trách"
                      >
                        Đổi GV
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Phân trang */}
          {filtered.length > pageSize && (
            <Card padded>
              <Pager
                page={currentPage}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </Card>
          )}
        </main>

        {/* Sheet Thêm Lớp Học Mới */}
        <Sheet
          isOpen={showAddClassModal}
          onClose={() => setShowAddClassModal(false)}
          title="Thêm lớp học mới"
          description="Khởi tạo lớp học với khung giờ và thứ học linh hoạt"
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setShowAddClassModal(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={addClassLoading}
                onClick={handleCreateClass}
              >
                Lưu lớp học
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tên lớp học" required>
                <Input
                  required
                  placeholder="Ví dụ: Vẽ hình họa & Tượng thạch cao"
                  value={newClassFormData.name}
                  onChange={(e) => setNewClassFormData({ ...newClassFormData, name: e.target.value })}
                />
              </Field>

              <Field label="Mã lớp / Mã môn" required>
                <Input
                  required
                  placeholder="VHH101, BCM201..."
                  value={newClassFormData.code}
                  onChange={(e) => setNewClassFormData({ ...newClassFormData, code: e.target.value })}
                  className="font-mono uppercase"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Bộ môn / Chuyên môn" required>
                <Input
                  required
                  placeholder="Hình họa, Bố cục màu, Mỹ thuật..."
                  value={newClassFormData.subject}
                  onChange={(e) => setNewClassFormData({ ...newClassFormData, subject: e.target.value })}
                />
              </Field>

              <Field label="Giảng viên phụ trách" required>
                <Select
                  required
                  value={newClassFormData.teacherId}
                  onChange={(e) => setNewClassFormData({ ...newClassFormData, teacherId: e.target.value })}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} - {t.name} ({t.specialty})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Cấu hình khung giờ học */}
            <div className="p-3.5 bg-muted rounded-card border border-line space-y-3">
              <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                <Clock size={14} className="text-muted-foreground" /> Khung giờ học của lớp:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Giờ bắt đầu" required>
                  <Input
                    type="time"
                    required
                    value={newClassFormData.startTime}
                    onChange={(e) => setNewClassFormData({ ...newClassFormData, startTime: e.target.value })}
                    className="font-mono font-bold"
                  />
                </Field>
                <Field label="Giờ kết thúc" required>
                  <Input
                    type="time"
                    required
                    value={newClassFormData.endTime}
                    onChange={(e) => setNewClassFormData({ ...newClassFormData, endTime: e.target.value })}
                    className="font-mono font-bold"
                  />
                </Field>
              </div>
            </div>

            {/* Thứ học trong tuần */}
            <Field label="Lịch học trong tuần">
              <div className="flex flex-wrap gap-2 pt-1">
                {[2, 3, 4, 5, 6, 7, 8].map((day) => {
                  const isSelected = newClassFormData.scheduleDays.includes(day);
                  const label = day === 8 ? 'Chủ nhật' : 'Thứ ' + day;
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => {
                        let updated = [...newClassFormData.scheduleDays];
                        if (isSelected) {
                          if (updated.length > 1) {
                            updated = updated.filter((d) => d !== day);
                          }
                        } else {
                          updated.push(day);
                          updated.sort((a, b) => a - b);
                        }
                        setNewClassFormData({ ...newClassFormData, scheduleDays: updated });
                      }}
                      className={'px-3 py-1.5 rounded-pill text-xs font-semibold transition cursor-pointer border ' + (
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-primary'
                          : 'bg-card text-muted-foreground border-line hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Liên kết phòng học trực tuyến (Discord / Meet)">
              <Input
                type="url"
                placeholder="https://discord.gg/..."
                value={newClassFormData.meetingLink}
                onChange={(e) => setNewClassFormData({ ...newClassFormData, meetingLink: e.target.value })}
                className="font-mono"
              />
            </Field>

            {/* Tùy chọn lặp định kỳ */}
            <div className="p-3.5 bg-muted rounded-card border border-line space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newClassFormData.isRecurring}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setNewClassFormData({
                      ...newClassFormData,
                      isRecurring: val,
                      autoGenerateSchedule: val ? true : newClassFormData.autoGenerateSchedule,
                    });
                  }}
                  className="w-4 h-4 text-primary rounded border-line focus:ring-primary"
                />
                <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <RotateCw size={13} /> Chạy định kỳ qua các tuần tiếp theo
                </span>
              </label>

              {newClassFormData.isRecurring && (
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground">Khoảng thời gian sinh lịch:</label>
                    <Select
                      value={newClassFormData.generateMonths}
                      onChange={(e) =>
                        setNewClassFormData({
                          ...newClassFormData,
                          generateMonths: Number(e.target.value),
                        })
                      }
                      className="h-9 w-40 text-xs"
                    >
                      <option value={1}>1 tháng tới</option>
                      <option value={2}>2 tháng tới</option>
                      <option value={3}>3 tháng tới</option>
                    </Select>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Hệ thống sẽ tự động tạo ca học định kỳ vào đúng khung giờ và thứ đã chọn.
                  </p>
                </div>
              )}
            </div>
          </form>
        </Sheet>

        {/* Sheet Sửa Link Phòng Học Trực Tuyến */}
        <Sheet
          isOpen={!!editingMeetClass}
          onClose={() => setEditingMeetClass(null)}
          title="Liên kết phòng học trực tuyến"
          description={
            editingMeetClass
              ? 'Lớp: ' + editingMeetClass.name + ' (' + editingMeetClass.id + ')'
              : undefined
          }
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setEditingMeetClass(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={savingMeetLink}
                onClick={handleSaveMeetLink}
              >
                Cập nhật liên kết
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveMeetLink} className="space-y-4">
            <Field label="Đường dẫn phòng học (Discord / Google Meet)" required>
              <Input
                type="url"
                required
                placeholder="https://discord.gg/..."
                value={meetLinkInput}
                onChange={(e) => setMeetLinkInput(e.target.value)}
                className="font-mono text-xs"
              />
            </Field>

            <div className="p-3 bg-muted border border-line rounded-card text-xs text-muted-foreground leading-relaxed">
              Liên kết phòng học sẽ tự động hiển thị trên thời khóa biểu và giao diện vào lớp của học viên và giảng viên.
            </div>
          </form>
        </Sheet>

        {/* Sheet Đổi Giáo Viên Quản Lý Lớp */}
        <Sheet
          isOpen={!!changingTeacherClass}
          onClose={() => setChangingTeacherClass(null)}
          title="Đổi giáo viên quản lý lớp"
          description={
            changingTeacherClass
              ? 'Lớp: ' + changingTeacherClass.name + ' (' + changingTeacherClass.id + ')'
              : undefined
          }
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setChangingTeacherClass(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={changingTeacherLoading}
                onClick={handleChangeTeacher}
              >
                Lưu thay đổi
              </Button>
            </div>
          }
        >
          <form onSubmit={handleChangeTeacher} className="space-y-4">
            <div className="bg-muted p-3 rounded-card border border-line text-xs space-y-1">
              <div className="text-muted-foreground">Giáo viên hiện tại:</div>
              <div className="font-bold text-foreground">
                {changingTeacherClass
                  ? teacherMap[changingTeacherClass.teacherId] || changingTeacherClass.teacherId
                  : ''}
              </div>
            </div>

            <Field label="Chọn giáo viên thay thế" required>
              <Select
                value={newTeacherId}
                onChange={(e) => setNewTeacherId(e.target.value)}
              >
                {teachers.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.id} - {tc.name} ({tc.specialty})
                  </option>
                ))}
              </Select>
            </Field>

            <p className="text-xs text-muted-foreground">
              Hệ thống sẽ cập nhật phân công lớp và lịch giảng dạy cho giáo viên mới.
            </p>
          </form>
        </Sheet>

        {/* Sheet Quản Lý Học Viên Trong Lớp */}
        <Sheet
          isOpen={!!selectedClass}
          onClose={() => setSelectedClass(null)}
          title="Quản lý học viên"
          description={
            selectedClass
              ? selectedClass.name + ' (' + selectedClass.code + ') • Sĩ số: ' + (selectedClass.studentIds || []).length
              : undefined
          }
          size="lg"
          footer={
            <div className="flex items-center justify-end w-full">
              <Button variant="secondary" onClick={() => setSelectedClass(null)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Danh sách học viên đang học */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Học viên đang học ({enrolledStudents.length})
                </span>
              </div>

              <div className="border border-line rounded-card overflow-hidden divide-y divide-line max-h-52 overflow-y-auto">
                {modalLoading ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Đang tải danh sách...</div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Lớp hiện chưa có học viên nào.
                  </div>
                ) : (
                  enrolledStudents.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-foreground">
                          {st.id} - {st.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {st.phone || '—'} {st.email ? '• ' + st.email : ''}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-danger h-8 w-8"
                        onClick={() => handleEnrollAction(st.id, 'UNENROLL')}
                        title="Xoá học viên khỏi lớp"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Thêm học viên mới vào lớp */}
            <div className="space-y-3 pt-3 border-t border-line">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">
                Thêm học viên vào lớp
              </span>

              <SearchInput
                placeholder="Tìm mã, họ tên hoặc số điện thoại..."
                value={studentSearch}
                onChange={setStudentSearch}
              />

              <div className="border border-line rounded-card overflow-hidden divide-y divide-line max-h-48 overflow-y-auto">
                {availableToAdd.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {st.id} - {st.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {st.phone || '—'} • Đang học {(st.enrolledClassIds || []).length} lớp
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Plus size={13} />}
                      onClick={() => handleEnrollAction(st.id, 'ENROLL')}
                    >
                      Thêm vào lớp
                    </Button>
                  </div>
                ))}
                {studentSearch && availableToAdd.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Không tìm thấy học viên phù hợp.
                  </div>
                )}
                {!studentSearch && (
                  <div className="p-3 text-center text-[11px] text-subtle-foreground">
                    Nhập từ khóa để tìm kiếm học viên cần thêm vào lớp.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Sheet>

        {/* Sheet Lên Lịch Nhanh Cho Lớp */}
        <Sheet
          isOpen={!!quickScheduleClass}
          onClose={() => setQuickScheduleClass(null)}
          title="Lên lịch học cho lớp"
          description={
            quickScheduleClass
              ? quickScheduleClass.name + ' (' + quickScheduleClass.id + ')'
              : undefined
          }
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setQuickScheduleClass(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={quickScheduleSubmitting}
                icon={<Sparkles size={14} />}
                onClick={handleQuickSchedule}
              >
                Sinh lịch ngay
              </Button>
            </div>
          }
        >
          <form onSubmit={handleQuickSchedule} className="space-y-4">
            <div className="bg-muted p-3 rounded-card border border-line space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Khung giờ lớp:</span>
                <span className="font-mono font-bold text-foreground">
                  {quickScheduleStartTime} - {quickScheduleEndTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thứ học:</span>
                <span className="font-semibold text-foreground">
                  Thứ {formatScheduleDays(quickScheduleDays)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Giờ bắt đầu" required>
                <Input
                  type="time"
                  required
                  value={quickScheduleStartTime}
                  onChange={(e) => setQuickScheduleStartTime(e.target.value)}
                  className="font-mono font-bold"
                />
              </Field>
              <Field label="Giờ kết thúc" required>
                <Input
                  type="time"
                  required
                  value={quickScheduleEndTime}
                  onChange={(e) => setQuickScheduleEndTime(e.target.value)}
                  className="font-mono font-bold"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Từ ngày" required>
                <Input
                  type="date"
                  required
                  value={quickScheduleStartDate}
                  onChange={(e) => setQuickScheduleStartDate(e.target.value)}
                />
              </Field>
              <Field label="Đến ngày" required>
                <Input
                  type="date"
                  required
                  value={quickScheduleEndDate}
                  onChange={(e) => setQuickScheduleEndDate(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Chọn nhanh:</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const base = quickScheduleStartDate ? new Date(quickScheduleStartDate) : new Date();
                  base.setMonth(base.getMonth() + 1);
                  setQuickScheduleEndDate(base.toISOString().split('T')[0]);
                }}
              >
                +1 tháng
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const base = quickScheduleStartDate ? new Date(quickScheduleStartDate) : new Date();
                  base.setMonth(base.getMonth() + 3);
                  setQuickScheduleEndDate(base.toISOString().split('T')[0]);
                }}
              >
                +3 tháng
              </Button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-field bg-muted border border-line">
              <input
                type="checkbox"
                checked={quickScheduleOverwrite}
                onChange={(e) => setQuickScheduleOverwrite(e.target.checked)}
                className="w-4 h-4 text-primary rounded border-line focus:ring-primary"
              />
              <span className="text-foreground font-medium text-xs">
                Ghi đè lịch nếu ngày đó đã có ca của lớp
              </span>
            </label>
          </form>
        </Sheet>

        {/* Sheet Xác Nhận Xoá Lớp Học */}
        <Sheet
          isOpen={!!classToDelete}
          onClose={() => setClassToDelete(null)}
          title="Xác nhận xoá lớp học"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setClassToDelete(null)}>
                Hủy
              </Button>
              <Button
                variant="danger"
                loading={isDeletingClass}
                onClick={confirmDeleteClass}
              >
                Xác nhận xoá
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Bạn có chắc chắn muốn xoá lớp{' '}
              <strong className="text-foreground">{classToDelete?.name}</strong> (
              <span className="font-mono">{classToDelete?.id}</span>)?
            </p>
            {classToDelete && (classToDelete.studentIds || []).length > 0 && (
              <div className="p-3 bg-danger-soft border border-danger/20 rounded-field text-xs text-danger font-medium">
                Cảnh báo: Lớp học hiện có {(classToDelete.studentIds || []).length} học viên đang ghi danh.
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Thao tác này sẽ xoá thông tin lớp học khỏi hệ thống.
            </p>
          </div>
        </Sheet>
      </div>
    </RoleGuard>
  );
}

