'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { useApp } from '@/context/AppContext';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Modal } from '@/components/common/Modal';
import { TuitionInvoice } from '@/types/finance';
import { AdminBankConfig, DEFAULT_BANK_CONFIG } from '@/types/bank';
import { generateVietQRUrl } from '@/utils/vietqr';
import { 
  CreditCard, QrCode, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, 
  Copy, Check, ExternalLink, RefreshCw 
} from 'lucide-react';
import Link from 'next/link';

export default function StudentTuitionPage() {
  const { currentUser, isReady } = useApp();
  const [invoices, setInvoices] = useState<TuitionInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<TuitionInvoice | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cấu hình ngân hàng Admin VietQR
  const [bankConfig, setBankConfig] = useState<AdminBankConfig>(DEFAULT_BANK_CONFIG);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

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
  }, [currentUser, isReady]);

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalDebt = invoices.reduce((s, i) => s + i.remainingAmount, 0);

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
          title="Học Phí & Cổng Thanh Toán VietQR" 
          subtitle={`Tra cứu công nợ và quét mã VietQR tự động cho học viên ${currentUser?.name || ''}`} 
        />

        <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng học phí khóa</span>
              <div className="text-2xl font-bold text-slate-800 mt-2">
                {totalBilled.toLocaleString('vi-VN')} <span className="text-xs text-slate-400">VNĐ</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Các khoản thu theo kế hoạch đào tạo</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã hoàn thành</span>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                {totalPaid.toLocaleString('vi-VN')} <span className="text-xs text-slate-400">VNĐ</span>
              </div>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Đã thanh toán đầy đủ qua hệ thống</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số tiền còn nợ</span>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                {totalDebt.toLocaleString('vi-VN')} <span className="text-xs text-slate-400">VNĐ</span>
              </div>
              <p className="text-xs text-rose-500 mt-1 font-medium">Cần thanh toán trước hạn quy định</p>
            </div>
          </div>

          {/* Invoice List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Danh sách phiếu thu học phí</h3>
              <span className="text-xs text-slate-500 font-mono">Mã SV: {currentUser?.id}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Mã HĐ</th>
                    <th className="px-4 py-3">Khoản thu</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Đã nộp</th>
                    <th className="px-4 py-3">Còn thiếu</th>
                    <th className="px-4 py-3">Hạn nộp</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thanh toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Chưa có hóa đơn học phí nào.
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{inv.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{inv.title}</td>
                        <td className="px-4 py-3 font-semibold font-mono text-slate-700">{inv.amount.toLocaleString('vi-VN')} đ</td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold font-mono">{inv.paidAmount.toLocaleString('vi-VN')} đ</td>
                        <td className="px-4 py-3 font-bold font-mono text-rose-600">{inv.remainingAmount.toLocaleString('vi-VN')} đ</td>
                        <td className="px-4 py-3 text-slate-500">{inv.dueDate}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            inv.status === 'Đã nộp'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'Quá hạn'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {inv.remainingAmount > 0 ? (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition shadow-xs flex items-center gap-1.5 ml-auto"
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
                    ))
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
                  <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
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
                    {/* Thẻ hiển thị mã QR động chuẩn VietQR */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={generateVietQRUrl({
                          bankId: bankConfig.bankId,
                          accountNumber: bankConfig.accountNumber,
                          accountName: bankConfig.accountName,
                          amount: selectedInvoice.remainingAmount,
                          studentId: selectedInvoice.studentId,
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
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
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
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
                            title="Sao chép số tiền"
                          >
                            {copiedField === 'amount' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Nội dung chuyển khoản: Nổi bật Mã Học Sinh + Nút sao chép */}
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-semibold text-amber-900 block">
                            Nội dung chuyển khoản (Bắt buộc):
                          </span>
                          <span className="font-mono font-extrabold text-amber-800 text-base tracking-wider">
                            {selectedInvoice.studentId}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(selectedInvoice.studentId, 'content', 'Mã học sinh')}
                          className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-md text-xs flex items-center gap-1 transition shadow-2xs"
                        >
                          {copiedField === 'content' ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                          <span>Sao chép</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Vui lòng mở ứng dụng Ngân hàng (App Banking) bất kỳ để quét mã VietQR trên hoặc nhập thông tin chuyển khoản chính xác.
                    </p>

                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowQrModal(false)}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        disabled={paymentProcessing}
                        onClick={handleConfirmMockPayment}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
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
