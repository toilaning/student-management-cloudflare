'use client';

import React, { useState, useEffect } from 'react';
import { Phone, ExternalLink, Copy, Check, CalendarDays, GraduationCap } from 'lucide-react';
import { Student } from '@/types/student';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface QuickStudentModalProps {
  studentId: string | null;
  onClose: () => void;
}

 /** Tính tuổi từ ngày sinh (YYYY-MM-DD), trả về null nếu không có. */
 function calcAge(dateOfBirth?: string): number | null {
   if (!dateOfBirth) return null;
   const dob = new Date(dateOfBirth);
   if (Number.isNaN(dob.getTime())) return null;
   const now = new Date();
   let age = now.getFullYear() - dob.getFullYear();
   const m = now.getMonth() - dob.getMonth();
   if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
   return age;
 }

 function resolveSchool(student: Student): string {
   if (student.targetUniversity === 'KHAC') {
     return student.customUniversity || 'Trường khác';
   }
   return student.targetUniversity || 'Chưa cập nhật';
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

  const copyInfo = () => {
    if (!student) return;
    const age = calcAge(student.dateOfBirth);
    const text = `Học viên: ${student.name} (${student.id})
Tuổi: ${age != null ? age + ' tuổi' : 'Chưa cập nhật'}
Trường: ${resolveSchool(student) + (student.gradeLevel ? ' • ' + student.gradeLevel : '')}
SĐT Học sinh: ${student.phone || 'Chưa cập nhật'}
SĐT Phụ huynh: ${student.parentPhone || 'Chưa cập nhật'}
Link Bài tập: ${student.assignmentUrl || 'Chưa có'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusTone =
    student?.status === 'Đang học'
      ? 'success'
      : (student?.status as any) === 'Đã nghỉ học'
      ? 'danger'
      : 'warning';

  return (
    <Sheet
      isOpen={Boolean(studentId)}
      onClose={onClose}
      title={student?.name || (loading ? 'Đang tải thông tin...' : 'Thông tin học sinh')}
      description={studentId ? `Mã học viên: ${studentId}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Đóng
          </Button>
          {student && (
            <Button
              variant="secondary"
              size="md"
              onClick={copyInfo}
              icon={copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            >
              {copied ? 'Đã sao chép' : 'Sao chép thông tin'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 py-1 text-xs">
        {loading ? (
          <div className="space-y-3 py-4">
            <div className="h-10 bg-muted rounded-field animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-muted rounded-field animate-pulse" />
              <div className="h-16 bg-muted rounded-field animate-pulse" />
            </div>
            <div className="h-12 bg-muted rounded-field animate-pulse" />
          </div>
        ) : student ? (
          <>
            <div className="flex items-center justify-between p-3.5 bg-muted rounded-field border border-line">
              <span className="font-semibold text-muted-foreground text-[13px]">Trạng thái</span>
              <Badge tone={statusTone} dot>
                {student.status || 'Đang học'}
              </Badge>
            </div>

            {/* Tên / Tuổi / Trường */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-muted rounded-field border border-line space-y-1">
                <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarDays size={12} /> Tuổi
                </span>
                <span className="font-bold text-foreground text-sm tabular">
                  {calcAge(student.dateOfBirth) != null ? calcAge(student.dateOfBirth) + ' tuổi' : 'Chưa cập nhật'}
                </span>
              </div>
              <div className="p-3 bg-muted rounded-field border border-line space-y-1 sm:col-span-2">
                <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-1">
                  <GraduationCap size={12} /> Trường
                </span>
                <span className="font-bold text-foreground text-sm">
                  {resolveSchool(student)}
                  {student.gradeLevel ? ' • ' + student.gradeLevel : ''}
                </span>
              </div>
            </div>

            {/* SĐT Học sinh & SĐT Phụ huynh */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-field border border-line space-y-1">
                <span className="text-[12px] font-medium text-muted-foreground">SĐT học viên</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground text-sm tabular">
                    {student.phone || 'Chưa cập nhật'}
                  </span>
                  {student.phone && (
                    <a
                      href={`tel:${student.phone}`}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-primary hover:bg-primary-soft hover:text-primary-ink transition"
                      title="Gọi học viên"
                    >
                      <Phone size={13} />
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3 bg-muted rounded-field border border-line space-y-1">
                <span className="text-[12px] font-medium text-muted-foreground">SĐT phụ huynh</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground text-sm tabular">
                    {student.parentPhone || 'Chưa cập nhật'}
                  </span>
                  {student.parentPhone && (
                    <a
                      href={`tel:${student.parentPhone}`}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-primary hover:bg-primary-soft hover:text-primary-ink transition"
                      title="Gọi phụ huynh"
                    >
                      <Phone size={13} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Link bài tập */}
            <div className="p-3 bg-muted rounded-field border border-line space-y-1">
              <span className="text-[12px] font-medium text-muted-foreground">Link bài tập tổng hợp</span>
              {student.assignmentUrl ? (
                <a
                  href={student.assignmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:text-primary-hover font-semibold text-sm truncate"
                >
                  <span className="truncate">{student.assignmentUrl}</span>
                  <ExternalLink size={13} className="shrink-0" />
                </a>
              ) : (
                <p className="text-subtle-foreground text-xs italic">Chưa cập nhật link bài tập</p>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            title="Không tìm thấy học sinh"
            description="Không có dữ liệu cho mã học viên này."
          />
        )}
      </div>
    </Sheet>
  );
}
