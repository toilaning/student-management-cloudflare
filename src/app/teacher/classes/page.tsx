'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassEntity } from '@/types/classroom';
import { TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sheet } from '@/components/ui/Sheet';
import { SegmentedControl } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import {
  BookOpen,
  Users,
  MapPin,
  Clock,
  UserCheck,
  Sparkles,
  ChevronRight,
  Plus,
  Calendar,
  Video,
  ExternalLink,
  Phone,
} from 'lucide-react';

export default function TeacherClassesPage() {
  const { currentUser, isReady } = useApp();
  const toast = useToast();
  const [allClasses, setAllClasses] = useState<ClassEntity[]>([]);
  const [selectedClassForView, setSelectedClassForView] = useState<ClassEntity | null>(null);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [loading, setLoading] = useState(true);
  const [claimingClassId, setClaimingClassId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'MINE' | 'AVAILABLE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [clsRes, shiftRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/shifts'),
      ]);
      const clsData = await clsRes.json();
      const shiftData = await shiftRes.json();

      setAllClasses(clsData.classes || []);
      if (shiftData.shifts) setShifts(shiftData.shifts);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải dữ liệu lớp học.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, isReady]);

  const handleOpenClassStudents = async (cls: ClassEntity) => {
    setSelectedClassForView(cls);
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/students?limit=1000');
      const data = await res.json();
      const allSt = data.students || [];
      const enrolled = allSt.filter((s: any) => (cls.studentIds || []).includes(s.id)).map((s: any, i: number) => ({ ...s, _idx: i + 1 }));
      setClassStudents(enrolled);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải danh sách học viên.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClaimShift = async (cls: ClassEntity) => {
    if (!currentUser?.id) return;
    setClaimingClassId(cls.id);
    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: cls.id,
          teacherId: currentUser.id,
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã nhận ca dạy lớp ${cls.name} (${cls.code}) thành công.`);
        await loadData();
      } else {
        toast.error(data.error || 'Nhận ca dạy thất bại.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi kết nối khi nhận ca dạy.');
    } finally {
      setClaimingClassId(null);
    }
  };

  const shiftMap = useMemo(
    () => new Map<number, TimeShift>(shifts.map((s) => [s.id, s])),
    [shifts]
  );

  const myClasses = useMemo(
    () => allClasses.filter((c) => c.teacherId === currentUser?.id),
    [allClasses, currentUser?.id]
  );

  const availableClasses = useMemo(
    () =>
      allClasses.filter(
        (c) => !c.teacherId || c.teacherId === 'CHUA_PHAN_CONG' || c.teacherId === ''
      ),
    [allClasses]
  );

  const displayedClasses = useMemo(() => {
    return allClasses.filter((c) => {
      if (filterMode === 'MINE' && c.teacherId !== currentUser?.id) return false;
      if (
        filterMode === 'AVAILABLE' &&
        c.teacherId &&
        c.teacherId !== 'CHUA_PHAN_CONG' &&
        c.teacherId !== ''
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesCode = c.code?.toLowerCase().includes(q);
        const matchesSubj = c.subject?.toLowerCase().includes(q);
        const matchesRoom = c.roomId?.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesSubj || matchesRoom;
      }
      return true;
    });
  }, [allClasses, filterMode, currentUser?.id, searchTerm]);

  // Columns cho DataTable danh sách học sinh trong Sheet
  const studentColumns: Column<any>[] = [
    {
      key: 'stt',
      header: '#',
      align: 'center',
      className: 'w-10 text-muted-foreground font-mono text-xs',
      render: (st: any) => st._idx ?? '',
    },
    {
      key: 'student',
      header: 'Học viên',
      render: (st) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={st.name} size={32} />
          <div className="min-w-0">
            <div className="font-bold text-foreground text-xs sm:text-sm truncate">{st.name}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{st.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'info',
      header: 'Thông tin học tập',
      render: (st) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div>
            Mục tiêu:{' '}
            <strong className="text-foreground">
              {st.targetUniversity === 'KHAC'
                ? st.customUniversity || 'Khác'
                : st.targetUniversity || 'HAU'}
            </strong>
            {' • '}
            {st.examBlock === 'KHOI_H' ? 'Khối H' : 'Khối V'}
            {' • '}
            {st.gradeLevel || 'Lớp 12'}
          </div>
          {st.homeTown && <div>Quê quán: {st.homeTown}</div>}
          {st.otherNotes && (
            <div className="text-[11px] text-foreground bg-warning-soft px-1.5 py-0.5 rounded-field inline-block">
              {st.otherNotes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'sessions',
      header: 'Buổi còn',
      align: 'center',
      render: (st) => (
        <Badge tone="info" className="tabular font-bold">
          Còn {st.remainingSessions ?? 12} buổi
        </Badge>
      ),
    },
    {
      key: 'contact',
      header: 'Liên hệ',
      align: 'right',
      render: (st) => (
        <div className="text-xs font-mono text-muted-foreground flex items-center justify-end gap-1">
          {st.phone ? (
            <>
              <Phone size={11} className="text-muted-foreground" />
              <span>{st.phone}</span>
            </>
          ) : (
            '–'
          )}
        </div>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title="Lớp học & ca dạy"
          subtitle={`Giảng viên ${currentUser?.name || ''} (${currentUser?.id || ''}) • Quản lý các lớp phụ trách`}
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* Hàng KPI thống kê */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              label="Ca bạn đang dạy"
              value={myClasses.length}
              hint="Lớp phụ trách trực tiếp"
              icon={<UserCheck size={18} />}
              tone="primary"
            />
            <StatCard
              label="Ca mở chờ nhận"
              value={availableClasses.length}
              hint="Có thể nhận dạy thêm"
              icon={<Sparkles size={18} />}
              tone="success"
            />
            <StatCard
              label="Tổng số lớp mở"
              value={allClasses.length}
              hint="Toàn bộ lớp trung tâm"
              icon={<BookOpen size={18} />}
              tone="info"
            />
          </div>

          {/* Thanh lọc & tìm kiếm */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <SegmentedControl
              value={filterMode}
              onChange={setFilterMode}
              items={[
                { value: 'ALL', label: 'Tất cả ca học', count: allClasses.length },
                { value: 'MINE', label: 'Ca bạn đang dạy', count: myClasses.length },
                { value: 'AVAILABLE', label: 'Ca mở / Trống', count: availableClasses.length },
              ]}
            />

            <div className="w-full sm:w-72">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm tên lớp, mã, môn học..."
              />
            </div>
          </div>

          {/* Danh sách thẻ lớp học */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-card bg-muted animate-pulse border border-line" />
              ))}
            </div>
          ) : displayedClasses.length === 0 ? (
            <Card>
              <EmptyState
                icon={<BookOpen size={28} />}
                title="Không tìm thấy lớp học nào"
                description={
                  searchTerm
                    ? 'Không có lớp học nào khớp với từ khóa tìm kiếm.'
                    : 'Không có lớp học nào trong danh mục này.'
                }
                action={
                  searchTerm ? (
                    <Button variant="secondary" size="sm" onClick={() => setSearchTerm('')}>
                      Xóa tìm kiếm
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedClasses.map((cls) => {
                const isMine = cls.teacherId === currentUser?.id;
                const isOpen =
                  !cls.teacherId ||
                  cls.teacherId === 'CHUA_PHAN_CONG' ||
                  cls.teacherId === '';
                const shiftInfo = shiftMap.get(cls.shiftId ?? 1);
                const shiftTimeLabel = shiftInfo
                  ? `${shiftInfo.startTime} – ${shiftInfo.endTime}`
                  : 'Theo lịch ca';
                const shiftName = shiftInfo?.name || `Ca ${cls.shiftId}`;

                return (
                  <Card
                    key={cls.id}
                    className={`flex flex-col justify-between transition-all ${
                      isMine ? 'border-primary/40 ring-1 ring-primary/20' : ''
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Tiêu đề thẻ & Huy hiệu trạng thái */}
                      <CardHeader
                        title={cls.name}
                        subtitle={`${cls.code} • ${cls.subject}`}
                        action={
                          isMine ? (
                            <Badge tone="success" dot>
                              Đang dạy
                            </Badge>
                          ) : isOpen ? (
                            <Badge tone="primary" dot>
                              Ca mở
                            </Badge>
                          ) : (
                            <Badge tone="neutral">
                              GV: {cls.teacherId}
                            </Badge>
                          )
                        }
                      />

                      {/* Chi tiết ca học */}
                      <div className="bg-muted rounded-field p-3.5 border border-line space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Clock size={13} className="text-primary" /> Ca & khung giờ:
                          </span>
                          <span className="font-semibold text-foreground tabular">
                            {shiftName} ({shiftTimeLabel})
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <MapPin size={13} className="text-primary" /> Phòng học:
                          </span>
                          <span className="font-semibold text-foreground">{cls.roomId}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Calendar size={13} className="text-primary" /> Lịch trong tuần:
                          </span>
                          <span className="font-semibold text-foreground">
                            Thứ {cls.scheduleDays.join(', ')}
                          </span>
                        </div>

                        {/* Bấm xem sĩ số / danh sách học sinh */}
                        <button
                          type="button"
                          onClick={() => handleOpenClassStudents(cls)}
                          className="flex items-center justify-between w-full pt-2 border-t border-line hover:text-primary transition cursor-pointer text-left"
                          title="Bấm để xem danh sách học viên"
                        >
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <Users size={13} className="text-primary" /> Sĩ số đăng ký:
                          </span>
                          <span className="font-bold text-primary-ink bg-primary-soft px-2 py-0.5 rounded-pill text-xs flex items-center gap-1 tabular">
                            {cls.studentIds.length} học viên <ChevronRight size={12} />
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Nút thao tác dưới thẻ */}
                    <div className="pt-4 border-t border-line mt-4">
                      {isMine ? (
                        <Link href={`/teacher/attendance?classId=${cls.id}`} className="block w-full">
                          <Button
                            variant="primary"
                            size="md"
                            fullWidth
                            icon={<UserCheck size={16} />}
                          >
                            Sổ điểm danh & Đánh giá
                          </Button>
                        </Link>
                      ) : isOpen ? (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          loading={claimingClassId === cls.id}
                          onClick={() => handleClaimShift(cls)}
                          icon={<Plus size={16} />}
                        >
                          Nhận ca dạy này
                        </Button>
                      ) : (
                        <div className="w-full py-2.5 bg-muted text-muted-foreground rounded-pill text-xs font-semibold text-center border border-line">
                          Đã phân công: <strong className="text-foreground">{cls.teacherId}</strong>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {/* Sheet xem danh sách học sinh của lớp */}
        <Sheet
          isOpen={!!selectedClassForView}
          onClose={() => setSelectedClassForView(null)}
          title={selectedClassForView ? `Danh sách học viên: ${selectedClassForView.name}` : ''}
          description={
            selectedClassForView
              ? `Mã lớp: ${selectedClassForView.code} • Môn: ${selectedClassForView.subject} • Phòng: ${selectedClassForView.roomId} • Thứ ${selectedClassForView.scheduleDays?.join(', ')}`
              : ''
          }
          size="lg"
          footer={
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
              <span className="text-xs text-muted-foreground">
                Xem chi tiết từng buổi và điểm danh tại mục <strong>Sổ điểm danh</strong>.
              </span>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSelectedClassForView(null)}
              >
                Đóng
              </Button>
            </div>
          }
        >
          {selectedClassForView && (
            <div className="space-y-4 py-1">
              {selectedClassForView.meetingLink && (
                <div className="flex items-center justify-between p-3 rounded-field bg-primary-soft text-primary-ink text-xs font-semibold">
                  <span>Phòng học trực tuyến Discord/Meet</span>
                  <a
                    href={selectedClassForView.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                  >
                    <Video size={13} /> Vào phòng online <ExternalLink size={11} />
                  </a>
                </div>
              )}

              <DataTable
                columns={studentColumns}
                rows={classStudents}
                rowKey={(st) => st.id}
                loading={loadingStudents}
                emptyTitle="Lớp chưa có học viên nào đăng ký"
                emptyDescription="Hiện chưa có học viên nào được ghi danh vào lớp học này."
                emptyIcon={<Users size={24} />}
                renderMobile={(st) => (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Avatar name={st.name} size={32} />
                      <div className="min-w-0 space-y-1">
                        <div className="font-bold text-foreground text-sm leading-tight truncate">
                          {st.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground">{st.id}</div>
                        <div className="text-xs text-muted-foreground">
                          Mục tiêu:{' '}
                          {st.targetUniversity === 'KHAC'
                            ? st.customUniversity || 'Khác'
                            : st.targetUniversity || 'HAU'}{' '}
                          • {st.examBlock === 'KHOI_H' ? 'Khối H' : 'Khối V'}
                        </div>
                        {st.phone && (
                          <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Phone size={10} />
                            <span>{st.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge tone="info" className="tabular shrink-0">
                      Còn {st.remainingSessions ?? 12} buổi
                    </Badge>
                  </div>
                )}
              />
            </div>
          )}
        </Sheet>
      </div>
    </RoleGuard>
  );
}
