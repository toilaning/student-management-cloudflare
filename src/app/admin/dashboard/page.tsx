'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { LiveSessionTracker } from '@/components/attendance/LiveSessionTracker';
import { QuickStudentModal } from '@/components/common/QuickStudentModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getTodayDateStr } from '@/utils/date';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Receipt, 
  CalendarDays, 
  ArrowUpRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
  Activity,
  ShieldCheck,
  CalendarCheck2
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 400,
    totalTeachers: 20,
    totalClasses: 30,
    totalRevenue: 0,
    totalPayroll: 0,
    outstandingDebt: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Accordion Tab States
  const [openLiveTab, setOpenLiveTab] = useState(true);
  const [openFinanceTab, setOpenFinanceTab] = useState(false);
  const [openScheduleTab, setOpenScheduleTab] = useState(false);

  // Quick Student Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Live Clock & Ngày tháng
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const fetchSafe = async (url: string) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return {};
            return await res.json();
          } catch (e) {
            return {};
          }
        };

        const [tuitionData, logsData, slotsData] = await Promise.all([
          fetchSafe('/api/finance'),
          fetchSafe('/api/audit'),
          fetchSafe(`/api/schedule?date=${getTodayDateStr()}`),
        ]);

        let totalRevenue = 0;
        let outstandingDebt = 0;
        if (tuitionData.invoices) {
          tuitionData.invoices.forEach((inv: any) => {
            totalRevenue += inv.paidAmount;
            outstandingDebt += inv.remainingAmount;
          });
        }

        setStats({
          totalStudents: 400,
          totalTeachers: 20,
          totalClasses: 30,
          totalRevenue,
          totalPayroll: 0,
          outstandingDebt,
        });

        setRecentLogs(logsData.logs ? logsData.logs.slice(0, 8) : []);
        setTodaySlots(slotsData.slots ? slotsData.slots.slice(0, 6) : []);
      } catch (e) {
        console.error('Error loading dashboard stats:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header 
          title="Bảng điều hành" 
          subtitle="Giám sát ca học trực tiếp và tình hình vận hành trong ngày" 
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          <PageHeader
            title="Tổng quan vận hành"
            subtitle={currentDate ? `${currentDate} • ${currentTime}` : 'Đang cập nhật thời gian...'}
            action={
              <div className="flex items-center gap-2">
                <Link href="/admin/calendar">
                  <Button variant="secondary" size="md" icon={<CalendarDays size={16} />}>
                    Lịch dạy
                  </Button>
                </Link>
                <Link href="/admin/attendance">
                  <Button variant="primary" size="md" icon={<Clock size={16} />}>
                    Điểm danh
                  </Button>
                </Link>
              </div>
            }
          />

          {/* Thống kê chỉ số chính */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Tổng học viên"
              value={stats.totalStudents}
              hint="Hồ sơ quản lý"
              icon={<Users size={20} />}
              tone="primary"
            />
            <StatCard
              label="Giảng viên & Lớp"
              value={`${stats.totalTeachers} GV / ${stats.totalClasses} lớp`}
              hint="Đang hoạt động"
              icon={<GraduationCap size={20} />}
              tone="info"
            />
            <StatCard
              label="Học phí đã thu"
              value={`${(stats.totalRevenue / 1_000_000).toFixed(1)} tr`}
              hint="Tổng thu ghi nhận"
              icon={<Receipt size={20} />}
              tone="success"
            />
            <StatCard
              label="Dư nợ cần thu"
              value={`${(stats.outstandingDebt / 1_000_000).toFixed(1)} tr`}
              hint="Chờ thanh toán"
              icon={<Activity size={20} />}
              tone="warning"
            />
          </div>

          {/* Ca học trực tiếp */}
          <Card padded={false} className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-foreground">Ca học trực tiếp</h3>
                  <p className="text-[13px] text-muted-foreground">Sĩ số và điểm danh thời gian thực</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="success" dot>Trực tiếp</Badge>
                <button
                  type="button"
                  onClick={() => setOpenLiveTab(!openLiveTab)}
                  className="p-1.5 rounded-field text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
                  aria-label="Thu gọn hoặc mở rộng ca học trực tiếp"
                >
                  {openLiveTab ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>
            {openLiveTab && (
              <div className="p-4 sm:p-5">
                <LiveSessionTracker attendancePathPrefix="/admin/attendance" />
              </div>
            )}
          </Card>

          {/* Khu vực Lịch hôm nay & Thao tác nhanh & Nhật ký */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Cột trái: Lịch học hôm nay */}
            <div className="lg:col-span-2 space-y-5">
              <Card padded={false} className="overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
                  <CardHeader
                    title="Lịch học trong ngày"
                    subtitle="Các ca học được xếp lịch hôm nay"
                    icon={<CalendarCheck2 size={18} />}
                    className="mb-0"
                  />
                  <Link href="/admin/calendar">
                    <Button variant="ghost" size="sm" icon={<ArrowUpRight size={14} />}>
                      Xem toàn bộ lịch
                    </Button>
                  </Link>
                </div>
                {isLoading ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-field bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : todaySlots.length > 0 ? (
                  <div className="divide-y divide-line">
                    {todaySlots.map(slot => (
                      <div key={slot.id} className="p-3.5 sm:p-4 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3 text-[13px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-field bg-primary-soft text-primary-ink flex items-center justify-center font-bold text-xs shrink-0 tabular">
                            C{slot.shiftId}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">
                              {slot.subject} <span className="font-mono text-muted-foreground font-normal">({slot.classId})</span>
                            </p>
                            <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground tabular">{slot.startTime} - {slot.endTime}</span>
                              <span>•</span>
                              <span>Phòng {slot.roomId}</span>
                              <span>•</span>
                              <span>GV: {slot.teacherId}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge tone={slot.status === 'Đã hoàn thành' ? 'success' : slot.status === 'Đã hủy' ? 'danger' : 'primary'}>
                            {slot.status || 'Kế hoạch'}
                          </Badge>
                          <Link href={`/admin/attendance?classId=${slot.classId}&date=${getTodayDateStr()}`}>
                            <Button variant="secondary" size="sm">
                              Điểm danh
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<CalendarDays size={24} />}
                    title="Chưa có ca học nào hôm nay"
                    description="Hôm nay không có ca học nào được xếp lịch trong hệ thống."
                  />
                )}
              </Card>
            </div>

            {/* Cột phải: Thao tác nhanh & Nhật ký */}
            <div className="space-y-5">
              <Card>
                <CardHeader
                  title="Thao tác nhanh"
                  subtitle="Lối tắt quản lý hệ thống"
                  icon={<Layers size={18} />}
                />
                <div className="space-y-2">
                  <Link 
                    href="/admin/tuition" 
                    className="flex items-center justify-between p-3 rounded-field bg-muted/50 border border-line hover:border-line-strong hover:bg-muted transition-colors text-[13px] font-semibold text-foreground group"
                  >
                    <span className="flex items-center gap-2.5">
                      <Receipt size={16} className="text-primary" />
                      Quản lý học phí & gói học
                    </span>
                    <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                  <Link 
                    href="/admin/classes" 
                    className="flex items-center justify-between p-3 rounded-field bg-muted/50 border border-line hover:border-line-strong hover:bg-muted transition-colors text-[13px] font-semibold text-foreground group"
                  >
                    <span className="flex items-center gap-2.5">
                      <BookOpen size={16} className="text-primary" />
                      Quản lý lớp & thời khóa biểu
                    </span>
                    <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                  <Link 
                    href="/admin/calendar" 
                    className="flex items-center justify-between p-3 rounded-field bg-muted/50 border border-line hover:border-line-strong hover:bg-muted transition-colors text-[13px] font-semibold text-foreground group"
                  >
                    <span className="flex items-center gap-2.5">
                      <CalendarDays size={16} className="text-primary" />
                      Lịch học toàn trung tâm
                    </span>
                    <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                  <Link 
                    href="/admin/audit" 
                    className="flex items-center justify-between p-3 rounded-field bg-muted/50 border border-line hover:border-line-strong hover:bg-muted transition-colors text-[13px] font-semibold text-foreground group"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck size={16} className="text-primary" />
                      Nhật ký kiểm toán hệ thống
                    </span>
                    <ArrowUpRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-3">
                  <CardHeader
                    title="Nhật ký vận hành"
                    subtitle="Kiểm toán thao tác mới nhất"
                    icon={<ShieldCheck size={18} />}
                    className="mb-0"
                  />
                  <Link href="/admin/audit">
                    <Button variant="ghost" size="sm">
                      Toàn bộ
                    </Button>
                  </Link>
                </div>
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-12 rounded-field bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : recentLogs.length > 0 ? (
                    recentLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="p-2.5 rounded-field bg-muted/40 border border-line text-[12px] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground truncate">{log.userName || 'Hệ thống'}</span>
                          <span className="text-[11px] tabular text-muted-foreground shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-snug line-clamp-2">
                          {log.details}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="Chưa có nhật ký"
                      description="Chưa có thao tác kiểm toán mới được ghi nhận."
                      className="py-6"
                    />
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>

        {/* Quick Student Popover Modal */}
        <QuickStudentModal 
          studentId={selectedStudentId} 
          onClose={() => setSelectedStudentId(null)} 
        />
      </div>
    </RoleGuard>
  );
}

