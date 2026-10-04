'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ScheduleSlot } from '@/types/schedule';
import { getTodayDateStr, formatTimeHM } from '@/utils/date';
import { Clock, LogIn, LogOut, MapPin, CalendarOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Thẻ chấm công ca dạy hôm nay của giáo viên.
 * Giáo viên bấm "Vào ca" khi bắt đầu dạy và "Kết ca" khi kết thúc.
 * Giờ vào/ra được ghi thẳng vào ca học và dùng để tính lương.
 */
export function TeacherCheckinCard({ teacherId }: { teacherId?: string }) {
  const toast = useToast();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = getTodayDateStr();

  const load = useCallback(async () => {
    if (!teacherId) return;
    try {
      setLoading(true);
      const res = await fetch(
        '/api/teacher-checkin?teacherId=' + encodeURIComponent(teacherId) + '&date=' + today
      );
      const data = await res.json();
      const list: ScheduleSlot[] = (data.slots || []).filter(
        (s: ScheduleSlot) => s.status !== 'Đã hủy'
      );
      setSlots(list);
    } catch {
      toast.error('Không tải được ca dạy hôm nay');
    } finally {
      setLoading(false);
    }
  }, [teacherId, today, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (slot: ScheduleSlot, action: 'CHECKIN' | 'CHECKOUT') => {
    if (!teacherId) return;
    setBusyId(slot.id);
    try {
      const res = await fetch('/api/teacher-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, slotId: slot.id, teacherId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated: ScheduleSlot = data.slot;
        setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        if (action === 'CHECKIN') {
          toast.success(
            data.checkinStatus === 'Đi muộn'
              ? 'Đã vào ca lúc ' + updated.checkinTime + ' (đi muộn)'
              : 'Đã vào ca lúc ' + updated.checkinTime
          );
        } else {
          toast.success('Đã kết ca lúc ' + updated.checkoutTime);
        }
      } else {
        toast.error(data.error || 'Chấm công thất bại');
      }
    } catch {
      toast.error('Lỗi mạng, bạn thử lại nhé');
    } finally {
      setBusyId(null);
    }
  };

  const doneCount = slots.filter((s) => s.checkinTime).length;

  return (
    <Card className="space-y-4">
      <CardHeader
        title="Chấm công hôm nay"
        subtitle="Bấm vào ca để ghi giờ vào và giờ ra"
        action={
          !loading && slots.length > 0 ? (
            <Badge tone={doneCount === slots.length ? 'success' : 'warning'} dot>
              {doneCount}/{slots.length} ca
            </Badge>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-card bg-muted animate-pulse" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <EmptyState
          icon={<CalendarOff size={28} />}
          title="Hôm nay không có ca dạy"
          description="Bạn chưa được phân công ca nào trong ngày hôm nay."
        />
      ) : (
        <div className="space-y-2.5">
          {slots.map((slot) => {
            const checkedIn = !!slot.checkinTime;
            const checkedOut = !!slot.checkoutTime;
            const isLate = slot.checkinStatus === 'Đi muộn';
            return (
              <div
                key={slot.id}
                className={cn(
                  'p-3.5 rounded-card border transition-colors',
                  checkedOut
                    ? 'bg-muted/50 border-line'
                    : checkedIn
                    ? 'bg-success-soft/50 border-success/30'
                    : 'bg-card border-line-strong'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-sm">{slot.classId}</span>
                      {slot.subject && (
                        <span className="text-muted-foreground text-[13px] truncate">
                          {slot.subject}
                        </span>
                      )}
                      {checkedIn && (
                        <Badge tone={isLate ? 'warning' : 'success'} dot>
                          {slot.checkinStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-muted-foreground tabular flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {formatTimeHM(slot.startTime)} - {formatTimeHM(slot.endTime)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} /> Phòng {slot.roomId}
                      </span>
                    </div>
                    {(checkedIn || checkedOut) && (
                      <div className="flex items-center gap-3 text-[12px] pt-0.5 tabular">
                        {checkedIn && (
                          <span className="inline-flex items-center gap-1 text-success font-semibold">
                            <LogIn size={12} /> Vào {slot.checkinTime}
                          </span>
                        )}
                        {checkedOut && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold">
                            <LogOut size={12} /> Ra {slot.checkoutTime}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {!checkedIn ? (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<LogIn size={14} />}
                        loading={busyId === slot.id}
                        onClick={() => submit(slot, 'CHECKIN')}
                        fullWidth
                      >
                        Vào ca
                      </Button>
                    ) : !checkedOut ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<LogOut size={14} />}
                        loading={busyId === slot.id}
                        onClick={() => submit(slot, 'CHECKOUT')}
                        fullWidth
                      >
                        Kết ca
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success px-3 h-9">
                        <CheckCircle2 size={15} /> Đã xong
                      </span>
                    )}
                  </div>
                </div>

                {isLate && (
                  <p className="mt-2.5 text-[12px] text-warning font-medium flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Vào ca sau giờ bắt đầu. Ghi chú với quản trị nếu cần.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
