'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, AttendanceBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getTodayDateStr } from '@/utils/date';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Receipt,
  ArrowRight,
  Video,
  ExternalLink,
  Sparkles,
  Inbox,
  MapPin,
  UserCheck,
} from 'lucide-react';

const WEEKDAY_LABELS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

function formatDayLabel(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const [, mm, dd] = dateStr.split('-');
  return `${WEEKDAY_LABELS[d.getDay()]}, ${dd}/${mm}`;
}

function money(v?: number) {
  if (!v) return '0đ';
  return v.toLocaleString('vi-VN') + 'đ';
}

export default function StudentDashboardPage() {
  const { currentUser, isReady } = useApp();
  const toast = useToast();
  const [student, setStudent] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [finance, setFinance] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [badges, setBadges] = useState<Record<string, { status: string; time: string }>>({});

  const todayStr = getTodayDateStr();

  const nowMinutes = () => {
    const s = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Saigon',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const toMinutes = (t: string) => {
    const [h, m] = (t || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;
    (async () => {
      const safe = async (url: string) => {
        try {
          const r = await fetch(url);
          return r.ok ? await r.json() : {};
        } catch {
          return {};
        }
      };
      const [st, sc, at, fi, rq] = await Promise.all([
        safe(`/api/students?id=${currentUser.id}`),
        safe(`/api/schedule?studentId=${currentUser.id}`),
        safe(`/api/attendance?studentId=${currentUser.id}`),
        safe(`/api/finance?studentId=${currentUser.id}&summary=true`),
        safe(`/api/requests?studentId=${currentUser.id}`),
      ]);
      setStudent(st.student || null);
      setSlots(sc.slots || []);
      setAttendance(at.records || []);
      setFinance(fi || null);
      setRequests(rq.requests || []);
      setLoading(false);
    })();
  }, [isReady, currentUser]);

  const todaySlots = useMemo(
    () =>
      slots
        .filter((s) => s.date === todayStr && s.status !== 'Đã hủy')
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [slots, todayStr]
  );

  const upcoming = useMemo(
    () =>
      slots
        .filter((s) => s.date > todayStr && s.status !== 'Đã hủy')
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
        .slice(0, 5),
    [slots, todayStr]
  );

  const checkinState = (slot: any) => {
    const fresh = badges[slot.id];
    if (fresh) return { type: 'done' as const, status: fresh.status, time: fresh.time };
    const rec = attendance.find((a) => a.scheduleSlotId === slot.id && a.studentId === currentUser?.id);
    if (rec) return { type: 'done' as const, status: rec.status, time: rec.checkinTime || '' };
    const now = nowMinutes();
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    const overnight = start > end;
    const open = overnight ? now >= start || now <= end : now >= start && now <= end;
    if (open) return { type: 'open' as const };
    if (now < start) return { type: 'closed' as const, reason: 'Chưa tới giờ' };
    return { type: 'closed' as const, reason: 'Ca đã kết thúc' };
  };

  const handleCheckin = async (slot: any) => {
    if (!currentUser?.id || checking) return;
    setChecking(slot.id);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STUDENT_CHECKIN',
          studentId: currentUser.id,
          scheduleSlotId: slot.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const rec = data.record;
        setBadges((p) => ({ ...p, [slot.id]: { status: rec?.status || 'Có mặt', time: rec?.checkinTime || '' } }));
        toast.success(`Điểm danh xong: ${rec?.status || 'Có mặt'}${rec?.checkinTime ? ' lúc ' + rec.checkinTime : ''}`);
      } else if (res.status === 409 && data.record) {
        setBadges((p) => ({
          ...p,
          [slot.id]: { status: data.record.status, time: data.record.checkinTime || '' },
        }));
        toast.info('Ca này đã được điểm danh rồi.');
      } else {
        toast.error(data.error || 'Điểm danh chưa thành công, bạn thử lại nhé.');
      }
    } catch {
      toast.error('Không kết nối được, bạn thử lại nhé.');
    } finally {
      setChecking(null);
    }
  };

  const present = attendance.filter((a) => a.status === 'Có mặt').length;
  const late = attendance.filter((a) => a.status === 'Đi muộn').length;
  const absent = attendance.filter((a) => a.status.includes('Vắng')).length;
  const attended = present + late;
  const rate = attendance.length ? Math.round((attended / attendance.length) * 100) : 100;
  const remaining = student?.remainingSessions ?? 0;
  const debt = finance?.totalDebt ?? 0;

  const pendingRequests = requests.filter((r) => r.status === 'CHỜ_DUYỆT');

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Trang chủ" subtitle={`Chào ${currentUser?.name || ''}, đây là việc học hôm nay`} />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* Ca học hôm nay */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-foreground">Ca học hôm nay</h2>
              <span className="text-[12px] text-muted-foreground">{formatDayLabel(todayStr)}</span>
            </div>

            {loading ? (
              <div className="h-28 rounded-card bg-muted animate-pulse" />
            ) : todaySlots.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<CalendarDays size={24} />}
                  title="Hôm nay bạn không có ca học"
                  description="Xem thời khoá biểu để biết các buổi sắp tới."
                  action={
                    <Button variant="secondary" onClick={undefined}>
                      <Link href="/student/schedule">Xem thời khoá biểu</Link>
                    </Button>
                  }
                />
              </Card>
            ) : (
              todaySlots.map((slot) => {
                const state = checkinState(slot);
                return (
                  <Card key={slot.id} className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone="primary">Ca {slot.shiftId}</Badge>
                        <span className="text-[13px] font-semibold text-muted-foreground tabular">
                          {slot.startTime} – {slot.endTime}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground mt-1.5">{slot.subject}</h3>
                      <div className="flex items-center gap-3 mt-1 text-[13px] text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} /> {slot.roomId || 'Chưa xếp phòng'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserCheck size={13} /> GV {slot.teacherId}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {state.type === 'done' ? (
                        <AttendanceBadge status={state.status as any} />
                      ) : state.type === 'open' ? (
                        <Button
                          size="lg"
                          loading={checking === slot.id}
                          icon={<CheckCircle2 size={18} />}
                          onClick={() => handleCheckin(slot)}
                        >
                          Điểm danh
                        </Button>
                      ) : (
                        <div className="text-right">
                          <Button size="lg" disabled>
                            Điểm danh
                          </Button>
                          <p className="text-[11px] text-muted-foreground mt-1 text-center">{state.reason}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </section>

          {/* Số liệu học tập */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Tỉ lệ đi học"
              value={`${rate}%`}
              hint={`${attended} buổi có mặt`}
              tone="success"
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              label="Buổi đã học"
              value={attended}
              hint="Tính khi có mặt hoặc đi muộn"
              tone="primary"
              icon={<Sparkles size={18} />}
            />
            <StatCard
              label="Buổi vắng"
              value={absent}
              hint={late ? `${late} buổi đi muộn` : 'Không có buổi muộn'}
              tone="warning"
              icon={<Clock size={18} />}
            />
            <StatCard
              label="Buổi còn lại"
              value={remaining}
              hint="Trừ dần khi học xong ca"
              tone="info"
              icon={<CalendarDays size={18} />}
            />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Buổi học sắp tới */}
            <Card className="lg:col-span-2">
              <CardHeader
                icon={<CalendarDays size={18} />}
                title="Buổi học sắp tới"
                subtitle="Lịch học của bạn trong những ngày tới"
                action={
                  <Link
                    href="/student/schedule"
                    className="text-[13px] font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1"
                  >
                    Toàn bộ <ArrowRight size={14} />
                  </Link>
                }
              />
              {upcoming.length === 0 ? (
                <EmptyState icon={<CalendarDays size={22} />} title="Chưa có buổi học nào sắp tới" />
              ) : (
                <div className="divide-y divide-line -mx-1">
                  {upcoming.map((slot) => (
                    <div key={slot.id} className="py-3 px-1 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-field bg-primary-soft text-primary-ink flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold leading-none">
                          {WEEKDAY_LABELS[new Date(slot.date + 'T00:00:00').getDay()].replace('Thứ ', 'T')}
                        </span>
                        <span className="text-[13px] font-extrabold leading-tight tabular">
                          {slot.date.slice(8)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-foreground truncate">{slot.subject}</p>
                        <p className="text-[12px] text-muted-foreground tabular">
                          {slot.startTime} – {slot.endTime} • {slot.roomId || 'Chưa xếp phòng'}
                        </p>
                      </div>
                      {slot.meetingLink && (
                        <a
                          href={slot.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-pill bg-primary-soft text-primary-ink text-[12px] font-semibold hover:bg-primary/15 transition"
                        >
                          <Video size={14} /> Vào lớp <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Học phí + đơn từ */}
            <div className="space-y-5">
              <Card>
                <CardHeader icon={<Receipt size={18} />} title="Học phí" />
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-muted-foreground">Còn phải nộp</span>
                    <span className={`text-lg font-extrabold tabular ${debt > 0 ? 'text-danger' : 'text-success'}`}>
                      {money(debt)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-muted-foreground">Buổi còn lại</span>
                    <span className="text-lg font-extrabold tabular text-foreground">{remaining}</span>
                  </div>
                  <Link href="/student/tuition" className="block">
                    <Button variant="secondary" fullWidth icon={<Receipt size={16} />}>
                      Chọn gói & thanh toán
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card>
                <CardHeader
                  icon={<Inbox size={18} />}
                  title="Đơn từ"
                  action={
                    <Link href="/student/requests" className="text-[13px] font-semibold text-primary">
                      Gửi đơn
                    </Link>
                  }
                />
                {pendingRequests.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">Bạn không có đơn nào đang chờ duyệt.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 p-2.5 rounded-field bg-muted">
                        <span className="text-[13px] font-medium text-foreground truncate">
                          {r.type === 'XIN_NGHI' ? 'Xin nghỉ học' : 'Đổi lịch'}
                        </span>
                        <Badge tone="warning">Chờ duyệt</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
