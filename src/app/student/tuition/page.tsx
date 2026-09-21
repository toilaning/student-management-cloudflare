'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Modal } from '@/components/common/Modal';
import { TuitionInvoice } from '@/types/finance';
import { SessionPackage } from '@/types/package';
import { AdminBankConfig, DEFAULT_BANK_CONFIG } from '@/types/bank';
import { generateVietQRUrl } from '@/utils/vietqr';
import { 
  CreditCard, QrCode, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, 
  Copy, Check, ExternalLink, RefreshCw, Package, Sparkles, Loader2 
} from 'lucide-react';
import Link from 'next/link';

export default function StudentTuitionPage() {
  const { currentUser, isReady } = useApp();
  const [invoices, setInvoices] = useState<TuitionInvoice[]>([]);
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<TuitionInvoice | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [buyingPackageId, setBuyingPackageId] = useState<string | null>(null);

  // Cấu hình ngân hàng Admin VietQR
  const [bankConfig, setBankConfig] = useState<AdminBankConfig>(DEFAULT_BANK_CONFIG);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadBankConfig = async () => {
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

  const loadPackages = async () => {
    try {
      setLoadingPackages(true);
      const res = await fetch('/api/packages?activeOnly=true');
      const data = await res.json();
      if (data.success && data.packages) {
        setPackages(data.packages);
      }
    } catch (e) {
      console.error('Error loading packages:', e);
    } finally {
      setLoadingPackages(false);
    }
  };

  const loadInvoices = async () => {
    if (!isReady || !currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/finance?studentId=${currentUser.id}`);
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadBankConfig();
    loadPackages();
  }, [currentUser, isReady]);

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalDebt = invoices.reduce((s, i) => s + i.remainingAmount, 0);

  // Tính tổng số buổi học đã mua, số buổi đã dùng, số buổi còn lại
  const packageStats = invoices.reduce((acc, inv) => {
    if (inv.sessionCount) {
      acc.totalSessions += inv.sessionCount;
      acc.usedSessions += (inv.usedSessions || 0);
      acc.remainingSessions += Math.max(0, inv.sessionCount - (inv.usedSessions || 0));
    }
    return acc;
  }, { totalSessions: 0, usedSessions: 0, remainingSessions: 0 });

  const handleOpenPayment = (inv: TuitionInvoice) => {
    setSelectedInvoice(inv);
    setShowQrModal(true);
    setPaymentSuccess(false);
  };

  const handleCopyText = (text: string, fieldName: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setCopyToast(`Đã sao chép ${label}!`);
    setTimeout(() => {
      setCopiedField(null);
      setCopyToast(null);
    }, 2500);
  };

  // Học sinh chọn mua gói buổi học
  const handleSelectPackage = async (pkg: SessionPackage) => {
    if (!currentUser?.id) return;
    setBuyingPackageId(pkg.id);

    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PURCHASE_PACKAGE',
          studentId: currentUser.id,
          packageId: pkg.id,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo hóa đơn gói');
      }

      setToastMessage({
        type: 'success',
        text: `Đã chọn ${pkg.name}! Hóa đơn ${data.invoice.id} đã được tạo thành công.`,
      });
      setTimeout(() => setToastMessage(null), 4000);

      await loadInvoices();
      // Mở ngay modal thanh toán VietQR cho gói vừa chọn
      setSelectedInvoice(data.invoice);
      setShowQrModal(true);
      setPaymentSuccess(false);
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Lỗi kết nối khi chọn gói',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setBuyingPackageId(null);
    }
  };

  const handleConfirmMockPayment = async () => {
    if (!selectedInvoice) return;
    setPaymentProcessing(true);
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          paymentAmount: selectedInvoice.remainingAmount,
          paymentMethod: 'Chuyển khoản QR',
          transactionCode: `VIETQR_${selectedInvoice.studentId}_${Date.now().toString().slice(-6)}`,
        }),
      });
      if (res.ok) {
        setPaymentSuccess(true);
        setTimeout(async () => {
          setShowQrModal(false);
          await loadInvoices();
        }, 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['STUDENT', 'ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
        <Header 
          title="Học Phí, Gói Buổi Học & Thanh Toán VietQR" 
          subtitle={`Tra cứu công nợ, tự chọn gói buổi học linh hoạt và quét mã VietQR tự động cho học viên ${currentUser?.name || ''}`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Toast Notification */}
          {toastMessage && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {toastMessage.type === 'success' ? <CheckCircle2 className="text-emerald-600 shrink-0" size={18} /> : <AlertTriangle className="text-rose-600 shrink-0" size={18} />}
                <span>{toastMessage.text}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng học phí khóa</span>
              <div className="text-2xl font-black text-slate-800 mt-2">
                {totalBilled.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-semibold">VNĐ</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Các khoản thu theo kế hoạch & gói đã chọn</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã hoàn thành</span>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                {totalPaid.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-semibold">VNĐ</span>
              </div>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Đã thanh toán đầy đủ qua hệ thống</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số tiền còn nợ</span>
              <div className="text-2xl font-black text-rose-600 mt-2">
                {totalDebt.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-semibold">VNĐ</span>
              </div>
              <p className="text-xs text-rose-500 mt-1 font-medium">Cần thanh toán trước hạn quy định</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 p-5 rounded-xl border border-purple-200/80 shadow-xs">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={13} /> Số buổi học còn lại
              </span>
              <div className="text-2xl font-black text-purple-900 mt-2 flex items-baseline gap-1">
                <span>{packageStats.remainingSessions}</span>
                <span className="text-xs text-purple-600 font-medium">/ {packageStats.totalSessions} buổi</span>
              </div>
              <p className="text-xs text-purple-600 mt-1 font-medium">Đã học: {packageStats.usedSessions} buổi</p>
            </div>
          </div>

          {/* Section 1: Danh sách các Gói Buổi Học Tự Chọn (Session Packages) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="text-purple-600" size={22} />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Gói Buổi Học Tự Chọn Linh Hoạt</h3>
                  <p className="text-xs text-slate-500">
                    Học sinh có thể chủ động chọn gói phù hợp với mục tiêu học tập. Hệ thống sẽ tự động tạo hóa đơn và mã VietQR thanh toán.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 self-start sm:self-auto">
                {packages.length} Gói Khả Dụng
              </span>
            </div>

            {loadingPackages ? (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-purple-600" />
                <span>Đang tải danh sách các gói buổi học...</span>
              </div>
            ) : packages.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Hiện tại chưa có gói buổi học nào được mở. Vui lòng liên hệ quản trị viên.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    className="relative group bg-white hover:bg-purple-50/30 border-2 border-slate-200 hover:border-purple-500 rounded-2xl p-5 shadow-xs transition duration-200 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-100 text-purple-800">
                          {pkg.sessionCount} Buổi học
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-400">
                          {pkg.id}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-950 transition">
                        {pkg.name}
                      </h4>

                      <p className="text-xs text-slate-600 line-clamp-3 min-h-[40px]">
                        {pkg.description || 'Chương trình tiêu chuẩn, bao gồm tài liệu và hướng dẫn chuyên sâu.'}
                      </p>

                      <div className="pt-3 border-t border-slate-100">
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Học phí trọn gói</div>
                        <div className="text-2xl font-black font-mono text-purple-700 mt-0.5">
                          {pkg.price.toLocaleString('vi-VN')} <span className="text-xs text-slate-400 font-bold">VNĐ</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ~ {Math.round(pkg.price / pkg.sessionCount).toLocaleString('vi-VN')} đ / buổi
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3">
                      <button
                        type="button"
                        onClick={() => handleSelectPackage(pkg)}
                        disabled={buyingPackageId === pkg.id}
                        className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {buyingPackageId === pkg.id ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Đang tạo hóa đơn...</span>
                          </>
                        ) : (
                          <>
                            <QrCode size={15} />
                            <span>Chọn Mua & Quét QR</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Invoice & Purchase History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Lịch Sử Gói Đã Mua & Phiếu Thu Học Phí</h3>
                <p className="text-xs text-slate-400">Theo dõi tiến độ thanh toán và số buổi học còn lại / đã dùng</p>
              </div>
              <span className="text-xs text-slate-600 font-mono bg-slate-100 px-3 py-1 rounded-lg self-start sm:self-auto">
                Mã SV: {currentUser?.id}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Mã HĐ</th>
                    <th className="px-4 py-3 whitespace-nowrap">Gói / Khoản thu</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Tiến độ buổi học</th>
                    <th className="px-4 py-3 whitespace-nowrap">Số tiền</th>
                    <th className="px-4 py-3 whitespace-nowrap">Đã nộp</th>
                    <th className="px-4 py-3 whitespace-nowrap">Còn thiếu</th>
                    <th className="px-4 py-3 whitespace-nowrap">Hạn nộp</th>
                    <th className="px-4 py-3 whitespace-nowrap">Trạng thái</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Thanh toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        Bạn chưa có hóa đơn hoặc gói buổi học nào. Hãy chọn gói ở phía trên để bắt đầu!
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => {
                      const used = inv.usedSessions || 0;
                      const total = inv.sessionCount || 0;
                      const remaining = Math.max(0, total - used);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">{inv.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{inv.title}</div>
                            {inv.packageId && (
                              <span className="inline-block text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 mt-0.5">
                                Gói: {inv.packageId}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-xs">
                            {total > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                  Còn lại: {remaining} / {total} buổi
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">Đã dùng: {used} buổi</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold font-mono text-slate-700 whitespace-nowrap">{inv.amount.toLocaleString('vi-VN')} đ</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold font-mono whitespace-nowrap">{inv.paidAmount.toLocaleString('vi-VN')} đ</td>
                          <td className="px-4 py-3 font-bold font-mono text-rose-600 whitespace-nowrap">{inv.remainingAmount.toLocaleString('vi-VN')} đ</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{inv.dueDate}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                              inv.status === 'Đã nộp'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'Miễn giảm'
                                ? 'bg-blue-100 text-blue-800'
                                : inv.status === 'Quá hạn'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {inv.remainingAmount > 0 ? (
                              <button
                                onClick={() => handleOpenPayment(inv)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                              >
                                <QrCode size={14} />
                                <span>VietQR Thanh Toán</span>
                              </button>
                            ) : (
                              <span className="text-emerald-600 font-bold flex items-center gap-1 justify-end text-xs">
                                <CheckCircle2 size={14} /> Đã nộp xong
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Cổng Thanh Toán VietQR Chuẩn Napas247 */}
          {selectedInvoice && (
            <Modal
              isOpen={showQrModal}
              onClose={() => {
                setShowQrModal(false);
                setSelectedInvoice(null);
              }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden text-center p-6 space-y-4 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <QrCode className="text-emerald-600" size={22} />
                  <span>Cổng Thanh Toán VietQR Napas247</span>
                </div>
                <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
              </div>

              {/* Toast phản hồi copy */}
              {copyToast && (
                <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
                  <Check size={14} className="text-emerald-600" />
                  <span>{copyToast}</span>
                </div>
              )}

              {paymentSuccess ? (
                <div className="py-8 space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">Thanh toán thành công!</h4>
                  <p className="text-xs text-slate-500">Hệ thống đã ghi nhận thanh toán cho hóa đơn {selectedInvoice.id}.</p>
                </div>
              ) : (
                <>
                  {/* Thẻ hiển thị mã QR động chuẩn VietQR: TUI <MãSV> <MãHóaĐơn> */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={generateVietQRUrl({
                        bankId: bankConfig.bankId,
                        accountNumber: bankConfig.accountNumber,
                        accountName: bankConfig.accountName,
                        amount: selectedInvoice.remainingAmount,
                        studentId: selectedInvoice.studentId,
                        invoiceId: selectedInvoice.id,
                        template: 'compact2',
                      })}
                      alt="Mã VietQR Thanh Toán Học Phí"
                      className="w-64 h-auto mx-auto rounded-xl shadow-xs"
                    />
                  </div>

                  {/* Chi tiết chuyển khoản kèm nút sao chép tiện ích */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                    {/* Ngân hàng */}
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                      <span className="font-bold text-slate-800 text-right">{bankConfig.bankName} ({bankConfig.bankId})</span>
                    </div>

                    {/* STK + Nút sao chép */}
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Số tài khoản (STK):</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-indigo-700 text-sm">{bankConfig.accountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(bankConfig.accountNumber, 'acc_num', 'Số tài khoản')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === 'acc_num' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Tên chủ tài khoản */}
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Chủ tài khoản:</span>
                      <span className="font-bold text-slate-800 uppercase">{bankConfig.accountName}</span>
                    </div>

                    {/* Số tiền + Nút sao chép */}
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Số tiền thanh toán:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-rose-600 text-sm">
                          {selectedInvoice.remainingAmount.toLocaleString('vi-VN')} VNĐ
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(selectedInvoice.remainingAmount.toString(), 'amount', 'Số tiền')}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 transition cursor-pointer"
                          title="Sao chép số tiền"
                        >
                          {copiedField === 'amount' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Nội dung chuyển khoản: Format TUI <MãSV> <MãHóaĐơn> */}
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold text-amber-900 block">
                          Nội dung chuyển khoản (Bắt buộc):
                        </span>
                        <span className="font-mono font-extrabold text-amber-800 text-sm sm:text-base tracking-wider">
                          {`TUI ${selectedInvoice.studentId} ${selectedInvoice.id}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`TUI ${selectedInvoice.studentId} ${selectedInvoice.id}`, 'content', 'Nội dung chuyển khoản')}
                        className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-md text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      >
                        {copiedField === 'content' ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                        <span>Sao chép</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Vui lòng mở ứng dụng Ngân hàng (App Banking) bất kỳ để quét mã VietQR trên hoặc nhập thông tin chuyển khoản chính xác theo cú pháp.
                  </p>

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      disabled={paymentProcessing}
                      onClick={handleConfirmMockPayment}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {paymentProcessing ? 'Đang kiểm tra...' : 'Xác nhận chuyển khoản thành công'}
                    </button>
                  </div>
                </>
              )}
            </Modal>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
