'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { LiveSessionTracker } from '@/components/attendance/LiveSessionTracker';
import { useApp } from '@/context/AppContext';
import { StatCard, Card, CardHeader, Badge, Button, EmptyState } from '@/components/ui';
import { BookOpen, CheckCircle2, Inbox, Clock, CalendarDays, ArrowRight, Headphones } from 'lucide-react';

export default function TeacherDashboardPage() {
  const { currentUser, isReady } = useApp();
  const [classes, setClasses] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !currentUser?.id) return;

    async function load() {
      try {
        const [clsRes, slotsRes, reqRes, payRes] = await Promise.all([
          fetch(`/api/classes?teacherId=${currentUser?.id || ''}`),
          fetch(`/api/schedule?teacherId=${currentUser?.id || ''}`),
          fetch(`/api/requests?teacherId=${currentUser?.id || ''}`),
          Promise.resolve({ json: () => ({ payroll: null }) }),
        ]);

        const clsData = await clsRes.json();
        const slotsData = await slotsRes.json();
        const reqData = await reqRes.json();
        const payData = await payRes.json();

        setClasses(clsData.classes || []);
        setSlots(slotsData.slots || []);
        setRequests(reqData.requests || []);
        setPayroll(payData.payroll || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser, isReady]);

  const completedSlots = slots.filter((s) => s.status === 'Đã hoàn thành').length;
  const pendingRequests = requests.filter((r) => r.status === 'CHỜ_DUYỆT').length;

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title={`Không gian giảng viên: ${currentUser?.name || ''}`}
          subtitle={`Mã giáo viên: ${currentUser?.id || ''} • Quản lý lớp học và lịch giảng dạy`}
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* KPI StatCards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Lớp phụ trách"
              value={loading ? '—' : classes.length}
              hint="Lớp học đang quản lý"
              icon={<BookOpen size={20} />}
              tone="primary"
            />
            <StatCard
              label="Ca dạy hoàn thành"
              value={loading ? '—' : `${completedSlots}/${slots.length}`}
              hint="Tiến độ phân công"
              icon={<CheckCircle2 size={20} />}
              tone="success"
            />
            <StatCard
              label="Đơn chờ duyệt"
              value={loading ? '—' : pendingRequests}
              hint="Đơn xin nghỉ & đổi ca"
              icon={<Inbox size={20} />}
              tone="warning"
            />
            <StatCard
              label="Thù lao tính theo ca"
              value={
                loading
                  ? '—'
                  : payroll?.netSalary
                  ? `${(payroll.netSalary / 1000000).toFixed(1)} tr`
                  : '0 đ'
              }
              hint="Theo ca dạy hoàn thành"
              icon={<Clock size={20} />}
              tone="info"
            />
          </section>

          {/* Live Session Tracker */}
          <div>
            <LiveSessionTracker
              teacherId={currentUser?.id}
              attendancePathPrefix="/teacher/attendance"
            />
          </div>

          {/* Grid Lịch dạy & Yêu cầu */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Lịch dạy sắp tới */}
            <Card className="lg:col-span-2 space-y-4">
              <CardHeader
                title="Lịch dạy sắp tới"
                subtitle="Các ca học gần nhất cần chuẩn bị bài giảng"
                action={
                  <Link href="/teacher/schedule">
                    <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />}>
                      Xem tất cả ({slots.length})
                    </Button>
                  </Link>
                }
              />

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-field bg-muted animate-pulse" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={28} />}
                  title="Chưa có ca dạy"
                  description="Hiện tại chưa có ca học nào được phân công."
                />
              ) : (
                <div className="divide-y divide-line">
                  {slots.slice(0, 5).map((slot) => {
                    const dateParts = (slot.date || '').split('-');
                    const day = dateParts[2] || '';
                    const month = dateParts[1] || '';
                    return (
                      <div
                        key={slot.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-muted rounded-field text-center min-w-[52px] shrink-0">
                            <span className="block font-bold text-foreground text-sm tabular">
                              {day}
                            </span>
                            <span className="text-[11px] text-muted-foreground">Th{month}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground text-sm truncate">
                              {slot.classId} {slot.subject ? `• ${slot.subject}` : ''}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 mt-0.5 tabular">
                              <span>
                                {slot.startTime} - {slot.endTime}
                              </span>
                              <span>•</span>
                              <span>Phòng {slot.roomId}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {slot.meetingLink && (
                            <a
                              href={slot.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 h-8 rounded-pill bg-primary-soft text-primary-ink font-semibold transition text-[12px] inline-flex items-center gap-1.5 hover:brightness-95"
                              title="Vào phòng học trực tuyến"
                            >
                              <Headphones size={13} />
                              <span>Phòng học</span>
                            </a>
                          )}
                          <Badge
                            tone={slot.status === 'Đã hoàn thành' ? 'success' : 'info'}
                            dot
                          >
                            {slot.status}
                          </Badge>
                          <Link
                            href={`/teacher/attendance?slotId=${slot.id}&classId=${slot.classId}`}
                          >
                            <Button variant="secondary" size="sm">
                              Điểm danh
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Đơn từ gần đây */}
            <Card className="space-y-4 flex flex-col">
              <CardHeader
                title="Yêu cầu từ học viên"
                subtitle="Đơn xin nghỉ & đổi lịch mới nhất"
                action={
                  <Link href="/teacher/requests">
                    <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />}>
                      Xem tất cả
                    </Button>
                  </Link>
                }
              />

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-field bg-muted animate-pulse" />
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <EmptyState
                  icon={<Inbox size={28} />}
                  title="Không có yêu cầu"
                  description="Hiện tại không có đơn xin nghỉ hay đổi lịch nào cần xử lý."
                />
              ) : (
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {requests.slice(0, 4).map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-card bg-muted/60 border border-line space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground">
                          Học viên {req.studentId}
                        </span>
                        <Badge
                          tone={
                            req.status === 'ĐÃ_DUYỆT'
                              ? 'success'
                              : req.status === 'TỪ_CHỐI'
                              ? 'danger'
                              : 'warning'
                          }
                          dot
                        >
                          {req.status === 'ĐÃ_DUYỆT'
                            ? 'Đã duyệt'
                            : req.status === 'TỪ_CHỐI'
                            ? 'Từ chối'
                            : 'Chờ duyệt'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground italic line-clamp-2">
                        &quot;{req.reason}&quot;
                      </p>
                      <div className="text-[11px] text-subtle-foreground flex items-center justify-between">
                        <span>
                          {req.type === 'XIN_NGHI' ? 'Xin nghỉ học' : 'Đổi ca học'} • Lớp{' '}
                          {req.classId}
                        </span>
                        <span className="tabular">
                          {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
