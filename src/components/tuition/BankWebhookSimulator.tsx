'use client';

import React, { useState } from 'react';
import { TuitionInvoice } from '@/types/finance';
import { Send, CheckCircle2, AlertCircle, RefreshCw, Zap, HelpCircle } from 'lucide-react';

interface BankWebhookSimulatorProps {
  invoices?: TuitionInvoice[];
  onSuccess?: () => void;
}

export const BankWebhookSimulator: React.FC<BankWebhookSimulatorProps> = ({ invoices = [], onSuccess }) => {
  const [targetType, setTargetType] = useState<'invoice' | 'student'>('invoice');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [manualStudentId, setManualStudentId] = useState<string>('ST001');
  const [transferAmount, setTransferAmount] = useState<number>(1500000);
  const [gateway, setGateway] = useState<string>('SePay');
  const [content, setContent] = useState<string>('ST001 chuyen tien hoc phi TUI0001');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  } | null>(null);

  // Khi người dùng chọn hóa đơn từ danh sách gợi ý
  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    const found = invoices.find(i => i.id === invId);
    if (found) {
      setTransferAmount(found.remainingAmount > 0 ? found.remainingAmount : found.amount);
      setContent(`${found.studentId} chuyen tien hoc phi ${found.id}`);
    } else {
      setContent(`Chuyen tien hoc phi ${invId}`);
    }
  };

  const handleStudentIdChange = (stId: string) => {
    setManualStudentId(stId);
    setContent(`${stId.trim().toUpperCase()} nop hoc phi trung tam`);
  };

  const handleTriggerWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const refCode = `SIM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payload = {
      gateway,
      accountNumber: '0987654321',
      transferType: 'in',
      transferAmount: Number(transferAmount),
      accumulated: 50000000,
      referenceCode: refCode,
      content,
      description: content,
    };

    try {
      const res = await fetch('/api/payment/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          success: true,
          message: data.message || 'Gạch nợ học phí tự động thành công!',
          data,
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setResult({
          success: false,
          message: data.message || data.error || 'Webhook trả về lỗi hoặc không tìm thấy mục tiêu',
          error: data.error,
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err?.message || 'Lỗi mạng khi gửi webhook giả lập',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Công cụ Giả lập Webhook Ngân hàng (Bank Simulator)
            </h3>
            <p className="text-xs text-slate-500">
              Mô phỏng tức thì biến động số dư từ cổng SePay / Casso / Bank Gateway để kiểm tra tự động gạch nợ
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Ready to Test
        </span>
      </div>

      <form onSubmit={handleTriggerWebhook} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Kiểu gạch nợ */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Chế độ gạch nợ
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetType('invoice');
                  if (selectedInvoiceId) handleSelectInvoice(selectedInvoiceId);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium border text-center transition ${
                  targetType === 'invoice'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Theo Mã Hóa Đơn
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('student');
                  handleStudentIdChange(manualStudentId);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium border text-center transition ${
                  targetType === 'student'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Theo Mã Sinh Viên
              </button>
            </div>
          </div>

          {/* Chọn hóa đơn hoặc nhập mã SV */}
          {targetType === 'invoice' ? (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Chọn Hóa đơn mục tiêu
              </label>
              <select
                value={selectedInvoiceId}
                onChange={e => handleSelectInvoice(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="">-- Chọn hóa đơn mẫu --</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    [{inv.id}] - {inv.studentId} - Còn: {inv.remainingAmount.toLocaleString('vi-VN')} đ ({inv.status})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Mã Sinh Viên (STxxx)
              </label>
              <input
                type="text"
                value={manualStudentId}
                onChange={e => handleStudentIdChange(e.target.value)}
                placeholder="Ví dụ: ST001, ST002"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* Cổng Gateway */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Cổng Gateway Giả Lập
            </label>
            <select
              value={gateway}
              onChange={e => setGateway(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="SePay">SePay Webhook (sepay.vn)</option>
              <option value="Casso">Casso OpenBanking (casso.vn)</option>
              <option value="VietQR">VietQR Pro Gateway</option>
              <option value="MBBank">MBBank Open API</option>
              <option value="Vietcombank">Vietcombank Digibank</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Số tiền chuyển */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Số tiền chuyển (VNĐ)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="1000"
                value={transferAmount}
                onChange={e => setTransferAmount(Number(e.target.value))}
                className="w-full pl-3 pr-12 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                đ
              </span>
            </div>
          </div>

          {/* Nội dung chuyển khoản */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nội dung chuyển khoản (Content/Description)
            </label>
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="VD: ST001 nop hoc phi TUI0001"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <HelpCircle size={14} className="text-slate-400 shrink-0" />
            <span>
              Cú pháp nhận diện: Hệ thống tự động trích xuất mã <code className="bg-slate-100 text-indigo-600 px-1 py-0.5 rounded font-bold">TUIxxx</code> hoặc <code className="bg-slate-100 text-indigo-600 px-1 py-0.5 rounded font-bold">STxxx</code> trong nội dung để gạch nợ.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Đang xử lý Webhook...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Bắn Webhook Giả Lập</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Thông báo kết quả */}
      {result && (
        <div
          className={`mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-3 animate-in fade-in duration-200 ${
            result.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {result.success ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">
              {result.success ? 'Gạch nợ Webhook thành công!' : 'Thực thi không thành công'}
            </div>
            <div className="mt-0.5">{result.message}</div>
            {result.data?.reconciledInvoices && result.data.reconciledInvoices.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px] space-y-1">
                <div className="font-bold text-emerald-800">Chi tiết hóa đơn đã cập nhật:</div>
                {result.data.reconciledInvoices.map((inv: any) => (
                  <div key={inv.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{inv.id}</span>
                    <span>(Học viên: {inv.studentId})</span>
                    <span>+{inv.paidAmountAdded?.toLocaleString('vi-VN')} đ</span>
                    <span>| Còn nợ: {inv.remainingAmount?.toLocaleString('vi-VN')} đ</span>
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
