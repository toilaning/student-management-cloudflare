'use client';

import React, { useState } from 'react';
import { TuitionInvoice } from '@/types/finance';
import { Send, CheckCircle2, AlertCircle, Zap, HelpCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

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
    <Card className="space-y-4">
      <CardHeader
        icon={<Zap size={18} />}
        title="Giả lập Webhook ngân hàng"
        subtitle="Mô phỏng biến động số dư từ cổng SePay, Casso hoặc Bank Gateway để kiểm tra tự động gạch nợ."
        action={
          <Badge tone="success" dot className="hidden sm:inline-flex">
            Sẵn sàng thử nghiệm
          </Badge>
        }
      />

      <form onSubmit={handleTriggerWebhook} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Chế độ gạch nợ */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-foreground">
              Chế độ gạch nợ
            </label>
            <div className="grid grid-cols-2 p-1 bg-muted rounded-field border border-line gap-1">
              <button
                type="button"
                onClick={() => {
                  setTargetType('invoice');
                  if (selectedInvoiceId) handleSelectInvoice(selectedInvoiceId);
                }}
                className={cn(
                  'py-2 px-3 rounded-field text-xs font-semibold transition cursor-pointer text-center',
                  targetType === 'invoice'
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Theo mã hóa đơn
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('student');
                  handleStudentIdChange(manualStudentId);
                }}
                className={cn(
                  'py-2 px-3 rounded-field text-xs font-semibold transition cursor-pointer text-center',
                  targetType === 'student'
                    ? 'bg-card text-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Theo mã học viên
              </button>
            </div>
          </div>

          {/* Chọn hóa đơn hoặc nhập mã SV */}
          {targetType === 'invoice' ? (
            <Field label="Chọn hóa đơn mục tiêu">
              <Select
                value={selectedInvoiceId}
                onChange={e => handleSelectInvoice(e.target.value)}
              >
                <option value="">-- Chọn hóa đơn mẫu --</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    [{inv.id}] - {inv.studentId} - Còn: {inv.remainingAmount.toLocaleString('vi-VN')}đ ({inv.status})
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Mã học viên (STxxx)">
              <Input
                type="text"
                value={manualStudentId}
                onChange={e => handleStudentIdChange(e.target.value)}
                placeholder="Ví dụ: ST001, ST002"
                className="font-mono uppercase"
              />
            </Field>
          )}

          {/* Cổng Gateway */}
          <Field label="Cổng ngân hàng giả lập">
            <Select
              value={gateway}
              onChange={e => setGateway(e.target.value)}
            >
              <option value="SePay">SePay Webhook (sepay.vn)</option>
              <option value="Casso">Casso OpenBanking (casso.vn)</option>
              <option value="VietQR">VietQR Pro Gateway</option>
              <option value="MBBank">MBBank Open API</option>
              <option value="Vietcombank">Vietcombank Digibank</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Số tiền chuyển */}
          <Field label="Số tiền chuyển (VNĐ)">
            <div className="relative">
              <Input
                type="number"
                min="1000"
                step="1000"
                value={transferAmount}
                onChange={e => setTransferAmount(Number(e.target.value))}
                className="pr-9 font-mono font-bold text-foreground"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">
                đ
              </span>
            </div>
          </Field>

          {/* Nội dung chuyển khoản */}
          <Field label="Nội dung chuyển khoản (Content/Description)">
            <Input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="VD: ST001 nop hoc phi TUI0001"
              className="font-mono"
            />
          </Field>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="text-[12px] text-muted-foreground flex items-center gap-1.5">
            <HelpCircle size={15} className="text-muted-foreground shrink-0" />
            <span>
              Cú pháp nhận diện: Hệ thống tự động trích xuất mã <code className="bg-muted px-1.5 py-0.5 rounded text-primary-ink font-mono font-semibold">TUIxxx</code> hoặc <code className="bg-muted px-1.5 py-0.5 rounded text-primary-ink font-mono font-semibold">STxxx</code> trong nội dung để gạch nợ.
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            icon={<Send size={15} />}
          >
            Bắn webhook giả lập
          </Button>
        </div>
      </form>

      {/* Thông báo kết quả */}
      {result && (
        <div
          className={cn(
            'p-4 rounded-field border text-[13px] flex items-start gap-3 animate-in-up',
            result.success
              ? 'bg-success-soft border-success/30 text-foreground'
              : 'bg-danger-soft border-danger/30 text-foreground'
          )}
        >
          {result.success ? (
            <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="text-danger shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px]">
              {result.success ? 'Gạch nợ webhook thành công' : 'Thực thi không thành công'}
            </div>
            <div className="mt-0.5 text-muted-foreground">{result.message}</div>
            {result.data?.reconciledInvoices && result.data.reconciledInvoices.length > 0 && (
              <div className="mt-3 pt-3 border-t border-line font-mono text-xs space-y-1.5">
                <div className="font-bold text-foreground font-sans">Chi tiết hóa đơn đã cập nhật:</div>
                {result.data.reconciledInvoices.map((inv: any) => (
                  <div key={inv.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{inv.id}</span>
                    <span className="text-muted-foreground">(Học viên: {inv.studentId})</span>
                    <span className="text-success font-semibold">+{inv.paidAmountAdded?.toLocaleString('vi-VN')}đ</span>
                    <span className="text-muted-foreground">| Còn nợ: {inv.remainingAmount?.toLocaleString('vi-VN')}đ</span>
                    <Badge tone="success" className="text-[11px] py-0.5 px-2">
                      {inv.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
