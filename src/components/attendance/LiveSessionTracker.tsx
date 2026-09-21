'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, XCircle, Radio, 
  ArrowRight, RefreshCw, MapPin, User, Calendar, ChevronDown, 
  ChevronUp, Phone, MessageSquare, ExternalLink 
} from 'lucide-react';
import Link from 'next/link';

interface StudentAttendanceDetail {
  id: string;
  name: string;
  phone?: string;
  discordId?: string;
  discordUsername?: string;
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-center gap-2 text-slate-400 text-xs">
        <RefreshCw size={15} className="animate-spin text-indigo-600" />
        <span>Đang kết nối dữ liệu ca học trực tiếp...</span>
      </div>
    );
  }

  if (!data?.hasActiveSession || !data?.slot || !data?.stats) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex items-center justify-between transition hover:border-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            <Radio size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-700 text-sm">Theo dõi Ca Học Hiện Tại</h4>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Ngoại tuyến
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Hiện tại không có ca học nào đang trong thời gian điểm danh.</p>
          </div>
        </div>
        <button
          onClick={fetchLiveSession}
          className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer border border-transparent hover:border-slate-200"
          title="Làm mới dữ liệu"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
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

  const getActiveList = (): { list: StudentAttendanceDetail[]; label: string; badgeColor: string } => {
    if (!studentsByStatus) return { list: [], label: '', badgeColor: '' };
    switch (activeTab) {
      case 'attended':
        return { 
          list: studentsByStatus.attended || [], 
          label: 'Học sinh có mặt / Tham gia', 
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        };
      case 'notAttended':
        return { 
          list: studentsByStatus.notAttended || [], 
          label: 'Học sinh chưa vào lớp', 
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200' 
        };
      case 'excused':
        return { 
          list: studentsByStatus.excused || [], 
          label: 'Học sinh vắng có phép', 
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' 
        };
      case 'unexcused':
        return { 
          list: studentsByStatus.unexcused || [], 
          label: 'Học sinh vắng không phép (Cần gọi nhắc)', 
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' 
        };
      default:
        return { list: [], label: '', badgeColor: '' };
    }
  };

  const activeData = getActiveList();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 transition hover:border-indigo-200/80 space-y-5">
      {/* Top bar: Live badge + ca học + nút hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Đang Diễn Ra
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Ca {slot.shiftId} ({slot.startTime} - {slot.endTime})
          </span>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={fetchLiveSession}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href={`${attendancePathPrefix}?slotId=${slot.id}&classId=${slot.classId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs"
          >
            <span>Vào sổ điểm danh</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Thông tin lớp & Chỉ số % chuyên cần */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">{slot.subject}</h3>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
              {slot.classId}{className ? ` • ${className}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400" />
              Phòng: <strong className="text-slate-700">{slot.roomId}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <User size={13} className="text-slate-400" />
              Giáo viên: <strong className="text-slate-700">{slot.teacherId}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-slate-400" />
              Ngày: <strong className="text-slate-700">{slot.date}</strong>
            </span>
          </div>
        </div>

        {/* Cụm tỷ lệ tổng quan */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Chuyên cần</div>
            <div className="text-xl font-black text-slate-800">{stats.attendanceRate}%</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-xs font-semibold text-slate-600">
            <span className="text-emerald-600 font-bold">{stats.attendedCount}</span>
            <span className="text-slate-400">/{stats.totalStudents} học sinh</span>
          </div>
        </div>
      </div>

      {/* Segmented Progress Bar - Thanh trực quan phân tầng êm mắt */}
      <div className="space-y-1.5">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex cursor-pointer" title="Bấm vào các thẻ dưới để xem danh sách">
          <div 
            style={{ width: `${attendedPct}%` }} 
            className="bg-emerald-500 h-full transition-all duration-500 hover:opacity-80" 
            onClick={() => toggleTab('attended')}
          />
          <div 
            style={{ width: `${excusedPct}%` }} 
            className="bg-blue-400 h-full transition-all duration-500 hover:opacity-80" 
            onClick={() => toggleTab('excused')}
          />
          <div 
            style={{ width: `${unexcusedPct}%` }} 
            className="bg-rose-400 h-full transition-all duration-500 hover:opacity-80" 
            onClick={() => toggleTab('unexcused')}
          />
          <div 
            style={{ width: `${notAttendedPct}%` }} 
            className="bg-slate-200 h-full transition-all duration-500 hover:opacity-80" 
            onClick={() => toggleTab('notAttended')}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-0.5">
          <span>Tiến độ ca học (Bấm thẻ bên dưới để xem học sinh)</span>
          <span>{stats.attendedCount + stats.excusedCount + stats.unexcusedCount}/{stats.totalStudents} đã đối soát</span>
        </div>
      </div>

      {/* 4 Thẻ chỉ số Pastel - Có thể CLICK TƯƠNG TÁC XEM DANH SÁCH */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Tham gia / Có mặt */}
        <button
          type="button"
          onClick={() => toggleTab('attended')}
          className={`text-left p-3.5 rounded-xl border transition cursor-pointer relative ${
            activeTab === 'attended'
              ? 'bg-emerald-100/70 border-emerald-400 shadow-xs ring-2 ring-emerald-400/20'
              : 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Tham gia</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-800 flex items-baseline justify-between">
            <span>{stats.attendedCount}</span>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              {activeTab === 'attended' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Bấm để xem danh sách</p>
        </button>

        {/* 2. Chưa tham gia */}
        <button
          type="button"
          onClick={() => toggleTab('notAttended')}
          className={`text-left p-3.5 rounded-xl border transition cursor-pointer relative ${
            activeTab === 'notAttended'
              ? 'bg-slate-200/70 border-slate-400 shadow-xs ring-2 ring-slate-400/20'
              : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100/60'
          }`}
        >
          <div className="flex items-center justify-between text-slate-700 text-xs font-bold">
            <span>Chưa vào lớp</span>
            <Clock size={15} className="text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800 flex items-baseline justify-between">
            <span>{stats.notAttendedCount}</span>
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-0.5">
              {activeTab === 'notAttended' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Bấm để xem danh sách</p>
        </button>

        {/* 3. Vắng có phép */}
        <button
          type="button"
          onClick={() => toggleTab('excused')}
          className={`text-left p-3.5 rounded-xl border transition cursor-pointer relative ${
            activeTab === 'excused'
              ? 'bg-blue-100/70 border-blue-400 shadow-xs ring-2 ring-blue-400/20'
              : 'bg-blue-50/60 border-blue-100 hover:bg-blue-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>Vắng có phép</span>
            <AlertTriangle size={15} className="text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-800 flex items-baseline justify-between">
            <span>{stats.excusedCount}</span>
            <span className="text-[11px] font-medium text-blue-600 flex items-center gap-0.5">
              {activeTab === 'excused' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Bấm để xem đơn nghỉ</p>
        </button>

        {/* 4. Vắng không phép */}
        <button
          type="button"
          onClick={() => toggleTab('unexcused')}
          className={`text-left p-3.5 rounded-xl border transition cursor-pointer relative ${
            activeTab === 'unexcused'
              ? 'bg-rose-100/70 border-rose-400 shadow-xs ring-2 ring-rose-400/20'
              : 'bg-rose-50/60 border-rose-100 hover:bg-rose-100/50'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>Vắng không phép</span>
            <XCircle size={15} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-800 flex items-baseline justify-between">
            <span>{stats.unexcusedCount}</span>
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              {activeTab === 'unexcused' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </div>
          <p className="text-[11px] text-rose-600 mt-0.5 font-medium">Bấm để gọi nhắc ngay</p>
        </button>
      </div>

      {/* DANH SÁCH HỌC SINH TƯƠNG TÁC MỞ RỘNG KHI CLICK */}
      {activeTab && (
        <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${activeData.badgeColor}`}>
                {activeData.label} ({activeData.list.length})
              </span>
            </div>
            <button
              onClick={() => setActiveTab(null)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Đóng danh sách
            </button>
          </div>

          {activeData.list.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400 font-medium">
              Không có học sinh nào trong nhóm này.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
              {activeData.list.map(st => (
                <div 
                  key={st.id} 
                  className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs transition"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{st.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono text-indigo-600 font-semibold">{st.id}</span>
                      {st.discordUsername && (
                        <span>• Discord: @{st.discordUsername}</span>
                      )}
                    </div>
                    {st.checkinTime && (
                      <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                        Điểm danh: {st.checkinTime} {st.method ? `(${st.method})` : ''}
                      </div>
                    )}
                    {st.note && (
                      <div className="text-[10px] text-slate-500 italic mt-0.5">
                        Lý do: {st.note}
                      </div>
                    )}
                  </div>

                  {st.phone && (
                    <a
                      href={`tel:${st.phone}`}
                      className="p-2 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg border border-slate-200 shrink-0 transition"
                      title={`Gọi cho phụ huynh/học sinh: ${st.phone}`}
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
    </div>
  );
}
