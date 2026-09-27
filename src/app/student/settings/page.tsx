'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Student } from '@/types/student';
import {
  Link as LinkIcon, Save, Check, ExternalLink, User, UserRound,
} from 'lucide-react';

type Tab = 'profile' | 'study';

export default function StudentSettingsPage() {
  const { currentUser } = useApp();
  const studentId = (currentUser as any)?.studentId || currentUser?.id || '';

  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Hồ sơ học tập
  const [assignmentUrl, setAssignmentUrl] = useState('');

  // Thông tin cá nhân
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    parentPhone: '',
    dateOfBirth: '',
    gender: 'Nam' as 'Nam' | 'Nữ',
    address: '',
    homeTown: '',
    gradeLevel: '',
    targetUniversity: '',
    customUniversity: '',
    examBlock: 'KHOI_V' as 'KHOI_V' | 'KHOI_H',
    studyGoal: '',
    facebookUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!studentId || initialized) return;
    setLoading(true);
    async function loadData() {
      try {
        const res = await fetch(`/api/students/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          const st: Student = data.student;
          if (st) {
            setAssignmentUrl(st.assignmentUrl || '');
            setForm({
              name: st.name || '',
              phone: st.phone || '',
              email: st.email || '',
              parentPhone: st.parentPhone || '',
              dateOfBirth: st.dateOfBirth || '',
              gender: st.gender || 'Nam',
              address: st.address || '',
              homeTown: st.homeTown || '',
              gradeLevel: st.gradeLevel || '',
              targetUniversity: st.targetUniversity || '',
              customUniversity: st.customUniversity || '',
              examBlock: st.examBlock || 'KHOI_V',
              studyGoal: st.studyGoal || '',
              facebookUrl: st.facebookUrl || '',
            });
          }
        }
      } catch (e) {
        console.error('Lỗi nạp thông tin học sinh:', e);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }
    loadData();
  }, [studentId, initialized]);

  const setField = (key: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSaveStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    await save({ assignmentUrl: assignmentUrl.trim() }, 'Cập nhật hồ sơ học tập thành công!');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await save(
      {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        parentPhone: form.parentPhone.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        gender: form.gender,
        address: form.address.trim(),
        homeTown: form.homeTown.trim(),
        gradeLevel: form.gradeLevel.trim(),
        targetUniversity: form.targetUniversity,
        customUniversity: form.customUniversity.trim(),
        examBlock: form.examBlock,
        studyGoal: form.studyGoal.trim(),
        facebookUrl: form.facebookUrl.trim(),
      },
      'Cập nhật thông tin cá nhân thành công!'
    );
  };

  const save = async (payload: Record<string, any>, msg: string) => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(msg);
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

  const inputCls =
    'w-full p-3 border border-slate-200 rounded-xl focus:outline-indigo-600 text-xs bg-white';

  return (
    <RoleGuard allowedRoles={['STUDENT']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header
          title="Cài đặt & Hồ sơ Học viên"
          subtitle="Chỉnh sửa, bổ sung thông tin cá nhân và hồ sơ học tập"
        />

        <main className="p-6 max-w-4xl mx-auto w-full space-y-6">
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium animate-in fade-in">
              <Check size={16} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Thanh điều hướng tab */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-xs w-fit">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserRound size={14} /> Thông tin cá nhân
            </button>
            <button
              onClick={() => setActiveTab('study')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'study'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LinkIcon size={14} /> Hồ sơ học tập
            </button>
          </div>

          {/* Card thông tin học viên */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                {form.name?.charAt(0) || currentUser?.name?.charAt(0) || 'H'}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">{form.name || currentUser?.name}</h3>
                <span className="text-xs font-mono text-indigo-600 font-semibold">Mã học viên: {studentId}</span>
              </div>
            </div>

            {loading && !initialized ? (
              <div className="p-8 text-center text-slate-400 text-sm">Đang tải thông tin...</div>
            ) : activeTab === 'profile' ? (
              <form onSubmit={handleSaveProfile} className="mt-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Họ và tên" required>
                    <input className={inputCls} value={form.name} onChange={e => setField('name', e.target.value)} />
                  </Field>
                  <Field label="Số điện thoại">
                    <input className={inputCls} value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="VD: 0381234567" />
                  </Field>
                  <Field label="Email">
                    <input type="email" className={inputCls} value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@example.com" />
                  </Field>
                  <Field label="SĐT phụ huynh">
                    <input className={inputCls} value={form.parentPhone} onChange={e => setField('parentPhone', e.target.value)} placeholder="VD: 0901234567" />
                  </Field>
                  <Field label="Ngày sinh">
                    <input type="date" className={inputCls} value={form.dateOfBirth} onChange={e => setField('dateOfBirth', e.target.value)} />
                  </Field>
                  <Field label="Giới tính">
                    <select className={inputCls} value={form.gender} onChange={e => setField('gender', e.target.value)}>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Địa chỉ">
                      <input className={inputCls} value={form.address} onChange={e => setField('address', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Quê quán">
                    <input className={inputCls} value={form.homeTown} onChange={e => setField('homeTown', e.target.value)} />
                  </Field>
                  <Field label="Lớp (hiện tại / thí sinh tự do)">
                    <input className={inputCls} value={form.gradeLevel} onChange={e => setField('gradeLevel', e.target.value)} placeholder="VD: Lớp 12, Thí sinh tự do..." />
                  </Field>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-700 mb-3">Mục tiêu luyện thi (Kiến trúc & Mỹ thuật)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Trường đại học mục tiêu">
                      <select className={inputCls} value={form.targetUniversity} onChange={e => setField('targetUniversity', e.target.value)}>
                        <option value="">— Chưa chọn —</option>
                        <option value="HAU">HAU - ĐH Kiến trúc Hà Nội</option>
                        <option value="HUCE">HUCE - ĐH Xây dựng</option>
                        <option value="MTCN">MTCN - ĐH Mỹ thuật Công nghiệp</option>
                        <option value="NUAE">NUAE - ĐH Sư phạm Nghệ thuật TW</option>
                        <option value="HNUE">HNUE - ĐH Sư phạm Hà Nội</option>
                        <option value="VNUFA">VNUFA - ĐH Mỹ thuật Việt Nam</option>
                        <option value="HOU">HOU - ĐH Mở</option>
                        <option value="VNU-SIS">VNU-SIS - ĐH Quốc gia</option>
                        <option value="KHAC">Khác</option>
                      </select>
                    </Field>
                    <Field label="Khối thi">
                      <select className={inputCls} value={form.examBlock} onChange={e => setField('examBlock', e.target.value)}>
                        <option value="KHOI_V">Khối V (Vẽ Mỹ thuật / Tượng)</option>
                        <option value="KHOI_H">Khối H (Vẽ Bố cục / Người)</option>
                      </select>
                    </Field>
                    {form.targetUniversity === 'KHAC' && (
                      <Field label="Tên trường (tự do)">
                        <input className={inputCls} value={form.customUniversity} onChange={e => setField('customUniversity', e.target.value)} />
                      </Field>
                    )}
                    <div className="sm:col-span-2">
                      <Field label="Mục đích học">
                        <input className={inputCls} value={form.studyGoal} onChange={e => setField('studyGoal', e.target.value)} placeholder="Thi ĐH, Năng khiếu, Bổ túc..." />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Link Facebook">
                        <input className={inputCls} value={form.facebookUrl} onChange={e => setField('facebookUrl', e.target.value)} placeholder="https://facebook.com/..." />
                      </Field>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Save size={15} />
                    <span>{loading ? 'Đang lưu...' : 'Lưu Thông Tin'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveStudy} className="mt-6 space-y-5 text-xs">
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
                    className={inputCls}
                  />
                  <p className="text-[11px] text-slate-400">
                    Thầy cô sẽ bấm trực tiếp vào link này để kiểm tra và nhận xét toàn bộ bài tập của em trong khóa học.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Save size={15} />
                    <span>{loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-bold text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}