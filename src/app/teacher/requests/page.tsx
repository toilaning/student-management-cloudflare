'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassRequest } from '@/types/schedule';
import { Inbox, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function TeacherRequestsPage() {
  const { currentUser, isReady } = useApp();
  const [requests, setRequests] = useState<ClassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/requests?teacherId=${currentUser.id}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentUser, isReady]);

  const handleDecision = async (requestId: string, status: 'ĐÃ_DUYỆT' | 'TỪ_CHỐI') => {
    setActionLoading(requestId);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DECIDE',
          requestId,
          status,
          reviewerId: currentUser?.id || "",
          reviewNote: status === 'ĐÃ_DUYỆT' ? 'Đã duyệt yêu cầu của em.' : 'Không thể sắp xếp theo nguyện vọng.',
        }),
      });
      if (res.ok) {
        await loadRequests();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <RoleGuard allowedRoles={['TEACHER', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Xử lý Đơn xin nghỉ & Đổi ca học" 
          subtitle="Phê duyệt hoặc từ chối các nguyện vọng của học viên trong các lớp phụ trách" 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">
              Tổng số yêu cầu: <strong className="text-blue-600">{requests.length}</strong> đơn
            </div>
            <div className="text-xs text-slate-500">
              Cần xử lý kịp thời trước giờ học
            </div>
          </div>

          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-slate-300 transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      req.type === 'XIN_NGHI' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {req.type === 'XIN_NGHI' ? 'Đơn xin nghỉ học' : 'Đề xuất đổi ca'}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      Học viên {req.studentId} • Lớp {req.classId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      req.status === 'ĐÃ_DUYỆT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'TỪ_CHỐI'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-500">Lý do xin phép:</span>
                    <p className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-100 italic text-slate-600">
                      "{req.reason}"
                    </p>
                  </div>

                  {req.reviewNote && (
                    <div className="mt-2 text-xs">
                      <span className="font-semibold text-slate-500">Phản hồi của giảng viên:</span>
                      <span className="ml-2 font-medium text-slate-800">{req.reviewNote}</span>
                    </div>
                  )}
                </div>

                {req.status === 'CHỜ_DUYỆT' && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      disabled={actionLoading === req.id}
                      onClick={() => handleDecision(req.id, 'TỪ_CHỐI')}
                      className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
                    >
                      Từ chối đơn
                    </button>
                    <button
                      disabled={actionLoading === req.id}
                      onClick={() => handleDecision(req.id, 'ĐÃ_DUYỆT')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                    >
                      Chấp thuận duyệt
                    </button>
                  </div>
                )}
              </div>
            ))}

            {requests.length === 0 && (
              <div className="py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
                Hiện tại không có đơn xin nghỉ hay đổi lịch nào trong các lớp phụ trách.
              </div>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
