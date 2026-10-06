'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { ChangePasswordCard } from '@/components/account/ChangePasswordCard';
import { Student } from '@/types/student';
import {
  Link as LinkIcon,
  Save,
  ExternalLink,
  UserRound,
  GraduationCap,
} from 'lucide-react';

type Tab = 'profile' | 'study' | 'security';

export default function StudentSettingsPage() {
  const { currentUser } = useApp();
  const toast = useToast();
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
        toast.error('Không thể tải thông tin học sinh.');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    }
    loadData();
  }, [studentId, initialized, toast]);

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSaveStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    await save({ assignmentUrl: assignmentUrl.trim() }, 'Cập nhật hồ sơ học tập thành công.');
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
      'Cập nhật thông tin cá nhân thành công.'
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
        toast.success(msg);
      } else {
        toast.error(data.error || 'Cập nhật thất bại.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Lỗi kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['STUDENT']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title="Cài đặt & hồ sơ"
          subtitle="Chỉnh sửa thông tin cá nhân và hồ sơ học tập"
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* Thẻ định danh học viên */}
          <Card>
            <div className="flex items-center gap-3.5">
              <Avatar name={form.name || currentUser?.name || 'H'} size={48} />
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {form.name || currentUser?.name || 'Học viên'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[12px] font-mono font-semibold text-primary">
                    Mã học viên: {studentId}
                  </span>
                  {form.gradeLevel && (
                    <span className="text-[12px] text-muted-foreground">
                      • {form.gradeLevel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Dải chuyển tab */}
          <SegmentedControl<Tab>
            items={[
              { value: 'profile', label: 'Thông tin cá nhân' },
              { value: 'study', label: 'Hồ sơ học tập' },
              { value: 'security', label: 'Đổi mật khẩu' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />

          {loading && !initialized ? (
            <div className="h-96 rounded-card bg-muted animate-pulse border border-line" />
          ) : activeTab === 'profile' ? (
            <Card>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Mục 1: Thông tin cơ bản */}
                <div>
                  <CardHeader
                    icon={<UserRound size={18} />}
                    title="Thông tin cơ bản"
                    subtitle="Thông tin liên hệ và lý lịch học viên"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Họ và tên" required>
                      <Input
                        value={form.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder="Nguyễn Văn A"
                        required
                      />
                    </Field>
                    <Field label="Số điện thoại">
                      <Input
                        value={form.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        placeholder="0381234567"
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                        placeholder="email@example.com"
                      />
                    </Field>
                    <Field label="SĐT phụ huynh">
                      <Input
                        value={form.parentPhone}
                        onChange={(e) => setField('parentPhone', e.target.value)}
                        placeholder="0901234567"
                      />
                    </Field>
                    <Field label="Ngày sinh">
                      <Input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => setField('dateOfBirth', e.target.value)}
                      />
                    </Field>
                    <Field label="Giới tính">
                      <Select
                        value={form.gender}
                        onChange={(e) => setField('gender', e.target.value as 'Nam' | 'Nữ')}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </Select>
                    </Field>
                    <Field label="Địa chỉ" className="sm:col-span-2">
                      <Input
                        value={form.address}
                        onChange={(e) => setField('address', e.target.value)}
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                      />
                    </Field>
                    <Field label="Quê quán">
                      <Input
                        value={form.homeTown}
                        onChange={(e) => setField('homeTown', e.target.value)}
                        placeholder="Tỉnh/Thành phố quê quán"
                      />
                    </Field>
                    <Field label="Lớp (hiện tại / thí sinh tự do)">
                      <Input
                        value={form.gradeLevel}
                        onChange={(e) => setField('gradeLevel', e.target.value)}
                        placeholder="Lớp 12, Thí sinh tự do..."
                      />
                    </Field>
                  </div>
                </div>

                {/* Mục 2: Mục tiêu luyện thi */}
                <div className="pt-5 border-t border-line">
                  <CardHeader
                    icon={<GraduationCap size={18} />}
                    title="Mục tiêu luyện thi"
                    subtitle="Định hướng trường đại học và khối thi năng khiếu"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Trường đại học mục tiêu">
                      <Select
                        value={form.targetUniversity}
                        onChange={(e) => setField('targetUniversity', e.target.value)}
                      >
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
                      </Select>
                    </Field>
                    <Field label="Khối thi">
                      <Select
                        value={form.examBlock}
                        onChange={(e) => setField('examBlock', e.target.value as 'KHOI_V' | 'KHOI_H')}
                      >
                        <option value="KHOI_V">Khối V (Vẽ Mỹ thuật / Tượng)</option>
                        <option value="KHOI_H">Khối H (Vẽ Bố cục / Người)</option>
                      </Select>
                    </Field>
                    {form.targetUniversity === 'KHAC' && (
                      <Field label="Tên trường (tự do)">
                        <Input
                          value={form.customUniversity}
                          onChange={(e) => setField('customUniversity', e.target.value)}
                          placeholder="Nhập tên trường đại học..."
                        />
                      </Field>
                    )}
                    <Field label="Mục đích học" className="sm:col-span-2">
                      <Input
                        value={form.studyGoal}
                        onChange={(e) => setField('studyGoal', e.target.value)}
                        placeholder="Thi ĐH, Năng khiếu, Bổ túc..."
                      />
                    </Field>
                    <Field label="Link Facebook" className="sm:col-span-2">
                      <Input
                        value={form.facebookUrl}
                        onChange={(e) => setField('facebookUrl', e.target.value)}
                        placeholder="https://facebook.com/..."
                      />
                    </Field>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end">
                  <Button
                    type="submit"
                    loading={loading}
                    icon={<Save size={16} />}
                  >
                    Lưu thông tin
                  </Button>
                </div>
              </form>
            </Card>
          ) : activeTab === 'study' ? (
            <Card>
              <form onSubmit={handleSaveStudy} className="space-y-6">
                <CardHeader
                  icon={<LinkIcon size={18} />}
                  title="Hồ sơ học tập"
                  subtitle="Lưu trữ link bài làm và sản phẩm học tập trong khóa học"
                  action={
                    assignmentUrl ? (
                      <a
                        href={assignmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1.5"
                      >
                        <span>Mở link bài làm</span>
                        <ExternalLink size={13} />
                      </a>
                    ) : undefined
                  }
                />

                <Field
                  label="Link tổng hợp bài làm (Google Drive / Notion / GitHub / Figma)"
                  hint="Giảng viên sẽ bấm trực tiếp vào link này để kiểm tra và nhận xét toàn bộ bài tập của bạn trong khoá học."
                >
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/... hoặc https://notion.so/..."
                    value={assignmentUrl}
                    onChange={(e) => setAssignmentUrl(e.target.value)}
                  />
                </Field>

                <div className="pt-4 border-t border-line flex items-center justify-end">
                  <Button
                    type="submit"
                    loading={loading}
                    icon={<Save size={16} />}
                  >
                    Lưu hồ sơ học tập
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <ChangePasswordCard />
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
