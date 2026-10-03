'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, XCircle, Radio, 
  ArrowRight, RefreshCw, MapPin, User, Calendar, ChevronDown, 
  ChevronUp, Phone 
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface StudentAttendanceDetail {
  id: string;
  name: string;
  phone?: string;
  checkinTime?: string;
  method?: string;
  note?: string;
}

interface LiveSessionData {
  hasActiveSession: boolean;
  slot?: {
    id: string;
    classId: string;
    subject: string;
    roomId: string;
    teacherId: string;
    startTime: string;
    endTime: string;
    date: string;
    shiftId: number;
  };
  className?: string;
  stats?: {
    totalStudents: number;
    attendedCount: number;
    notAttendedCount: number;
    excusedCount: number;
    unexcusedCount: number;
    attendanceRate: number;
  };
  studentsByStatus?: {
    attended: StudentAttendanceDetail[];
    notAttended: StudentAttendanceDetail[];
    excused: StudentAttendanceDetail[];
    unexcused: StudentAttendanceDetail[];
  };
}

type TabType = 'all' | 'attended' | 'notAttended' | 'excused' | 'unexcused';

export function LiveSessionTracker({ 
  teacherId,
  attendancePathPrefix = '/admin/attendance' 
}: { 
  teacherId?: string;
  attendancePathPrefix?: string;
}) {
  const [data, setData] = useState<LiveSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

  const fetchLiveSession = async () => {
    try {
      setLoading(true);
      let url = '/api/attendance/current-session';
      if (teacherId) url += `?teacherId=${teacherId}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching live session:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveSession();
  }, [teacherId]);

  if (loading && !data) {
    return (
      <Card className="flex items-center justify-center gap-2.5 text-muted-foreground text-xs py-8">
        <RefreshCw size={15} className="animate-spin text-primary" />
        <span>Đang kết nối dữ liệu ca học trực tiếp...</span>
      </Card>
    );
  }

  if (!data?.hasActiveSession || !data?.slot || !data?.stats) {
    return (
      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-field bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <Radio size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-foreground text-sm">Theo dõi ca học hiện tại</h4>
              <Badge tone="neutral">Ngoại tuyến</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Hiện tại không có ca học nào trong thời gian điểm danh.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchLiveSession}
          title="Làm mới dữ liệu"
          aria-label="Làm mới"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-primary' : ''} />
        </Button>
      </Card>
    );
  }

  const { slot, className, stats, studentsByStatus } = data;
  const total = stats.totalStudents || 1;
  const attendedPct = Math.round((stats.attendedCount / total) * 100);
  const excusedPct = Math.round((stats.excusedCount / total) * 100);
  const unexcusedPct = Math.round((stats.unexcusedCount / total) * 100);
  const notAttendedPct = Math.max(0, 100 - attendedPct - excusedPct - unexcusedPct);

  const toggleTab = (tab: TabType) => {
    setActiveTab(prev => prev === tab ? null : tab);
  };

  const getActiveList = (): { list: StudentAttendanceDetail[]; label: string; tone: 'success' | 'neutral' | 'info' | 'danger' } => {
    if (!studentsByStatus) return { list: [], label: '', tone: 'neutral' };
    switch (activeTab) {
      case 'attended':
        return { 
          list: studentsByStatus.attended || [], 
          label: 'Học sinh có mặt', 
          tone: 'success' 
        };
      case 'notAttended':
        return { 
          list: studentsByStatus.notAttended || [], 
          label: 'Học sinh chưa vào lớp', 
          tone: 'neutral' 
        };
      case 'excused':
        return { 
          list: studentsByStatus.excused || [], 
          label: 'Học sinh vắng có phép', 
          tone: 'info' 
        };
      case 'unexcused':
        return { 
          list: studentsByStatus.unexcused || [], 
          label: 'Học sinh vắng không phép', 
          tone: 'danger' 
        };
      default:
        return { list: [], label: '', tone: 'neutral' };
    }
  };

  const activeData = getActiveList();

  return (
    <Card className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <Badge tone="success" dot>Đang diễn ra</Badge>
          <span className="text-xs font-semibold text-muted-foreground">
            Ca {slot.shiftId} ({slot.startTime} - {slot.endTime})
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchLiveSession}
            disabled={loading}
            title="Làm mới"
            aria-label="Làm mới"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} />
          </Button>
          <Link href={`${attendancePathPrefix}?slotId=${slot.id}&classId=${slot.classId}`}>
            <Button variant="primary" size="sm" icon={<ArrowRight size={13} />}>
              Vào sổ điểm danh
            </Button>
          </Link>
        </div>
      </div>

      {/* Thông tin lớp & Chỉ số % chuyên cần */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">{slot.subject}</h3>
            <Badge tone="primary">
              {slot.classId}{className ? ` • ${className}` : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-3.5 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-subtle-foreground" />
              Phòng: <strong className="text-foreground font-semibold">{slot.roomId}</strong>
            </span>
            <span className="text-line-strong">•</span>
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-subtle-foreground" />
              Giáo viên: <strong className="text-foreground font-semibold">{slot.teacherId}</strong>
            </span>
            <span className="text-line-strong">•</span>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-subtle-foreground" />
              Ngày: <strong className="text-foreground font-semibold">{slot.date}</strong>
            </span>
          </div>
        </div>

        {/* Cụm tỷ lệ tổng quan */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-muted border border-line rounded-field px-4 py-2.5">
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Chuyên cần</div>
            <div className="text-xl font-extrabold text-foreground tabular leading-tight">{stats.attendanceRate}%</div>
          </div>
          <div className="h-8 w-px bg-line" />
          <div className="text-xs text-muted-foreground">
            <span className="text-success font-bold text-sm tabular">{stats.attendedCount}</span>
            <span className="tabular">/{stats.totalStudents} học sinh</span>
          </div>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="space-y-1.5">
        <div
          className="h-2.5 w-full bg-muted rounded-pill overflow-hidden flex cursor-pointer"
          title="Bấm vào các thẻ dưới để xem danh sách"
        >
          <div 
            style={{ width: `${attendedPct}%` }} 
            className="bg-success h-full transition-all duration-300 hover:opacity-80" 
            onClick={() => toggleTab('attended')}
          />
          <div 
            style={{ width: `${excusedPct}%` }} 
            className="bg-info h-full transition-all duration-300 hover:opacity-80" 
            onClick={() => toggleTab('excused')}
          />
          <div 
            style={{ width: `${unexcusedPct}%` }} 
            className="bg-danger h-full transition-all duration-300 hover:opacity-80" 
            onClick={() => toggleTab('unexcused')}
          />
          <div 
            style={{ width: `${notAttendedPct}%` }} 
            className="bg-line-strong h-full transition-all duration-300 hover:opacity-80" 
            onClick={() => toggleTab('notAttended')}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium px-0.5">
          <span>Tiến độ ca học (Bấm thẻ bên dưới để lọc danh sách)</span>
          <span className="tabular">{stats.attendedCount + stats.excusedCount + stats.unexcusedCount}/{stats.totalStudents} đã đối soát</span>
        </div>
      </div>

      {/* 4 Thẻ chỉ số - Click tương tác mở rộng danh sách */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Tham gia / Có mặt */}
        <button
          type="button"
          onClick={() => toggleTab('attended')}
          className={cn(
            'text-left p-3.5 rounded-field border transition cursor-pointer relative',
            activeTab === 'attended'
              ? 'bg-success-soft border-success ring-2 ring-success/20'
              : 'bg-card border-line hover:bg-muted'
          )}
        >
          <div className="flex items-center justify-between text-success text-xs font-bold">
            <span>Có mặt</span>
            <CheckCircle2 size={15} />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground flex items-baseline justify-between tabular">
            <span>{stats.attendedCount}</span>
            <span className="text-[11px] font-semibold text-success flex items-center gap-0.5">
              {activeTab === 'attended' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Bấm xem danh sách</p>
        </button>

        {/* 2. Chưa vào lớp */}
        <button
          type="button"
          onClick={() => toggleTab('notAttended')}
          className={cn(
            'text-left p-3.5 rounded-field border transition cursor-pointer relative',
            activeTab === 'notAttended'
              ? 'bg-muted border-line-strong ring-2 ring-foreground/10'
              : 'bg-card border-line hover:bg-muted'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
            <span>Chưa vào lớp</span>
            <Clock size={15} />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground flex items-baseline justify-between tabular">
            <span>{stats.notAttendedCount}</span>
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-0.5">
              {activeTab === 'notAttended' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Bấm xem danh sách</p>
        </button>

        {/* 3. Vắng có phép */}
        <button
          type="button"
          onClick={() => toggleTab('excused')}
          className={cn(
            'text-left p-3.5 rounded-field border transition cursor-pointer relative',
            activeTab === 'excused'
              ? 'bg-info-soft border-info ring-2 ring-info/20'
              : 'bg-card border-line hover:bg-muted'
          )}
        >
          <div className="flex items-center justify-between text-info text-xs font-bold">
            <span>Vắng có phép</span>
            <AlertTriangle size={15} />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground flex items-baseline justify-between tabular">
            <span>{stats.excusedCount}</span>
            <span className="text-[11px] font-semibold text-info flex items-center gap-0.5">
              {activeTab === 'excused' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Bấm xem đơn nghỉ</p>
        </button>

        {/* 4. Vắng không phép */}
        <button
          type="button"
          onClick={() => toggleTab('unexcused')}
          className={cn(
            'text-left p-3.5 rounded-field border transition cursor-pointer relative',
            activeTab === 'unexcused'
              ? 'bg-danger-soft border-danger ring-2 ring-danger/20'
              : 'bg-card border-line hover:bg-muted'
          )}
        >
          <div className="flex items-center justify-between text-danger text-xs font-bold">
            <span>Vắng không phép</span>
            <XCircle size={15} />
          </div>
          <div className="mt-2 text-2xl font-black text-foreground flex items-baseline justify-between tabular">
            <span>{stats.unexcusedCount}</span>
            <span className="text-[11px] font-semibold text-danger flex items-center gap-0.5">
              {activeTab === 'unexcused' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Bấm để gọi nhắc</p>
        </button>
      </div>

      {/* DANH SÁCH HỌC SINH TƯƠNG TÁC MỞ RỘNG KHI CLICK */}
      {activeTab && (
        <div className="pt-4 border-t border-line animate-in-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge tone={activeData.tone} dot>
                {activeData.label} ({activeData.list.length})
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition"
            >
              Đóng danh sách
            </button>
          </div>

          {activeData.list.length === 0 ? (
            <div className="p-4 bg-muted border border-line rounded-field text-center text-xs text-muted-foreground font-medium">
              Không có học sinh nào trong nhóm này.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
              {activeData.list.map(st => (
                <div 
                  key={st.id} 
                  className="bg-muted hover:bg-card border border-line rounded-field p-3 flex items-center justify-between gap-3 text-xs transition"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{st.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {st.id}
                    </div>
                    {st.checkinTime && (
                      <div className="text-[11px] text-success mt-0.5 font-medium">
                        Điểm danh: {st.checkinTime} {st.method ? `(${st.method})` : ''}
                      </div>
                    )}
                    {st.note && (
                      <div className="text-[11px] text-muted-foreground italic mt-0.5">
                        Lý do: {st.note}
                      </div>
                    )}
                  </div>

                  {st.phone && (
                    <a
                      href={`tel:${st.phone}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-card hover:bg-primary-soft hover:text-primary-ink text-muted-foreground border border-line shrink-0 transition"
                      title={`Gọi: ${st.phone}`}
                    >
                      <Phone size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
