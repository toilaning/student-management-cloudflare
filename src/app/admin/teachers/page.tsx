'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Teacher } from '@/types/teacher';
import { DataTable, Pager, Column } from '@/components/ui/DataTable';
import { SegmentedControl, TabItem } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Card, StatCard } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Coins,
} from 'lucide-react';

function money(v?: number) {
  if (!v) return '0đ';
  return v.toLocaleString('vi-VN') + 'đ';
}

export default function AdminTeachersPage() {
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sheet Thêm giảng viên
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    hourlyRate: 350000,
    phone: '',
    email: '',
    bio: '',
  });

  // Sheet Sửa giảng viên
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    specialty: '',
    hourlyRate: 350000,
    phone: '',
    email: '',
    bio: '',
    status: 'Đang dạy' as 'Đang dạy' | 'Nghỉ phép',
  });

  // Sheet Xác nhận xóa
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTeachers = async () => {
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải danh sách giáo viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.specialty.trim()) {
      toast.error('Vui lòng điền đủ họ tên, chuyên môn và số điện thoại');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Thêm giáo viên mới thành công');
        setShowAddSheet(false);
        setFormData({ name: '', specialty: '', hourlyRate: 350000, phone: '', email: '', bio: '' });
        await loadTeachers();
      } else {
        toast.error(data.error || 'Thêm giáo viên thất bại');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi mạng khi thêm giáo viên');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (tc: Teacher) => {
    setEditFormData({
      id: tc.id,
      name: tc.name,
      specialty: tc.specialty,
      hourlyRate: tc.hourlyRate || 350000,
      phone: tc.phone || '',
      email: tc.email || '',
      bio: tc.bio || '',
      status: tc.status === 'Đang dạy' ? 'Đang dạy' : 'Nghỉ phép',
    });
    setShowEditSheet(true);
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name.trim() || !editFormData.phone.trim() || !editFormData.specialty.trim()) {
      toast.error('Vui lòng điền đủ họ tên, chuyên môn và số điện thoại');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Cập nhật giáo viên thành công');
        setShowEditSheet(false);
        await loadTeachers();
      } else {
        toast.error(data.error || 'Cập nhật giáo viên thất bại');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi mạng khi cập nhật giáo viên');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/teachers?id=' + encodeURIComponent(deletingTeacher.id), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || ('Đã xóa giáo viên ' + deletingTeacher.name));
        setDeletingTeacher(null);
        await loadTeachers();
      } else {
        toast.error(data.error || 'Xóa giáo viên thất bại');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi mạng khi xóa giáo viên');
    } finally {
      setIsDeleting(false);
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    const active = teachers.filter((t) => t.status === 'Đang dạy').length;
    const paused = teachers.length - active;
    const avgRate = teachers.length > 0
      ? Math.round(teachers.reduce((s, t) => s + (t.hourlyRate || 0), 0) / teachers.length)
      : 0;

    return {
      total: teachers.length,
      active,
      paused,
      avgRate,
    };
  }, [teachers]);

  const filterTabs: TabItem<string>[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Tất cả', count: teachers.length },
      { value: 'ACTIVE', label: 'Đang dạy', count: stats.active },
      { value: 'PAUSED', label: 'Tạm nghỉ', count: stats.paused },
    ];
  }, [teachers.length, stats.active, stats.paused]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return teachers.filter((t) => {
      if (statusFilter === 'ACTIVE' && t.status !== 'Đang dạy') return false;
      if (statusFilter === 'PAUSED' && t.status === 'Đang dạy') return false;
      if (!q) return true;
      return (
        t.name?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.specialty?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      );
    });
  }, [teachers, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedTeachers = useMemo(() => {
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filtered, currentPage, pageSize]);

  const columns: Column<Teacher>[] = [
    {
      key: 'teacher',
      header: 'Giáo viên',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size={38} />
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-[14px] leading-tight truncate">{row.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[11px] text-muted-foreground">{row.id}</span>
              {row.email && (
                <span className="text-[11px] text-subtle-foreground truncate max-w-[140px] sm:max-w-none">
                  {row.email}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'specialty',
      header: 'Chuyên môn',
      render: (row) => (
        <Badge tone="info" className="text-[12px]">
          {row.specialty}
        </Badge>
      ),
    },
    {
      key: 'hourlyRate',
      header: 'Đơn giá giờ dạy',
      className: 'tabular',
      render: (row) => (
        <span className="font-semibold text-foreground text-[13px] tabular">
          {money(row.hourlyRate)}
          <span className="text-[11px] text-muted-foreground font-normal"> /giờ</span>
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      render: (row) => (
        <span className="text-muted-foreground text-[13px] font-mono tabular">
          {row.phone}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'w-28 whitespace-nowrap',
      render: (row) => {
        const isTeaching = row.status === 'Đang dạy';
        return (
          <Badge tone={isTeaching ? 'success' : 'warning'} dot>
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      className: 'w-28 whitespace-nowrap',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => handleOpenEdit(row)}
            aria-label="Sửa thông tin"
          >
            <Edit size={15} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-danger"
            onClick={() => setDeletingTeacher(row)}
            aria-label="Xóa giáo viên"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title="Quản lý giáo viên"
          subtitle="Danh sách đội ngũ giáo viên, chuyên môn giảng dạy và đơn giá tiết dạy"
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* Thống kê tổng quan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Tổng số giáo viên"
              value={stats.total}
              icon={<Users size={20} />}
              tone="primary"
            />
            <StatCard
              label="Đang tham gia giảng dạy"
              value={stats.active}
              icon={<UserCheck size={20} />}
              tone="success"
            />
            <StatCard
              label="Đang tạm nghỉ"
              value={stats.paused}
              icon={<UserX size={20} />}
              tone="warning"
            />
            <StatCard
              label="Đơn giá giờ bình quân"
              value={money(stats.avgRate)}
              icon={<Coins size={20} />}
              tone="info"
            />
          </div>

          {/* Thanh công cụ: Tìm kiếm, Bộ lọc & Nút thêm */}
          <Card padded={false} className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <SearchInput
                value={searchTerm}
                onChange={(v) => {
                  setSearchTerm(v);
                  setCurrentPage(1);
                }}
                placeholder="Tìm tên, mã giáo viên, môn, điện thoại..."
                className="w-full sm:w-80"
              />

              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => setShowAddSheet(true)}
              >
                Thêm giáo viên
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-line">
              <SegmentedControl
                items={filterTabs}
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
              />
              <p className="text-[12px] text-muted-foreground tabular shrink-0">
                Hiển thị <span className="font-bold text-foreground">{filtered.length}</span> / {teachers.length} giáo viên
              </p>
            </div>
          </Card>

          {/* Bảng dữ liệu */}
          <DataTable
            columns={columns}
            rows={paginatedTeachers}
            rowKey={(row) => row.id}
            loading={loading}
            emptyTitle="Không tìm thấy giáo viên"
            emptyDescription="Không có giáo viên nào khớp với điều kiện tìm kiếm hiện tại."
            emptyIcon={<Users size={28} />}
            renderMobile={(row) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.name} size={40} />
                    <div>
                      <p className="font-bold text-foreground text-[14px] leading-tight">{row.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{row.id}</p>
                    </div>
                  </div>
                  <Badge tone={row.status === 'Đang dạy' ? 'success' : 'warning'} dot>
                    {row.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px] pt-1 border-t border-line">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Chuyên môn</span>
                    <span className="font-semibold text-foreground">{row.specialty}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Đơn giá giờ</span>
                    <span className="font-semibold text-foreground tabular">{money(row.hourlyRate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Điện thoại</span>
                    <span className="font-mono text-foreground">{row.phone}</span>
                  </div>
                  {row.email && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Email</span>
                      <span className="text-foreground truncate block">{row.email}</span>
                    </div>
                  )}
                </div>

                {row.bio && (
                  <p className="text-[12px] text-muted-foreground line-clamp-2 italic bg-muted/50 p-2 rounded-field">
                    {row.bio}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-line">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Edit size={14} />}
                    onClick={() => handleOpenEdit(row)}
                  >
                    Chỉnh sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft/20"
                    icon={<Trash2 size={14} />}
                    onClick={() => setDeletingTeacher(row)}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            )}
            footer={
              <Pager
                page={currentPage}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setCurrentPage(1);
                }}
              />
            }
          />
        </main>

        {/* Sheet Thêm giáo viên */}
        <Sheet
          isOpen={showAddSheet}
          onClose={() => setShowAddSheet(false)}
          title="Thêm giáo viên mới"
          description="Khai báo hồ sơ giáo viên để phân công giảng dạy và tính thù lao"
          footer={
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => setShowAddSheet(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={isSubmittingAdd}
                onClick={handleAddTeacher}
              >
                Lưu giáo viên
              </Button>
            </div>
          }
        >
          <form onSubmit={handleAddTeacher} className="space-y-4 pt-1">
            <Field label="Họ và tên" required>
              <Input
                required
                placeholder="Ví dụ: Thầy Trần Quang Huy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Chuyên môn giảng dạy" required>
                <Input
                  required
                  placeholder="Ví dụ: Toán Nâng Cao, IELTS..."
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
              </Field>
              <Field label="Đơn giá giờ dạy (VNĐ)" required>
                <Input
                  type="number"
                  required
                  step={10000}
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Số điện thoại" required>
                <Input
                  required
                  placeholder="0913..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Field>
              <Field label="Địa chỉ Email">
                <Input
                  type="email"
                  placeholder="giaovien@edu.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Mô tả / Tiểu sử ngắn">
              <Textarea
                placeholder="Kinh nghiệm giảng dạy, chứng chỉ chuyên môn..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </Field>
          </form>
        </Sheet>

        {/* Sheet Chỉnh sửa giáo viên */}
        <Sheet
          isOpen={showEditSheet}
          onClose={() => setShowEditSheet(false)}
          title="Chỉnh sửa giáo viên"
          description={editFormData.id ? ('Mã giáo viên: ' + editFormData.id) : undefined}
          footer={
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="secondary" onClick={() => setShowEditSheet(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={isSubmittingEdit}
                onClick={handleUpdateTeacher}
              >
                Lưu thay đổi
              </Button>
            </div>
          }
        >
          <form onSubmit={handleUpdateTeacher} className="space-y-4 pt-1">
            <Field label="Họ và tên" required>
              <Input
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Chuyên môn" required>
                <Input
                  required
                  value={editFormData.specialty}
                  onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                />
              </Field>
              <Field label="Trạng thái" required>
                <Select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as 'Đang dạy' | 'Nghỉ phép' })}
                >
                  <option value="Đang dạy">Đang dạy</option>
                  <option value="Nghỉ phép">Tạm nghỉ</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Số điện thoại" required>
                <Input
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </Field>
              <Field label="Đơn giá giờ dạy (VNĐ)" required>
                <Input
                  type="number"
                  required
                  step={10000}
                  value={editFormData.hourlyRate}
                  onChange={(e) => setEditFormData({ ...editFormData, hourlyRate: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="Địa chỉ Email">
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </Field>

            <Field label="Mô tả / Tiểu sử">
              <Textarea
                value={editFormData.bio}
                onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
              />
            </Field>
          </form>
        </Sheet>

        {/* Sheet Xác nhận xóa giáo viên */}
        <Sheet
          isOpen={!!deletingTeacher}
          onClose={() => !isDeleting && setDeletingTeacher(null)}
          title="Xác nhận xóa giáo viên"
          size="sm"
          footer={
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                disabled={isDeleting}
                onClick={() => setDeletingTeacher(null)}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                loading={isDeleting}
                icon={<Trash2 size={15} />}
                onClick={handleDeleteTeacher}
              >
                Xóa vĩnh viễn
              </Button>
            </div>
          }
        >
          {deletingTeacher && (
            <div className="space-y-3 pt-1 text-[13px]">
              <div className="p-3.5 rounded-field bg-muted space-y-1.5 border border-line">
                <p className="font-semibold text-foreground text-sm">{deletingTeacher.name}</p>
                <p className="font-mono text-[12px] text-muted-foreground">Mã: {deletingTeacher.id}</p>
                <p className="text-[12px] text-muted-foreground">Chuyên môn: {deletingTeacher.specialty}</p>
              </div>

              <div className="p-3 rounded-field bg-danger-soft/40 border border-danger-soft text-danger text-[12px] flex items-start gap-2 leading-relaxed">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Thao tác này sẽ gỡ phân công giáo viên khỏi các lớp hiện tại, gỡ liên kết trong lịch học và xóa tài khoản đăng nhập tương ứng. Không thể hoàn tác.
                </span>
              </div>
            </div>
          )}
        </Sheet>
      </div>
    </RoleGuard>
  );
}

