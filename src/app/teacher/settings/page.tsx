'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { ChangePasswordCard } from '@/components/account/ChangePasswordCard';
import { useToast } from '@/components/ui/Toast';
import { Teacher } from '@/types/teacher';
import { Save, UserRound, BadgeCheck } from 'lucide-react';

export default function TeacherSettingsPage() {
  const { currentUser } = useApp();
  const toast = useToast();
  const teacherId = currentUser?.id || '';

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: '', email: '', bio: '' });

  useEffect(() => {
    if (!teacherId) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/teachers?id=' + encodeURIComponent(teacherId));
        const data = await res.json();
        if (cancelled) return;
        const t: Teacher | null = data.teacher || null;
        setTeacher(t);
        if (t) {
          setForm({ phone: t.phone || '', email: t.email || '', bio: t.bio || '' });
        }
      } catch (e) {
        if (!cancelled) toast.error('Không tải được hồ sơ giảng viên.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [teacherId, toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    setSaving(true);
    try {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: teacher.id,
          name: teacher.name,
          specialty: teacher.specialty,
          status: teacher.status,
          phone: form.phone.trim(),
          email: form.email.trim(),
          bio: form.bio.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Đã lưu thông tin liên hệ.');
        if (data.teacher) {
          setTeacher(data.teacher);
          setForm({
            phone: data.teacher.phone || '',
            email: data.teacher.email || '',
            bio: data.teacher.bio || '',
          });
        }
      } else {
        toast.error(data.error || 'Lưu thông tin thất bại.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi kết nối mạng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['TEACHER']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="Cài đặt" subtitle="Hồ sơ liên hệ và mật khẩu đăng nhập của bạn" />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          <Card>
            <div className="flex items-center gap-3.5">
              <Avatar name={teacher?.name || currentUser?.name || 'GV'} size={48} />
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {teacher?.name || currentUser?.name || 'Giảng viên'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[12px] font-mono font-semibold text-primary">
                    Mã giảng viên: {teacherId}
                  </span>
                  {teacher?.specialty && (
                    <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                      <BadgeCheck size={13} className="text-primary shrink-0" />
                      {teacher.specialty}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <ChangePasswordCard />

          <Card>
            <CardHeader
              icon={<UserRound size={18} />}
              title="Thông tin liên hệ"
              subtitle="Số điện thoại, email và giới thiệu ngắn của bạn"
            />

            {loading ? (
              <div className="h-40 rounded-card bg-muted animate-pulse border border-line" />
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Số điện thoại">
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0901234567"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="gv@edu.vn"
                    />
                  </Field>
                </div>
                <Field label="Giới thiệu ngắn" hint="Vài dòng về kinh nghiệm giảng dạy của bạn">
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Ví dụ: 5 năm luyện thi khối V, chuyên hình họa tượng thạch cao..."
                  />
                </Field>
                <div className="pt-4 border-t border-line flex items-center justify-end">
                  <Button type="submit" loading={saving} icon={<Save size={16} />}>
                    Lưu thông tin
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </main>
      </div>
    </RoleGuard>
  );
}
