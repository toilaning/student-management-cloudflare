'use client';

import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, AlertTriangle, XCircle, Radio, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

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
}

export function LiveSessionTracker({ 
  teacherId,
  attendancePathPrefix = '/admin/attendance' 
}: { 
  teacherId?: string;
  attendancePathPrefix?: string;
}) {
  const [data, setData] = useState<LiveSessionData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-center gap-2 text-slate-400 text-xs">
        <RefreshCw size={16} className="animate-spin text-indigo-600" />
        <span>Đang kết nối dữ liệu lớp học trực tiếp...</span>
      </div>
    );
  }

  if (!data?.hasActiveSession || !data?.slot || !data?.stats) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Radio size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-700 text-sm">Theo dõi Lớp Đang Học (Real-time)</h4>
            <p className="text-xs text-slate-400">Hiện tại không có ca học nào đang điểm danh.</p>
          </div>
        </div>
        <button
          onClick={fetchLiveSession}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
          title="Làm mới"
        >
          <RefreshCw size={15} />
        </button>
      </div>
    );
  }

  const { slot, className, stats } = data;

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl border border-indigo-800 text-white p-5 sm:p-6 shadow-md relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-800/60 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Lớp đang học • Trực tiếp
            </span>
            <span className="text-xs text-indigo-300">Ca {slot.shiftId} ({slot.startTime} - {slot.endTime})</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLiveSession}
            className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
          <Link
            href={`${attendancePathPrefix}?slotId=${slot.id}&classId=${slot.classId}`}
            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
          >
            <span>Vào sổ điểm danh</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Class info */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>{slot.subject}</span>
            <span className="text-xs font-normal text-indigo-300 px-2 py-0.5 bg-indigo-800/50 rounded border border-indigo-700/50">
              {slot.classId} {className ? `• ${className}` : ''}
            </span>
          </div>
          <div className="text-xs text-indigo-300 flex items-center gap-3 mt-1 font-medium">
            <span>Phòng học: <strong className="text-white">{slot.roomId}</strong></span>
            <span>•</span>
            <span>Giáo viên: <strong className="text-white">{slot.teacherId}</strong></span>
            <span>•</span>
            <span>Ngày: <strong className="text-white">{slot.date}</strong></span>
          </div>
        </div>

        <div className="bg-indigo-950/70 border border-indigo-800/80 rounded-xl px-4 py-2 flex items-center gap-3 shrink-0">
          <div>
            <div className="text-[10px] uppercase font-bold text-indigo-400">Tỷ lệ chuyên cần</div>
            <div className="text-2xl font-black text-emerald-400">{stats.attendanceRate}%</div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/40 flex items-center justify-center font-bold text-xs text-white">
            {stats.attendedCount}/{stats.totalStudents}
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
        {/* 1. Đã điểm danh / Tham gia */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Tham gia</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-300">{stats.attendedCount}</div>
          <p className="text-[11px] text-emerald-400/80 mt-0.5">Đã điểm danh vào lớp</p>
        </div>

        {/* 2. Chưa tham gia */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-slate-300 text-xs font-semibold">
            <span>Chưa tham gia</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{stats.notAttendedCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Chưa ghi nhận điểm danh</p>
        </div>

        {/* 3. Vắng có phép */}
        <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-blue-400 text-xs font-semibold">
            <span>Vắng có phép</span>
            <AlertTriangle size={16} />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-300">{stats.excusedCount}</div>
          <p className="text-[11px] text-blue-400/80 mt-0.5">Có gửi đơn xin phép</p>
        </div>

        {/* 4. Vắng không phép */}
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Vắng không phép</span>
            <XCircle size={16} />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-300">{stats.unexcusedCount}</div>
          <p className="text-[11px] text-rose-400/80 mt-0.5">Không thông báo trước</p>
        </div>
      </div>
    </div>
  );
}
