'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, ExternalLink, ShieldCheck, UserCheck, AlertCircle, Copy, Check } from 'lucide-react';
import { Student } from '@/types/student';

interface QuickStudentModalProps {
  studentId: string | null;
  onClose: () => void;
}

export function QuickStudentModal({ studentId, onClose }: QuickStudentModalProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setStudent(null);
      return;
    }

    async function fetchStudent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/students/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          setStudent(data.student || null);
        }
      } catch (e) {
        console.error('Lỗi nạp thông tin học sinh:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [studentId]);

  if (!studentId) return null;

  const copyInfo = () => {
    if (!student) return;
    const text = `Học viên: ${student.name} (${student.id})
SĐT Học sinh: ${student.phone || 'Chưa cập nhật'}
SĐT Phụ huynh: ${student.parentPhone || 'Chưa cập nhật'}
Link Bài tập: ${student.assignmentUrl || 'Chưa có'}
Discord: ${student.discordId || student.discordUsername || 'Chưa liên kết'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
              {student?.name?.charAt(0) || 'H'}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{student?.name || 'Đang nạp...'}</h3>
              <span className="text-[11px] font-mono text-indigo-600 font-semibold">{studentId}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {loading ? (
            <div className="py-8 text-center text-slate-400">Đang nạp thông tin...</div>
          ) : student ? (
            <>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-500">Trạng thái:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  student.status === 'Đang học' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : student.status === 'Đã nghỉ học'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {student.status || 'Đang học'}
                </span>
              </div>

              {/* SĐT Học sinh & SĐT Phụ huynh */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">SĐT Học sinh</span>
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{student.phone || 'Chưa có'}</span>
                    {student.phone && (
                      <a href={`tel:${student.phone}`} className="text-indigo-600 hover:text-indigo-800" title="Gọi ngay">
                        <Phone size={13} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">SĐT Phụ huynh</span>
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{student.parentPhone || 'Chưa có'}</span>
                    {student.parentPhone && (
                      <a href={`tel:${student.parentPhone}`} className="text-indigo-600 hover:text-indigo-800" title="Gọi phụ huynh">
                        <Phone size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Link bài tập tổng hợp */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Link Bài Tập Tổng Hợp</span>
                {student.assignmentUrl ? (
                  <a
                    href={student.assignmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold truncate hover:underline"
                  >
                    <span className="truncate">{student.assignmentUrl}</span>
                    <ExternalLink size={13} className="shrink-0" />
                  </a>
                ) : (
                  <p className="text-slate-400 italic">Học sinh chưa cập nhật link bài tập</p>
                )}
              </div>

              {/* Snowflake Discord */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400">Discord Snowflake ID</span>
                <div className="font-mono text-slate-800 font-bold flex items-center gap-2">
                  <span>{student.discordId || 'Chưa liên kết'}</span>
                  {student.discordUsername && (
                    <span className="text-[11px] font-normal text-slate-500 font-sans">(@{student.discordUsername})</span>
                  )}
                </div>
              </div>

              {/* Action nút copy */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={copyInfo}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition flex items-center gap-1.5"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép thông tin'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-slate-400">Không tìm thấy thông tin học sinh này.</div>
          )}
        </div>
      </div>
    </div>
  );
}
