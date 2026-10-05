'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ClassEntity } from '@/types/classroom';
import { TimeShift, TIME_SHIFTS } from '@/types/schedule';
import { getClassTimeRange } from '@/utils/schedule';
import { cn } from '@/lib/cn';
import {
  BookOpen,
  Users,
  UserCheck,
  Check,
  Plus,
  AlertCircle,
  Clock,
  Calendar,
  MapPin,
  Video,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export default function StudentClassesPage() {
  const { currentUser, isReady } = useApp();
  const toast = useToast();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [shifts, setShifts] = useState<TimeShift[]>(TIME_SHIFTS);
  const [student, setStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  // Map classId -> ca mới mà HS muốn đổi sang (shift id)
  const [targetShiftByClass, setTargetShiftByClass] = useState<Record<string, number>>({});
  // Hộp thoại xác nhận đổi ca
  const [pendingChange, setPendingChange] = useState<{
    classId: string;
    className: string;
    targetShiftId: number;
  } | null>(null);

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [clsRes, stRes, shiftRes] = await Promise.all([
        fetch('/api/classes'),
        fetch(`/api/students?id=${currentUser.id}`),
        fetch('/api/shifts'),
      ]);
      const clsData = await clsRes.json();
      const stData = await stRes.json();
      const shiftData = await shiftRes.json();

      setClasses(clsData.classes || []);
      setStudent(stData.student || null);
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

  // Chọn ca học (Ghi danh)
  const handleSelectShift = async (classId: string, className: string) => {
    if (!student || !currentUser?.id) return;
    setActionLoadingId(classId);
    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: currentUser.id,
          action: 'ENROLL',
          actorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Đăng ký thành công ca học lớp "${className}".`);
        await loadData();
      } else {
        toast.error(data.error || 'Đăng ký ca học thất bại.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi kết nối mạng.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Đổi ca sau khi xác nhận trong Sheet
  const handleConfirmShiftChange = async () => {
    if (!pendingChange) return;
    const { classId, targetShiftId } = pendingChange;
    setActionLoadingId(classId);
    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: currentUser?.id || '',
          action: 'CHANGE_SHIFT',
          targetShiftId,
          actorId: currentUser?.id || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Đổi ca thành công.');
        setTargetShiftByClass((prev) => ({ ...prev, [classId]: undefined as any }));
        setPendingChange(null);
        await loadData();
      } else {
        toast.error(data.error || 'Đổi ca thất bại.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi kết nối mạng.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const shiftMap = new Map<number, TimeShift>();
  shifts.forEach((s) => shiftMap.set(s.id, s));

  // --- Hỗ trợ chặn ca trùng giờ phía client (mirror logic backend enroll/route.ts) ---
  const timeToMin = (t?: string): number => {
    if (!t) return 0;
    const [h, m] = t.trim().split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Khoảng giờ thực của 1 lớp: ưu tiên startTime/endTime riêng, fallback theo shiftId -> TIME_SHIFTS.
  const classTimeRange = (cls: ClassEntity): { start: number; end: number } | null => {
    let startTime = cls.startTime;
    let endTime = cls.endTime;
    if (!startTime || !endTime) {
      const sh = shiftMap.get(cls.shiftId ?? 0) || TIME_SHIFTS.find((s) => s.id === cls.shiftId);
      if (!sh) return null;
      startTime = sh.startTime;
      endTime = sh.endTime;
    }
    return { start: timeToMin(startTime), end: timeToMin(endTime) };
  };

  // 2 khoảng giờ có trùng nhau không (xử lý ca qua đêm).
  const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean => {
    let aE = aEnd,
      bE = bEnd;
    if (aStart > aE) aE += 1440;
    if (bStart > bE) bE += 1440;
    return Math.max(aStart, bStart) < Math.min(aE, bE);
  };

  // Ca mục tiêu (shiftId) có trùng giờ với lớp khác mà học sinh đã đăng ký (trên ít nhất 1 ngày chung) không.
  const shiftConflictsWithEnrolled = (fromClass: ClassEntity, targetShiftId: number): boolean => {
    const targetShift = shiftMap.get(targetShiftId) || TIME_SHIFTS.find((s) => s.id === targetShiftId);
    if (!targetShift) return false;

    // Giờ của ca mục tiêu trên LỚP ĐỘC LẬP (cùng subject) sẽ thừa hưởng giờ ca đó.
    const targetStart = timeToMin(targetShift.startTime);
    const targetEnd = timeToMin(targetShift.endTime);
    const targetDays = new Set(fromClass.scheduleDays || []);

    const enrolledIds = student?.enrolledClassIds || [];
    for (const otherId of enrolledIds) {
      const other = classes.find((c) => c.id === otherId);
      if (!other || other.id === fromClass.id) continue;

      // Phải có ít nhất 1 ngày học chung
      const otherDays = new Set(other.scheduleDays || []);
      const hasCommonDay = [...targetDays].some((d) => otherDays.has(d));
      if (!hasCommonDay) continue;

      const otherRange = classTimeRange(other);
      if (!otherRange) continue;

      if (rangesOverlap(targetStart, targetEnd, otherRange.start, otherRange.end)) {
        return true;
      }
    }
    return false;
  };

  // Ca mục tiêu có lớp cùng môn đang chạy không (điều kiện để đổi ca backend tìm thấy lớp đích).
  const hasTargetClassForShift = (fromClass: ClassEntity, targetShiftId: number): boolean => {
    const subject = (fromClass.subject || '').trim().toLowerCase();
    return classes.some(
      (c) =>
        c.id !== fromClass.id &&
        (c.subject || '').trim().toLowerCase() === subject &&
        Number(c.shiftId) === targetShiftId
    );
  };

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.teacherId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const enrolledCount = student?.enrolledClassIds?.length || 0;

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title="Lớp học & ca học"
          subtitle="Đăng ký và đổi ca học các lớp trong kỳ"
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* Thống kê nhanh */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              label="Lớp đã đăng ký"
              value={enrolledCount}
              hint="Số lớp/ca đang theo học"
              tone="primary"
              icon={<BookOpen size={18} />}
            />
            <StatCard
              label="Tổng số lớp"
              value={classes.length}
              hint="Lớp đang mở trong hệ thống"
              tone="info"
              icon={<Calendar size={18} />}
            />
            <StatCard
              label="Lớp đang mở"
              value={classes.filter((c) => c.status === 'Đang mở').length}
              hint="Có thể đăng ký ngay"
              tone="info"
              icon={<Users size={18} />}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          {/* Thanh tìm kiếm */}
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm theo môn học, tên lớp, ca học, giảng viên..."
          />

          {/* Quy ước trạng thái */}
          <div className="flex items-center gap-3 sm:gap-4 text-[13px] font-medium text-muted-foreground flex-wrap bg-card p-3.5 rounded-card border border-line">
            <span className="text-[12px] uppercase tracking-wider font-bold text-subtle-foreground">
              Quy ước:
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Badge tone="success" dot>
                Còn chỗ
              </Badge>
              <span className="text-[12px]">Chọn ca này</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Badge tone="primary" dot>
                Ca của bạn
              </Badge>
              <span className="text-[12px]">Đang theo học</span>
            </span>
          </div>

          {/* Danh sách lớp học */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 rounded-card bg-muted animate-pulse border border-line" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<BookOpen size={24} />}
                title="Không tìm thấy lớp học nào"
                description={
                  searchTerm
                    ? 'Không có kết quả phù hợp với từ khoá tìm kiếm.'
                    : 'Hiện chưa có lớp học nào trong danh sách.'
                }
                action={
                  searchTerm ? (
                    <Button variant="secondary" onClick={() => setSearchTerm('')}>
                      Xoá tìm kiếm
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((cls) => {
                const isEnrolled = student?.enrolledClassIds?.includes(cls.id);
                const currentStudents = cls.studentIds?.length || 0;

                // Giờ riêng của lớp là nguồn chính; ca mẫu chỉ dùng khi lớp chưa đặt giờ.
                const { startTime, endTime } = getClassTimeRange(cls, shifts);
                const shiftTime = `${startTime} – ${endTime}`;

                let badge = null;
                if (isEnrolled) {
                  badge = (
                    <Badge tone="primary" dot>
                      Ca của bạn
                    </Badge>
                  );
                } else {
                  badge = (
                    <Badge tone="success" dot>
                      Còn chỗ
                    </Badge>
                  );
                }

                return (
                  <Card
                    key={cls.id}
                    className={cn(
                      'flex flex-col justify-between transition-all',
                      isEnrolled && 'border-primary ring-1 ring-primary/20 shadow-primary/10'
                    )}
                  >
                    <div className="space-y-3.5">
                      {/* Tiêu đề & huy hiệu */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge tone="info">
                              {cls.code} • {cls.id}
                            </Badge>
                            <Badge tone="primary">{cls.subject}</Badge>
                          </div>
                          <h3 className="text-base font-bold text-foreground mt-2 leading-snug truncate">
                            {cls.name}
                          </h3>
                        </div>
                        {badge}
                      </div>

                      {/* Chi tiết lịch & phòng */}
                      <div className="bg-muted rounded-field p-3.5 border border-line space-y-2 text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Calendar size={14} className="text-primary shrink-0" /> Lịch học:
                          </span>
                          <span className="font-semibold text-foreground">
                            Thứ {cls.scheduleDays.join(', ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Clock size={14} className="text-primary shrink-0" /> Ca & khung giờ:
                          </span>
                          <span className="font-semibold text-foreground tabular">
                            {shiftTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <MapPin size={14} className="text-primary shrink-0" /> Phòng học:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{cls.roomId}</span>
                            {cls.meetingLink && (
                              <a
                                href={cls.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary-soft text-primary-ink text-[11px] font-semibold hover:bg-primary/20 transition"
                                title="Vào phòng Discord"
                              >
                                <Video size={12} />
                                <span>Discord</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <UserCheck size={14} className="text-primary shrink-0" /> Giảng viên:
                          </span>
                          <span className="font-semibold text-foreground">{cls.teacherId}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-line">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Users size={14} className="text-primary shrink-0" /> Sĩ số:
                          </span>
                          <span className="font-semibold text-foreground tabular">
                            {currentStudents} học viên
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thao tác */}
                    <div className="pt-4 border-t border-line mt-4">
                      {isEnrolled ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between p-2.5 rounded-field bg-primary-soft text-primary-ink text-[13px] font-semibold">
                            <span className="flex items-center gap-1.5">
                              <Check size={14} /> Ca đang học: {shiftTime}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1">
                              <RefreshCw size={12} /> Chọn ca muốn chuyển sang:
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {shifts
                                .filter((s) => s.id !== (cls.shiftId ?? 1))
                                .map((s) => {
                                  const conflicts = shiftConflictsWithEnrolled(cls, s.id);
                                  const hasTarget = hasTargetClassForShift(cls, s.id);
                                  const disabledReason = !hasTarget
                                    ? 'Không có lớp cùng môn ở ca này'
                                    : conflicts
                                    ? 'Trùng giờ với lớp khác bạn đang học'
                                    : '';
                                  const selected = targetShiftByClass[cls.id] === s.id;
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      disabled={!!disabledReason || actionLoadingId === cls.id}
                                      onClick={() => {
                                        setTargetShiftByClass((prev) => ({
                                          ...prev,
                                          [cls.id]: prev[cls.id] === s.id ? (undefined as any) : s.id,
                                        }));
                                      }}
                                      title={disabledReason || undefined}
                                      className={cn(
                                        'relative px-2.5 py-2 rounded-field text-[12px] border transition text-left leading-tight cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                                        selected
                                          ? 'border-primary bg-primary-soft text-primary-ink ring-2 ring-primary/20 font-bold'
                                          : 'border-line bg-card text-foreground hover:bg-muted font-medium'
                                      )}
                                    >
                                      {disabledReason && (
                                        <span
                                          className="absolute top-1.5 right-1.5 text-danger"
                                          title={disabledReason}
                                        >
                                          <AlertCircle size={12} />
                                        </span>
                                      )}
                                      <span className="block font-bold">{s.name}</span>
                                      <span className="block font-mono text-[11px] text-muted-foreground tabular">
                                        {s.startTime} – {s.endTime}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                            {shifts.filter((s) => s.id !== (cls.shiftId ?? 1)).length === 0 && (
                              <p className="text-[12px] text-muted-foreground italic">
                                Không có ca nào khác để đổi.
                              </p>
                            )}
                          </div>

                          <Button
                            variant="secondary"
                            size="md"
                            fullWidth
                            loading={actionLoadingId === cls.id}
                            disabled={!targetShiftByClass[cls.id]}
                            onClick={() => {
                              const targetId = targetShiftByClass[cls.id];
                              if (!targetId) {
                                toast.error('Vui lòng chọn ca học mới muốn chuyển sang.');
                                return;
                              }
                              setPendingChange({
                                classId: cls.id,
                                className: cls.name,
                                targetShiftId: targetId,
                              });
                            }}
                            icon={<RefreshCw size={14} />}
                          >
                            Đổi ca
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          loading={actionLoadingId === cls.id}
                          onClick={() => handleSelectShift(cls.id, cls.name)}
                          icon={<Plus size={16} />}
                        >
                          Chọn ca này
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>

        {/* Hộp thoại xác nhận đổi ca */}
        <Sheet
          isOpen={!!pendingChange}
          onClose={() => setPendingChange(null)}
          title="Xác nhận đổi ca học"
          description="Kiểm tra lại thông tin trước khi thực hiện chuyển ca."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setPendingChange(null)}>
                Huỷ
              </Button>
              <Button
                variant="primary"
                loading={!!actionLoadingId}
                onClick={handleConfirmShiftChange}
              >
                Xác nhận đổi ca
              </Button>
            </div>
          }
        >
          {pendingChange && (
            <div className="space-y-3 py-2 text-[13px]">
              <p className="text-foreground">
                Bạn có chắc muốn đổi ca của lớp{' '}
                <strong className="text-primary">{pendingChange.className}</strong> sang{' '}
                <strong>
                  {shiftMap.get(pendingChange.targetShiftId)?.name ||
                    `Ca ${pendingChange.targetShiftId}`}
                </strong>{' '}
                (
                {shiftMap.get(pendingChange.targetShiftId)?.startTime} –{' '}
                {shiftMap.get(pendingChange.targetShiftId)?.endTime}
                )?
              </p>
              <p className="text-[12px] text-muted-foreground">
                Hệ thống sẽ chuyển bạn sang lớp học tương ứng ở ca mới ngay lập tức.
              </p>
            </div>
          )}
        </Sheet>
      </div>
    </RoleGuard>
  );
}
