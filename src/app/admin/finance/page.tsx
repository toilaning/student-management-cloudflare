'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import {
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Clock,
  UserCheck,
} from 'lucide-react';
import { ManualExpense, TeacherTimesheetSummary, LedgerMonthlySummary } from '@/types/ledger';
import { ScheduleSlot } from '@/types/schedule';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/Tabs';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Sheet } from '@/components/ui/Sheet';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

export default function AdminFinanceLedgerPage() {
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [loading, setLoading] = useState(true);

  const toast = useToast();

  const [ledger, setLedger] = useState<LedgerMonthlySummary | null>(null);
  const [timesheets, setTimesheets] = useState<TeacherTimesheetSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'timesheet' | 'expenses'>('timesheet');

  // Modal / Sheet Thêm khoản chi nhập tay
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: 1000000,
    category: 'Vận hành' as 'Mặt bằng' | 'Thiết bị' | 'Giáo trình' | 'Vận hành' | 'Khác',
    expenseDate: new Date().toISOString().split('T')[0],
    note: '',
  });

  // Sheet Xác nhận xóa khoản chi
  const [expenseToDelete, setExpenseToDelete] = useState<ManualExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  // Sheet chấm công bù cho giáo viên
  const [makeupTeacher, setMakeupTeacher] = useState<TeacherTimesheetSummary | null>(null);
  const [makeupSlots, setMakeupSlots] = useState<ScheduleSlot[]>([]);
  const [makeupLoading, setMakeupLoading] = useState(false);
  const [makeupBusyId, setMakeupBusyId] = useState<string | null>(null);
  const [makeupForm, setMakeupForm] = useState<Record<string, { checkinTime: string; checkoutTime: string }>>({});

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance/ledger?month=' + selectedMonth);
      const data = await res.json();
      if (data.success) {
        setLedger(data.ledger);
        setTimesheets(data.timesheets || []);
      } else {
        toast.error(data.error || 'Không thể tải dữ liệu sổ thu chi');
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu sổ thu chi:', e);
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [selectedMonth]);

  const openMakeupSheet = async (tc: TeacherTimesheetSummary) => {
    setMakeupTeacher(tc);
    setMakeupSlots([]);
    setMakeupForm({});
    setMakeupLoading(true);
    try {
      const res = await fetch(
        '/api/teacher-checkin?teacherId=' + encodeURIComponent(tc.teacherId) + '&month=' + selectedMonth
      );
      const data = await res.json();
      const slots: ScheduleSlot[] = (data.slots || []).filter((s: ScheduleSlot) => s.status !== 'Đã hủy');
      setMakeupSlots(slots);
      const form: Record<string, { checkinTime: string; checkoutTime: string }> = {};
      slots.forEach((s) => {
        form[s.id] = { checkinTime: s.checkinTime || '', checkoutTime: s.checkoutTime || '' };
      });
      setMakeupForm(form);
    } catch {
      toast.error('Không tải được sổ chấm công của giáo viên');
    } finally {
      setMakeupLoading(false);
    }
  };

  const saveMakeupSlot = async (slot: ScheduleSlot) => {
    const form = makeupForm[slot.id] || { checkinTime: '', checkoutTime: '' };
    setMakeupBusyId(slot.id);
    try {
      const res = await fetch('/api/teacher-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADMIN_SET',
          slotId: slot.id,
          checkinTime: form.checkinTime,
          checkoutTime: form.checkoutTime,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated: ScheduleSlot = data.slot;
        setMakeupSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast.success('Đã lưu chấm công ca ' + slot.id);
      } else {
        toast.error(data.error || 'Lưu chấm công thất bại');
      }
    } catch {
      toast.error('Lỗi mạng, bạn thử lại nhé');
    } finally {
      setMakeupBusyId(null);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount) {
      toast.error('Vui lòng điền đủ tên khoản chi và số tiền');
      return;
    }

    setSubmittingExpense(true);
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: expenseForm.title.trim(),
          amount: Number(expenseForm.amount),
          category: expenseForm.category,
          expenseDate: expenseForm.expenseDate,
          note: expenseForm.note.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã thêm khoản chi thành công');
        setShowExpenseModal(false);
        setExpenseForm({
          title: '',
          amount: 1000000,
          category: 'Vận hành',
          expenseDate: new Date().toISOString().split('T')[0],
          note: '',
        });
        await loadFinanceData();
      } else {
        toast.error(data.error || 'Thêm thất bại');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối');
    } finally {
      setSubmittingExpense(false)
    }
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setDeletingExpense(true);
    try {
      const res = await fetch('/api/finance/expenses?id=' + expenseToDelete.id, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã xóa khoản chi');
        setExpenseToDelete(null);
        await loadFinanceData();
      } else {
        toast.error(data.error || 'Xóa khoản chi thất bại');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi mạng khi xóa');
    } finally {
      setDeletingExpense(false);
    }
  };

  const monthParts = selectedMonth.split('-');
  const monthLabel = 'Tháng ' + (monthParts[1] || '') + ' / ' + (monthParts[0] || '');

  const timesheetColumns: Column<TeacherTimesheetSummary>[] = [
    {
      key: 'teacher',
      header: 'Mã & Giảng viên',
      render: (tc) => (
        <div>
          <p className="font-semibold text-foreground text-sm">{tc.teacherName}</p>
          <p className="text-[12px] font-mono text-muted-foreground">{tc.teacherId}</p>
        </div>
      ),
    },
    {
      key: 'sessions',
      header: 'Ca đã chấm / đã xếp',
      align: 'center',
      render: (tc) => (
        <div className="inline-flex items-center gap-2 justify-center">
          <span className="font-bold text-foreground tabular">{tc.checkedInSessions ?? 0}</span>
          <span className="text-muted-foreground tabular">/ {tc.scheduledSessions ?? tc.totalSessions}</span>
          {(tc.lateSessions ?? 0) > 0 && <Badge tone="warning">{tc.lateSessions} muộn</Badge>}
        </div>
      ),
    },
    {
      key: 'paid',
      header: 'Ca tính lương',
      align: 'center',
      render: (tc) => <span className="font-semibold text-foreground tabular">{tc.totalSessions} ca</span>,
    },
    {
      key: 'rate',
      header: 'Đơn giá / Buổi',
      align: 'right',
      render: (tc) => (
        <span className="text-muted-foreground tabular">{tc.ratePerSession.toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      key: 'earnings',
      header: 'Tổng tiền công',
      align: 'right',
      render: (tc) => (
        <span className="font-extrabold text-foreground tabular">{tc.totalEarnings.toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      render: (tc) => {
        const tone = tc.status === 'ĐÃ_CHI' ? 'success' : tc.status === 'ĐÃ_CHỐT' ? 'info' : 'warning';
        const text = tc.status === 'ĐÃ_CHI' ? 'Đã chi' : tc.status === 'ĐÃ_CHỐT' ? 'Đã chốt' : 'Chưa chốt chi';
        return <Badge tone={tone} dot>{text}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Chấm công',
      align: 'right',
      render: (tc) => (
        <Button
          size="sm"
          variant="secondary"
          icon={<UserCheck size={14} />}
          onClick={() => openMakeupSheet(tc)}
        >
          Chấm công bù
        </Button>
      ),
    },
  ];

  const expenseColumns: Column<ManualExpense>[] = [
    {
      key: 'title',
      header: 'Tên khoản chi',
      render: (exp) => <span className="font-semibold text-foreground text-sm">{exp.title}</span>,
    },
    {
      key: 'category',
      header: 'Danh mục',
      render: (exp) => <Badge tone="neutral">{exp.category}</Badge>,
    },
    {
      key: 'date',
      header: 'Ngày chi',
      render: (exp) => <span className="text-xs text-muted-foreground tabular">{exp.expenseDate}</span>,
    },
    {
      key: 'amount',
      header: 'Số tiền',
      align: 'right',
      render: (exp) => (
        <span className="font-bold text-danger tabular">{exp.amount.toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      key: 'note',
      header: 'Ghi chú',
      render: (exp) => <span className="text-xs text-muted-foreground italic">{exp.note || '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (exp) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-danger"
          icon={<Trash2 size={15} />}
          onClick={() => setExpenseToDelete(exp)}
          aria-label="Xóa khoản chi"
        />
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title="Sổ thu chi và quỹ"
          subtitle="Quản lý dòng tiền, lương giảng viên và chi phí vận hành"
        />

        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* Thanh điều khiển kỳ kế toán & nút thêm chi phí */}
          <Card className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sổ kế toán kỳ:</span>
                <Badge tone="primary" className="font-mono font-bold text-xs">
                  {monthLabel}
                </Badge>
              </div>

              <div className="flex items-center gap-2.5 justify-between sm:justify-end">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-10 px-3 rounded-field bg-muted border border-line text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary tabular cursor-pointer"
                />
                <Button
                  variant="primary"
                  size="md"
                  icon={<Plus size={16} />}
                  onClick={() => setShowExpenseModal(true)}
                >
                  Ghi nhận chi phí
                </Button>
              </div>
            </div>

            {/* 12 Tháng Quick Tabs */}
            <div className="pt-3 border-t border-line flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[12px] font-semibold text-muted-foreground whitespace-nowrap mr-1">Tháng:</span>
              {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, '0');
                const year = selectedMonth.split('-')[0] || '2026';
                const targetKey = year + '-' + m;
                const isSelected = selectedMonth === targetKey;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonth(targetKey)}
                    className={cn(
                      'px-3 h-8 rounded-pill text-[12px] font-semibold whitespace-nowrap transition cursor-pointer',
                      isSelected
                        ? 'bg-primary text-white shadow-primary'
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    )}
                  >
                    T{i + 1}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* 3 Khối tài chính: Thu - Chi = Lãi ròng */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              label="1. Thu học phí thực tế"
              value={((ledger?.totalRevenue || 0)).toLocaleString('vi-VN') + ' đ'}
              hint={'Ghi nhận ' + (ledger?.invoicesCount || 0) + ' lượt đóng học phí'}
              tone="success"
              icon={<ArrowUpRight size={18} />}
            />
            <StatCard
              label="2. Tổng chi phí (Lương + Vận hành)"
              value={((ledger?.totalExpense || 0)).toLocaleString('vi-VN') + ' đ'}
              hint={
                'Lương: ' +
                (((ledger?.totalTeacherExpense || 0) / 1000000)).toFixed(1) +
                'M • Vận hành: ' +
                (((ledger?.totalManualExpense || 0) / 1000000)).toFixed(1) +
                'M'
              }
              tone="danger"
              icon={<ArrowDownRight size={18} />}
            />
            <StatCard
              label="3. Lãi ròng thực tế"
              value={((ledger?.netProfit || 0)).toLocaleString('vi-VN') + ' đ'}
              hint={'Dòng tiền ròng ' + monthLabel}
              tone={(ledger?.netProfit || 0) >= 0 ? 'primary' : 'warning'}
              icon={(ledger?.netProfit || 0) >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            />
          </section>

          {/* Tabs chuyển đổi: Chấm công giảng viên | Sổ chi ngoài */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <SegmentedControl
                items={[
                  {
                    value: 'timesheet',
                    label: 'Thù lao giảng viên theo ca',
                    count: timesheets.length,
                  },
                  {
                    value: 'expenses',
                    label: 'Sổ chi vận hành ngoài',
                    count: ledger?.expenses?.length || 0,
                  },
                ]}
                value={activeTab}
                onChange={(v) => setActiveTab(v as any)}
              />

              <p className="text-[12px] font-semibold text-muted-foreground">
                {activeTab === 'timesheet'
                  ? 'Tổng chi lương: ' + ((ledger?.totalTeacherExpense || 0)).toLocaleString('vi-VN') + ' đ'
                  : 'Tổng chi ngoài: ' + ((ledger?.totalManualExpense || 0)).toLocaleString('vi-VN') + ' đ'}
              </p>
            </div>

            {activeTab === 'timesheet' && (
              <DataTable
                columns={timesheetColumns}
                rows={timesheets}
                rowKey={(tc) => tc.teacherId}
                loading={loading}
                emptyTitle="Chưa có dữ liệu thù lao"
                emptyDescription="Không có ca dạy nào hoàn thành trong kỳ kế toán này."
                emptyIcon={<Coins size={24} />}
                renderMobile={(tc) => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{tc.teacherName}</p>
                        <p className="text-[12px] font-mono text-muted-foreground">{tc.teacherId}</p>
                      </div>
                      <Badge
                        tone={tc.status === 'ĐÃ_CHI' ? 'success' : tc.status === 'ĐÃ_CHỐT' ? 'info' : 'warning'}
                        dot
                      >
                        {tc.status === 'ĐÃ_CHI' ? 'Đã chi' : tc.status === 'ĐÃ_CHỐT' ? 'Đã chốt' : 'Chưa chốt chi'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-line">
                      <span className="text-muted-foreground">{tc.totalSessions} ca × {tc.ratePerSession.toLocaleString('vi-VN')} đ</span>
                      <span className="font-extrabold text-foreground tabular">{tc.totalEarnings.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                )}
              />
            )}

            {activeTab === 'expenses' && (
              <DataTable
                columns={expenseColumns}
                rows={ledger?.expenses || []}
                rowKey={(exp) => exp.id}
                loading={loading}
                emptyTitle="Chưa có khoản chi nào"
                emptyDescription={'Chưa ghi nhận khoản chi vận hành nào trong ' + monthLabel + '.'}
                emptyIcon={<Receipt size={24} />}
                renderMobile={(exp) => (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{exp.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge tone="neutral">{exp.category}</Badge>
                          <span className="text-[12px] text-muted-foreground tabular">{exp.expenseDate}</span>
                        </div>
                      </div>
                      <span className="font-bold text-danger tabular">{exp.amount.toLocaleString('vi-VN')} đ</span>
                    </div>
                    {exp.note && (
                      <p className="text-xs text-muted-foreground italic">{exp.note}</p>
                    )}
                    <div className="flex items-center justify-end pt-1 border-t border-line">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft"
                        icon={<Trash2 size={14} />}
                        onClick={() => setExpenseToDelete(exp)}
                      >
                        Xóa khoản chi
                      </Button>
                    </div>
                  </div>
                )}
              />
            )}
          </div>
        </main>

        {/* Sheet Ghi nhận chi phí mới */}
        <Sheet
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          title="Ghi nhận khoản chi mới"
          description="Thêm khoản chi phát sinh vào sổ quỹ trung tâm"
          size="md"
          footer={
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 w-full">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowExpenseModal(false)}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={submittingExpense}
                onClick={handleAddExpense}
              >
                Lưu khoản chi
              </Button>
            </div>
          }
        >
          <form onSubmit={handleAddExpense} className="space-y-4 pt-1">
            <Field label="Tên khoản chi" required>
              <Input
                type="text"
                required
                placeholder="Ví dụ: Tiền điện nước, Mua giáo trình, Thuê phòng học..."
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label="Số tiền (VNĐ)" required>
                <Input
                  type="number"
                  required
                  step={50000}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                />
              </Field>

              <Field label="Danh mục chi" required>
                <Select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                >
                  <option value="Vận hành">Vận hành</option>
                  <option value="Mặt bằng">Mặt bằng</option>
                  <option value="Thiết bị">Thiết bị</option>
                  <option value="Giáo trình">Giáo trình</option>
                  <option value="Khác">Khác</option>
                </Select>
              </Field>
            </div>

            <Field label="Ngày chi" required>
              <Input
                type="date"
                required
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
              />
            </Field>

            <Field label="Ghi chú thêm" hint="Hóa đơn VAT, người nhận, mục đích chi...">
              <Textarea
                rows={2}
                placeholder="Nhập ghi chú nếu có..."
                value={expenseForm.note}
                onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
              />
            </Field>
          </form>
        </Sheet>

        {/* Sheet xác nhận xóa khoản chi */}
        {/* Sheet chấm công bù cho giáo viên */}
        <Sheet
          isOpen={Boolean(makeupTeacher)}
          onClose={() => setMakeupTeacher(null)}
          title="Chấm công bù"
          description={
            makeupTeacher
              ? makeupTeacher.teacherName + ' • ' + monthLabel
              : undefined
          }
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="secondary" onClick={() => setMakeupTeacher(null)}>
                Đóng
              </Button>
            </div>
          }
        >
          {makeupLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-card bg-muted animate-pulse" />
              ))}
            </div>
          ) : makeupSlots.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tháng này giáo viên chưa có ca dạy nào.
            </div>
          ) : (
            <div className="space-y-2.5">
              {makeupSlots.map((slot) => {
                const form = makeupForm[slot.id] || { checkinTime: '', checkoutTime: '' };
                const changed =
                  form.checkinTime !== (slot.checkinTime || '') ||
                  form.checkoutTime !== (slot.checkoutTime || '');
                const invalidCheckout = !!form.checkoutTime && !form.checkinTime;
                return (
                  <div
                    key={slot.id}
                    className="p-3.5 rounded-card border border-line bg-card space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm">{slot.classId}</span>
                          <span className="text-[12px] text-muted-foreground tabular">{slot.date}</span>
                          <span className="text-[12px] text-muted-foreground tabular inline-flex items-center gap-1">
                            <Clock size={12} /> {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        {slot.subject && (
                          <p className="text-[12px] text-muted-foreground truncate mt-0.5">{slot.subject}</p>
                        )}
                      </div>
                      <Badge tone={slot.checkinStatus === 'Đi muộn' ? 'warning' : slot.checkinTime ? 'success' : 'neutral'} dot>
                        {slot.checkinStatus || 'Chưa chấm công'}
                      </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
                      <div className="flex-1">
                        <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
                          Giờ vào
                        </label>
                        <Input
                          type="time"
                          value={form.checkinTime}
                          onChange={(e) =>
                            setMakeupForm((prev) => ({
                              ...prev,
                              [slot.id]: { ...form, checkinTime: e.target.value },
                            }))
                          }
                          className="font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[12px] font-semibold text-muted-foreground mb-1">
                          Giờ ra
                        </label>
                        <Input
                          type="time"
                          value={form.checkoutTime}
                          onChange={(e) =>
                            setMakeupForm((prev) => ({
                              ...prev,
                              [slot.id]: { ...form, checkoutTime: e.target.value },
                            }))
                          }
                          className="font-mono"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant={changed ? 'primary' : 'secondary'}
                        disabled={!changed || invalidCheckout}
                        loading={makeupBusyId === slot.id}
                        onClick={() => saveMakeupSlot(slot)}
                      >
                        Lưu
                      </Button>
                    </div>
                    {invalidCheckout && (
                      <p className="text-[12px] text-warning font-medium">
                        Cần nhập giờ vào trước khi ghi giờ ra.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Sheet>

        <Sheet
          isOpen={Boolean(expenseToDelete)}
          onClose={() => setExpenseToDelete(null)}
          title="Xác nhận xóa khoản chi"
          description="Khoản chi sẽ bị xóa khỏi sổ quỹ của kỳ kế toán này."
          size="sm"
          footer={
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 w-full">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setExpenseToDelete(null)}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                size="md"
                loading={deletingExpense}
                onClick={handleConfirmDelete}
              >
                Xóa khoản chi
              </Button>
            </div>
          }
        >
          {expenseToDelete && (
            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-field bg-muted space-y-1.5">
                <p className="font-bold text-foreground text-sm">{expenseToDelete.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone="neutral">{expenseToDelete.category}</Badge>
                  <span>{expenseToDelete.expenseDate}</span>
                </div>
                <p className="text-base font-extrabold text-danger tabular pt-1">
                  {expenseToDelete.amount.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Bạn có chắc chắn muốn xóa? Thao tác này không thể hoàn tác.
              </p>
            </div>
          )}
        </Sheet>
      </div>
    </RoleGuard>
  );
}
