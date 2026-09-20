'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ClassEntity } from '@/types/classroom';
import { BookOpen, Users, UserCheck, Search, Check, Plus, AlertCircle } from 'lucide-react';

export default function StudentClassesPage() {
  const { currentUser, isReady } = useApp();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const [clsRes, stRes] = await Promise.all([
        fetch('/api/classes'),
        fetch(`/api/students?id=${currentUser.id}`),
      ]);
      const clsData = await clsRes.json();
      const stData = await stRes.json();
      setClasses(clsData.classes || []);
      setStudent(stData.student || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, isReady]);

  const handleRegister = async (classId: string) => {
    if (!student) return;
    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          studentId: currentUser?.id || "",
          action: 'ENROLL',
          actorId: currentUser?.id || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Đăng ký tham gia lớp học thành công!`);
        await loadData();
      } else {
        alert(data.error || 'Đăng ký thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng');
    }
  };

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.teacherId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header
          title="Danh mục & Đăng ký Lớp học"
          subtitle="Tra cứu và chọn lớp học phù hợp cho kỳ Tháng 09/2026"
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {actionMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-emerald-600 font-bold hover:underline">
                Đóng
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo môn học, tên lớp, giáo viên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-emerald-600"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Số lớp bạn đã đăng ký: <strong className="text-emerald-600">{student?.enrolledClassIds?.length || 0} lớp</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(cls => {
              const isEnrolled = student?.enrolledClassIds?.includes(cls.id);
              return (
                <div key={cls.id} className={`bg-white rounded-xl border p-5 shadow-xs transition flex flex-col justify-between ${
                  isEnrolled ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-emerald-200'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {cls.code} • {cls.id}
                        </span>
                        <h3 className="font-bold text-slate-800 text-base mt-1.5">{cls.name}</h3>
                      </div>
                      {isEnrolled ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check size={12} /> Đang học
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                          {cls.status}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5"><UserCheck size={14} /> Giảng viên:</span>
                        <span className="font-semibold text-slate-800">{cls.teacherId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5"><Users size={14} /> Sĩ số:</span>
                        <span className="font-semibold text-slate-800">{cls.studentIds.length} học viên</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Phòng học & Ca:</span>
                        <span className="font-semibold text-slate-800">{cls.roomId} • Ca {cls.shiftId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Thời gian:</span>
                        <span className="font-semibold text-emerald-600">Thứ {cls.scheduleDays.join(', ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Học phí:</span>
                        <span className="font-bold text-slate-800">{cls.tuitionFee.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4">
                    {isEnrolled ? (
                      <button
                        disabled
                        className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 cursor-default flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} /> Bạn đã tham gia lớp này
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(cls.id)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Plus size={14} /> Đăng ký tham gia lớp
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
