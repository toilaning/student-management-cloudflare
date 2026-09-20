'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { PaginationControls } from '@/components/common/PaginationControls';
import { Modal } from '@/components/common/Modal';
import { RoleGuard } from '@/components/common/RoleGuard';
import { TuitionInvoice } from '@/types/finance';
import { AdminBankConfig, DEFAULT_BANK_CONFIG, SUPPORTED_BANKS } from '@/types/bank';
import { generateVietQRUrl } from '@/utils/vietqr';
import { BankWebhookSimulator } from '@/components/tuition/BankWebhookSimulator';
import { 
  Receipt, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  CreditCard, 
  QrCode, 
  Settings, 
  Check, 
  Copy, 
  Loader2 
} from 'lucide-react';

export default function AdminTuitionPage() {
  const [invoices, setInvoices] = useState<TuitionInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modal Create states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Form states (Tạo hóa đơn học phí)
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Bank Settings states
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankConfig, setBankConfig] = useState<AdminBankConfig>(DEFAULT_BANK_CONFIG);
  const [savingBank, setSavingBank] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Modal Cập nhật trạng thái thanh toán thủ công
  const [updatingInvoice, setUpdatingInvoice] = useState<TuitionInvoice | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string>('Đã nộp');
  const [updateMethod, setUpdateMethod] = useState<string>('Tiền mặt');
  const [updatePaidDate, setUpdatePaidDate] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Modal View QR for specific Invoice
  const [viewingQrInvoice, setViewingQrInvoice] = useState<TuitionInvoice | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      console.error('Error fetching invoices:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankConfig = async () => {
    try {
      const res = await fetch('/api/settings/bank');
      const data = await res.json();
      if (data.success && data.bankConfig) {
        setBankConfig(data.bankConfig);
        try {
          localStorage.setItem('admin_bank_config', JSON.stringify(data.bankConfig));
        } catch (e) {}
      } else {
        const local = localStorage.getItem('admin_bank_config');
        if (local) setBankConfig(JSON.parse(local));
      }
    } catch (e) {
      try {
        const local = localStorage.getItem('admin_bank_config');
        if (local) setBankConfig(JSON.parse(local));
      } catch (err) {}
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchBankConfig();
  }, []);

  const openCreateModal = async () => {
    setIsCreateModalOpen(true);
    setFormError(null);
    const next15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setDueDate(next15Days);
    setStudentId('');
    setTitle('');
    setOriginalAmount('');
    setDiscountAmount(0);
    setNotes('');

    if (students.length === 0) {
      try {
        setLoadingOptions(true);
        const resStudents = await fetch('/api/students');
        const dataStudents = await resStudents.json();
        setStudents((dataStudents.students || []).map((s: any) => ({
          id: s.id,
          name: s.name,
        })));
      } catch (err) {
        console.error('Error fetching students for modal:', err);
      } finally {
        setLoadingOptions(false);
      }
    }
  };

  const openStatusModal = (inv: TuitionInvoice) => {
    setUpdatingInvoice(inv);
    setUpdateStatus(inv.status);
    setUpdateMethod(inv.paymentMethod || 'Tiền mặt');
    setUpdatePaidDate(inv.paidDate || new Date().toISOString().split('T')[0]);
    setUpdateNotes('');
    setUpdateError(null);
  };

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingInvoice) return;

    setIsUpdatingStatus(true);
    setUpdateError(null);

    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          invoiceId: updatingInvoice.id,
          status: updateStatus,
          paymentMethod: updateStatus === 'Đã nộp' ? updateMethod : undefined,
          paidDate: updateStatus === 'Đã nộp' ? updatePaidDate : undefined,
          transactionCode: updateStatus === 'Đã nộp' ? (updatingInvoice.transactionCode || `MANUAL-${Date.now()}`) : undefined,
          actorId: 'ADMIN001',
          actorName: 'Quản trị viên',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cập nhật trạng thái thất bại');
      }

      setUpdatingInvoice(null);
      setToastMessage({
        type: 'success',
        text: `Đã cập nhật trạng thái hóa đơn ${updatingInvoice.id} thành "${updateStatus}"!`,
      });
      setTimeout(() => setToastMessage(null), 4000);
      await fetchInvoices();
    } catch (err: any) {
      setUpdateError(err.message || 'Lỗi mạng hoặc hệ thống');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankError(null);

    try {
      const res = await fetch('/api/settings/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankConfig),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi lưu cấu hình ngân hàng');
      }

      try {
        localStorage.setItem('admin_bank_config', JSON.stringify(data.bankConfig));
      } catch (e) {}

      setIsBankModalOpen(false);
      setToastMessage({
        type: 'success',
        text: 'Cập nhật tài khoản ngân hàng VietQR thành công!',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setBankError(err.message || 'Lỗi mạng khi lưu tài khoản');
    } finally {
      setSavingBank(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!studentId) {
      setFormError('Vui lòng chọn học viên.');
      return;
    }
    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề hóa đơn.');
      return;
    }
    if (!originalAmount || Number(originalAmount) <= 0) {
      setFormError('Học phí gốc phải lớn hơn 0 VNĐ.');
      return;
    }

    const finalAmount = Number(originalAmount) - Number(discountAmount || 0);
    if (finalAmount <= 0) {
      setFormError('Số tiền thực nộp phải lớn hơn 0 VNĐ.');
      return;
    }
    if (!dueDate) {
      setFormError('Vui lòng chọn hạn nộp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          studentId,
          title: title.trim(),
          originalAmount: Number(originalAmount),
          discountAmount: Number(discountAmount) || 0,
          finalAmount,
          dueDate,
          notes: notes.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Có lỗi xảy ra khi tạo hóa đơn.');
      }

      setToastMessage({
        type: 'success',
        text: `Tạo hóa đơn học phí ${result.invoice?.id || ''} thành công!`,
      });
      setTimeout(() => setToastMessage(null), 4000);
      setIsCreateModalOpen(false);
      await fetchInvoices();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi kết nối khi tạo hóa đơn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = 
      inv.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.classId && inv.classId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedInvoices = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (st: string) => {
    setStatusFilter(st);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalDebt = invoices.reduce((s, i) => s + i.remainingAmount, 0);

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Quản lý Học phí & Công nợ" 
          subtitle="Theo dõi nguồn thu học phí, cấu hình VietQR động và quản lý hóa đơn" 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Toast thông báo */}
          {toastMessage && (
            <div className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-sm transition ${
              toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {toastMessage.type === 'success' ? <CheckCircle className="text-emerald-600 shrink-0" size={18} /> : <AlertCircle className="text-rose-600 shrink-0" size={18} />}
                <span>{toastMessage.text}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng phải thu</span>
              <div className="text-2xl font-bold text-slate-800 mt-2 flex items-baseline gap-1 whitespace-nowrap">
                <span>{totalAmount.toLocaleString('vi-VN')}</span> <span className="text-xs text-slate-400 font-medium">VNĐ</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">Tính theo tất cả hóa đơn học phí</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã thu thực tế</span>
              <div className="text-2xl font-bold text-emerald-600 mt-2 flex items-baseline gap-1 whitespace-nowrap">
                <span>{totalPaid.toLocaleString('vi-VN')}</span> <span className="text-xs text-slate-400 font-medium">VNĐ</span>
              </div>
              <p className="text-xs text-emerald-700 font-medium mt-1 whitespace-nowrap">
                Đạt {((totalPaid / (totalAmount || 1)) * 100).toFixed(1)}% chỉ tiêu
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Còn nợ / Quá hạn</span>
              <div className="text-2xl font-bold text-rose-600 mt-2 flex items-baseline gap-1 whitespace-nowrap">
                <span>{totalDebt.toLocaleString('vi-VN')}</span> <span className="text-xs text-slate-400 font-medium">VNĐ</span>
              </div>
              <p className="text-xs text-rose-500 font-medium mt-1 whitespace-nowrap">Cần đốc thúc trước kỳ thi kết thúc</p>
            </div>
          </div>

          {/* Filter Bar & Action Buttons */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã SV, mã HĐ..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-indigo-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                {['ALL', 'Đã nộp', 'Còn nợ', 'Quá hạn'].map(st => (
                  <button
                    key={st}
                    onClick={() => handleStatusFilterChange(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      statusFilter === st ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Tất cả' : st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsBankModalOpen(true);
                    setBankError(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
                >
                  <Settings size={14} className="text-slate-500" />
                  <span>Cài đặt Ngân hàng</span>
                </button>

                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Tạo Hóa Đơn</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bank Webhook Simulator */}
          {showSimulator && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <BankWebhookSimulator 
                invoices={invoices} 
                onSuccess={() => {
                  fetchInvoices();
                  setToastMessage({
                    type: 'success',
                    text: 'Webhook ngân hàng đã kích hoạt thành công! Dữ liệu công nợ đã được làm mới.',
                  });
                }} 
              />
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Mã HĐ</th>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Học viên</th>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Tiêu đề / Khoản thu</th>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Khoản thu</th>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Đã nộp</th>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Còn lại</th>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Hạn nộp</th>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Trạng thái</th>
                    <th className="whitespace-nowrap px-3 sm:px-4 py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{inv.id}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-mono font-bold text-indigo-600 whitespace-nowrap">{inv.studentId}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-slate-800 max-w-xs truncate">{inv.title || 'Học phí'}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold font-mono whitespace-nowrap">{inv.amount.toLocaleString('vi-VN')} đ</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-emerald-600 font-semibold font-mono whitespace-nowrap">{inv.paidAmount.toLocaleString('vi-VN')} đ</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-rose-600 font-semibold font-mono whitespace-nowrap">{inv.remainingAmount.toLocaleString('vi-VN')} đ</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-slate-500 whitespace-nowrap">{inv.dueDate}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] whitespace-nowrap inline-flex ${
                          inv.status === 'Đã nộp'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'Quá hạn'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openStatusModal(inv)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            Thu tiền / Sửa
                          </button>
                          {inv.remainingAmount > 0 && (
                            <button
                              onClick={() => setViewingQrInvoice(inv)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                              title="Xem mã VietQR Napas247"
                            >
                              <QrCode size={12} />
                              <span>QR</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="hóa đơn"
            />
          </div>
        </main>

        {/* 1. Modal Cài Đặt Tài Khoản Ngân Hàng VietQR (Dùng Modal Portal chuẩn che phủ 100vw x 100vh) */}
        <Modal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CreditCard className="text-indigo-600" size={20} />
              <h3 className="text-base font-bold text-slate-800">Cấu hình Ngân hàng Admin (VietQR)</h3>
            </div>
            <button
              onClick={() => setIsBankModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer transition p-1"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveBankConfig} className="p-6 space-y-4 text-xs">
            {bankError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{bankError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
              </label>
              <select
                value={bankConfig.bankId}
                onChange={e => {
                  const bId = e.target.value;
                  const found = SUPPORTED_BANKS.find(b => b.id === bId);
                  setBankConfig({
                    ...bankConfig,
                    bankId: bId,
                    bankName: found ? found.name : bId,
                  });
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-indigo-600"
                required
              >
                {SUPPORTED_BANKS.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.shortName} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số tài khoản ngân hàng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={bankConfig.accountNumber}
                onChange={e => setBankConfig({ ...bankConfig, accountNumber: e.target.value })}
                placeholder="VD: 0987654321"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên chủ tài khoản (In hoa không dấu) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={bankConfig.accountName}
                onChange={e => setBankConfig({ ...bankConfig, accountName: e.target.value.toUpperCase() })}
                placeholder="VD: NGUYEN VAN A - ADMIN"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase text-slate-800 focus:outline-indigo-600"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBankModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={savingBank}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                {savingBank ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </form>
        </Modal>

        {/* 2. Modal Tạo Hóa Đơn Học Phí Mới (Dùng Modal Portal chuẩn che phủ 100vw x 100vh) */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800">Tạo Hóa Đơn Học Phí Mới</h3>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer transition p-1"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Học viên <span className="text-rose-500">*</span>
              </label>
              <select
                value={studentId}
                onChange={e => {
                  setStudentId(e.target.value);
                  const found = students.find(s => s.id === e.target.value);
                  if (found && !title) {
                    const now = new Date();
                    const month = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
                    setTitle(`Học phí ${found.name} - Tháng ${month}`);
                  }
                }}
                disabled={loadingOptions}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-indigo-600"
                required
              >
                <option value="">-- Chọn học viên --</option>
                {students.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiêu đề khoản thu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="VD: Học phí khóa chuyên đề Tháng 09/2026"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-indigo-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Học phí gốc (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={originalAmount}
                  onChange={e => setOriginalAmount(e.target.value)}
                  placeholder="2500000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-indigo-600"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Miễn giảm (VNĐ)</label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-indigo-600"
                  min="0"
                />
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900">Số tiền thực nộp:</span>
              <span className="text-sm font-bold font-mono text-indigo-700">
                {Math.max(0, Number(originalAmount || 0) - Number(discountAmount || 0)).toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hạn thanh toán <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-indigo-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ghi chú chi tiết cho học viên hoặc kế toán..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-indigo-600"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                {isSubmitting ? 'Đang tạo...' : 'Tạo hóa đơn'}
              </button>
            </div>
          </form>
        </Modal>

        {/* 3. Modal Xem VietQR Động cho Admin (Dùng Modal Portal chuẩn) */}
        {viewingQrInvoice && (
          <Modal
            isOpen={Boolean(viewingQrInvoice)}
            onClose={() => setViewingQrInvoice(null)}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden text-center p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <QrCode size={16} className="text-indigo-600" />
                <span>VietQR Thanh Toán</span>
              </div>
              <button onClick={() => setViewingQrInvoice(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                ✕
              </button>
            </div>

            {copyToast && (
              <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5">
                <Check size={14} className="text-emerald-600" />
                <span>{copyToast}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generateVietQRUrl({
                    bankId: bankConfig.bankId,
                    accountNumber: bankConfig.accountNumber,
                    accountName: bankConfig.accountName,
                    amount: viewingQrInvoice.remainingAmount,
                    studentId: viewingQrInvoice.studentId,
                  })}
                  alt="VietQR Napas247"
                  className="w-56 h-auto mx-auto rounded-xl"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-left space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã hóa đơn:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingQrInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Học viên:</span>
                  <span className="font-mono font-bold text-indigo-600">{viewingQrInvoice.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tiền còn nợ:</span>
                  <span className="font-mono font-bold text-rose-600">{viewingQrInvoice.remainingAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-indigo-200/50">
                  <span className="text-slate-500">Nội dung CK:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingQrInvoice.studentId}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bankConfig.accountNumber);
                    setCopyToast('Đã copy số tài khoản!');
                    setTimeout(() => setCopyToast(null), 2000);
                  }}
                  className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Copy STK</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(viewingQrInvoice.studentId);
                    setCopyToast('Đã copy cú pháp chuyển khoản!');
                    setTimeout(() => setCopyToast(null), 2000);
                  }}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Copy Cú Pháp</span>
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 4. Modal Cập nhật trạng thái hóa đơn / Thu tiền (Dùng Modal Portal chuẩn) */}
        {updatingInvoice && (
          <Modal
            isOpen={Boolean(updatingInvoice)}
            onClose={() => setUpdatingInvoice(null)}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="text-indigo-600" size={20} />
                <h3 className="text-base font-bold text-slate-800">Cập Nhật Trạng Thái Học Phí</h3>
              </div>
              <button
                onClick={() => setUpdatingInvoice(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer transition p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="p-6 space-y-4 text-xs">
              {updateError && (
                <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{updateError}</span>
                </div>
              )}

              {/* Thông tin hóa đơn */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã hóa đơn:</span>
                  <span className="font-mono font-bold text-slate-800">{updatingInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Học viên:</span>
                  <span className="font-mono font-bold text-indigo-600">{updatingInvoice.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng khoản thu:</span>
                  <span className="font-mono font-bold text-slate-800">{updatingInvoice.amount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đã nộp:</span>
                  <span className="font-mono font-bold text-emerald-600">{updatingInvoice.paidAmount.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Còn nợ:</span>
                  <span className="font-mono font-bold text-rose-600">{updatingInvoice.remainingAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* Chọn trạng thái mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Trạng thái thanh toán mới <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Đã nộp', 'Còn nợ', 'Quá hạn'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setUpdateStatus(st)}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg border transition text-center cursor-pointer ${
                        updateStatus === st
                          ? st === 'Đã nộp'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                            : st === 'Quá hạn'
                            ? 'bg-rose-50 border-rose-500 text-rose-800'
                            : 'bg-amber-50 border-amber-500 text-amber-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Các trường bổ sung khi chọn "Đã nộp" */}
              {updateStatus === 'Đã nộp' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phương thức thanh toán</label>
                    <select
                      value={updateMethod}
                      onChange={e => setUpdateMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-indigo-600"
                    >
                      <option value="Tiền mặt">Tiền mặt tại quầy</option>
                      <option value="Chuyển khoản VietQR">Chuyển khoản VietQR</option>
                      <option value="Chuyển khoản thủ công">Chuyển khoản trực tiếp ngân hàng</option>
                      <option value="Thẻ ATM/POS">Thẻ ngân hàng / POS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày thu tiền</label>
                    <input
                      type="date"
                      value={updatePaidDate}
                      onChange={e => setUpdatePaidDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-indigo-600"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú giao dịch</label>
                <input
                  type="text"
                  value={updateNotes}
                  onChange={e => setUpdateNotes(e.target.value)}
                  placeholder="Ghi chú xác nhận thu tiền..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUpdatingInvoice(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {isUpdatingStatus ? 'Đang lưu...' : 'Xác nhận cập nhật'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </RoleGuard>
  );
}
