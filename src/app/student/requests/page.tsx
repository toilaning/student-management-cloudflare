'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassRequest, RequestType, ScheduleSlot, TIME_SHIFTS } from '@/types/schedule';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { Plus, Calendar, Clock, AlertCircle } from 'lucide-react';

export default function StudentRequestsPage() {
  const { currentUser, isReady } = useApp();
  const toast = useToast();
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
      setErrorMsg('Vui lòng chọn ca học cần xin nghỉ.');
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
          type: 'XIN_NGHI',
          reason: form.reason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setForm(prev => ({ ...prev, reason: '', targetScheduleSlotId: '' }));
        toast.success('Đã gửi đơn xin nghỉ thành công.');
        await loadData();
      } else {
        toast.error(data.error || 'Có lỗi xảy ra khi gửi đơn.');
        setErrorMsg(data.error || 'Có lỗi xảy ra khi gửi đơn.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi mạng hoặc hệ thống.');
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
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          title="Đơn Xin Nghỉ Học" 
          subtitle="Gửi yêu cầu xin nghỉ trực tiếp tới Ban Quản lý và Giảng viên phụ trách môn học" 
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          <PageHeader
            title="Đơn xin nghỉ học"
            subtitle={`Tổng số đơn đã nộp: ${requests.length} đơn`}
            action={
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setErrorMsg('');
                  if (studentClasses.length > 0 && !form.classId) {
                    const initialClassId = studentClasses[0].id;
                    const initialSlots = myScheduleSlots.filter((s) => s.classId === initialClassId);
                    setForm((prev) => ({
                      ...prev,
                      classId: initialClassId,
                      scheduleSlotId: initialSlots[0]?.id || '',
                    }));
                  }
                  setShowModal(true);
                }}
              >
                Tạo đơn
              </Button>
            }
          />

          {/* Requests List */}
          <div className="space-y-4">
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 rounded-card bg-muted animate-pulse border border-line" />
                ))}
              </div>
            )}
            {!loading && requests.map(req => {
              const origSlot = findSlotInfo(req.scheduleSlotId);

              return (
                <Card key={req.id} className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                    <div className="flex items-center gap-3">
                      <Badge tone="warning">
                        Đơn xin nghỉ học
                      </Badge>
                      <span className="font-bold text-foreground text-sm">
                        Mã đơn: {req.id} • Lớp {req.classId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular">
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      {req.status === 'ĐÃ_DUYỆT' ? (
                        <Badge tone="success" dot>Đã duyệt</Badge>
                      ) : req.status === 'TỪ_CHỐI' ? (
                        <Badge tone="danger" dot>Từ chối</Badge>
                      ) : (
                        <Badge tone="warning" dot>Chờ duyệt</Badge>
                      )}
                    </div>
                  </div>

                  {/* Chi tiết ca học liên quan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted rounded-field p-3 border border-line text-xs">
                    <div>
                      <span className="font-semibold text-muted-foreground">Ca xin nghỉ:</span>
                      {origSlot ? (
                        <div className="mt-1 text-foreground font-medium">
                          <span className="flex items-center gap-1.5 tabular font-semibold">
                            <Calendar size={13} className="text-primary shrink-0" />
                            {formatSlotDate(origSlot.date)}
                            <span className="text-muted-foreground font-normal">•</span>
                            <Clock size={13} className="text-primary shrink-0" />
                            {getShiftLabel(origSlot.shiftId)}
                          </span>
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            Môn: {origSlot.subject} | Phòng: {origSlot.roomId} | GV: {origSlot.teacherId}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-foreground font-medium">Mã ca: {req.scheduleSlotId}</div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5">
                    <p className="p-3 bg-background rounded-field border border-line italic text-foreground">
                      &ldquo;{req.reason}&rdquo;
                    </p>

                    {req.reviewNote && (
                      <div className="mt-2 text-xs flex items-center gap-2 p-2.5 bg-muted rounded-field border border-line">
                        <span className="font-semibold text-muted-foreground">
                          Phản hồi ({req.reviewedBy || 'Ban Quản trị / Giảng viên'}):
                        </span>
                        <span className="font-medium text-foreground">{req.reviewNote}</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {!loading && requests.length === 0 && (
              <Card>
                <EmptyState
                  title="Chưa có đơn xin nghỉ nào"
                  description="Bạn chưa gửi đơn xin nghỉ học nào trong hệ thống."
                  action={
                    <Button
                      variant="secondary"
                      icon={<Plus size={16} />}
                      onClick={() => setShowModal(true)}
                    >
                      Tạo đơn mới
                    </Button>
                  }
                />
              </Card>
            )}
          </div>

          {/* Sheet tạo đơn mới */}
          <Sheet
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Gửi đơn xin nghỉ học"
            description="Gửi yêu cầu xin nghỉ tới ban quản lý và giảng viên phụ trách."
            footer={
              <div className="flex items-center justify-end gap-2.5 w-full">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  form="student-request-form"
                  variant="primary"
                  loading={submitting}
                  disabled={!form.scheduleSlotId}
                >
                  Gửi đơn
                </Button>
              </div>
            }
          >
            <form id="student-request-form" onSubmit={handleSubmit} className="space-y-4 py-2">
              {errorMsg && (
                <div className="p-3 bg-danger-soft border border-danger/30 rounded-field text-danger text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Field label="Loại yêu cầu">
                <div className="p-3 rounded-field border border-primary bg-primary-soft text-primary-ink text-[13px] font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Đơn xin nghỉ học
                </div>
              </Field>

              <Field label="Lớp học" required>
                <Select
                  value={form.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  required
                >
                  {studentClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id}) - Môn: {c.subject || c.name} - GV: {c.teacherId}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Ca học xin nghỉ" required>
                {availableMySlots.length > 0 ? (
                  <Select
                    value={form.scheduleSlotId}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        scheduleSlotId: e.target.value,
                        targetScheduleSlotId: '',
                      }));
                    }}
                    required
                  >
                    {availableMySlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {formatSlotDate(slot.date)} - [{getShiftLabel(slot.shiftId)}] - Phòng: {slot.roomId} - GV: {slot.teacherId}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="p-3 bg-warning-soft rounded-field border border-warning/30 text-foreground text-xs">
                    Lớp này hiện chưa có lịch học nào được sắp xếp.
                  </div>
                )}
              </Field>

              <Field label="Lý do chi tiết" required>
                <Textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Nêu rõ lý do xin nghỉ..."
                  required
                />
              </Field>
            </form>
          </Sheet>
        </main>
      </div>
    </RoleGuard>
  );
}
