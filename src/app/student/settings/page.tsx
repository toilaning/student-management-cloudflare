'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { User, Link as LinkIcon, Save, Check, ExternalLink } from 'lucide-react';

export default function StudentSettingsPage() {
  const { currentUser } = useApp();
  const studentId = (currentUser as any)?.studentId || currentUser?.id || '';

  const [assignmentUrl, setAssignmentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    async function loadData() {
      try {
        const res = await fetch(`/api/students/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.student) {
            setAssignmentUrl(data.student.assignmentUrl || '');
          }
        }
      } catch (e) {
        console.error('Lỗi nạp thông tin học sinh:', e);
      }
    }
    loadData();
  }, [studentId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentUrl: assignmentUrl.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Cập nhật hồ sơ học tập thành công!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['STUDENT']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Cài đặt Hồ sơ Học viên" 
          subtitle="Quản lý Link tổng hợp bài làm" 
        />

        <main className="p-6 max-w-3xl mx-auto w-full space-y-6">
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium animate-in fade-in">
              <Check size={16} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                {currentUser?.name?.charAt(0) || 'H'}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">{currentUser?.name}</h3>
                <span className="text-xs font-mono text-indigo-600 font-semibold">Mã học viên: {studentId}</span>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-5 text-xs">
              {/* Link bài tập tổng hợp */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <LinkIcon size={14} className="text-indigo-600" />
                    <span>Link Tổng Hợp Bài Làm (Google Drive / Notion / GitHub / Figma)</span>
                  </label>
                  {assignmentUrl && (
                    <a
                      href={assignmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Mở link thử</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/... hoặc https://notion.so/..."
                  value={assignmentUrl}
                  onChange={e => setAssignmentUrl(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Thầy cô sẽ bấm trực tiếp vào link này để kiểm tra và nhận xét toàn bộ bài tập của em trong khóa học.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Save size={15} />
                  <span>{loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}