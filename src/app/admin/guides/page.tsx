'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { BankWebhookSimulator } from '@/components/tuition/BankWebhookSimulator';
import { TuitionInvoice } from '@/types/finance';
import { 
  Building2, 
  Copy, 
  Check, 
  Terminal, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

function AdminGuidesContent() {
  const [invoices, setInvoices] = useState<TuitionInvoice[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch tuition invoices to feed into simulator
  useEffect(() => {
    fetch('/api/finance')
      .then(res => res.json())
      .then(data => {
        if (data.invoices) {
          setInvoices(data.invoices);
        }
      })
      .catch(err => console.error('Error loading invoices for guides:', err));
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header 
        title="Hướng Dẫn Tích Hợp Hệ Thống" 
        subtitle="Tài liệu cấu hình Cổng thanh toán Ngân hàng (SePay/Casso/VietQR)" 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer bg-indigo-600 text-white shadow-xs"
            >
              <Building2 size={16} />
              <span>1. Ngân hàng & Webhook Gạch nợ</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/tuition"
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 transition"
            >
              <span>Đến Quản lý Công nợ</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* SECTION 1: CẤU HÌNH NGÂN HÀNG & TỰ ĐỘNG GẠCH NỢ */}
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Giới thiệu tổng quan */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-indigo-200 border border-white/10">
                  <Sparkles size={14} />
                  <span>Giải pháp thanh toán không đối soát thủ công</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  Tự Động Hóa Gạch Nợ Học Phí Qua VietQR & Webhook
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Hệ thống tích hợp trực tiếp với chuẩn VietQR (Napas 247) và cổng Gateway biến động số dư (SePay / Casso). 
                  Khi phụ huynh hoặc sinh viên chuyển khoản đúng cú pháp, tiền vào tài khoản và hóa đơn được gạch nợ 100% tự động chỉ sau 1 - 3 giây.
                </p>
              </div>
            </div>

            {/* Các bước cấu hình */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bước 1 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base">
                  1
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Điền thông tin Tài khoản Thụ hưởng</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Truy cập trang <Link href="/admin/tuition" className="text-indigo-600 font-semibold underline">Quản lý Công nợ</Link>, bấm nút <b>"Cấu hình Ngân hàng"</b>:
                </p>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                  <li><b>Ngân hàng:</b> Chọn ngân hàng thụ hưởng (MB, VCB, TCB, VPB...).</li>
                  <li><b>Số tài khoản:</b> Nhập chính xác số tài khoản thanh toán.</li>
                  <li><b>Tên chủ tài khoản:</b> Nhập in hoa không dấu (ví dụ: <code className="bg-slate-100 text-indigo-600 px-1 py-0.5 rounded font-mono">NGUYEN VAN A</code>).</li>
                </ul>
              </div>

              {/* Bước 2 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base">
                  2
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Đăng ký Cổng Gateway & Cài Webhook</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tạo tài khoản tại các nền tảng đối soát tự động phổ biến tại VN như <b>SePay.vn</b> hoặc <b>Casso.vn</b>:
                </p>
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-slate-700">Webhook URL cấu hình:</div>
                  <div className="flex items-center justify-between gap-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                    <code className="text-[11px] font-mono text-indigo-600 truncate">
                      http://&lt;domain&gt;/api/payment/webhook
                    </code>
                    <button 
                      onClick={() => handleCopy('/api/payment/webhook', 'url')}
                      className="text-slate-500 hover:text-slate-800 p-1"
                      title="Sao chép URI"
                    >
                      {copiedKey === 'url' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Phương thức: <span className="font-bold text-slate-700">POST</span> | Định dạng: <span className="font-bold text-slate-700">JSON</span>
                  </p>
                </div>
              </div>

              {/* Bước 3 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base">
                  3
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Cơ chế Tự động Nhận diện & Gạch nợ</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hệ thống tự sinh mã QR động chứa sẵn cú pháp nhận diện:
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Theo Mã Hóa Đơn:</span>
                    <code className="bg-white px-2 py-0.5 rounded border text-indigo-600 font-bold">TUI0001</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Theo Mã Sinh Viên:</span>
                    <code className="bg-white px-2 py-0.5 rounded border text-indigo-600 font-bold">ST001</code>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Khi chuyển theo mã SV, hệ thống tự động gạch nợ lần lượt các hóa đơn cũ nhất theo chuẩn FIFO.
                  </p>
                </div>
              </div>
            </div>

            {/* Bảng cấu trúc Payload mẫu */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={18} className="text-slate-600" />
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Cấu trúc Payload Webhook Chuẩn (SePay / Casso / Ngân hàng)
                  </h3>
                </div>
                <button
                  onClick={() => handleCopy(JSON.stringify({
                    gateway: "SePay",
                    accountNumber: "0987654321",
                    transferType: "in",
                    transferAmount: 1500000,
                    accumulated: 50000000,
                    referenceCode: "MBVCB.123456789",
                    content: "ST001 chuyen tien hoc phi TUI0001",
                    description: "ST001 chuyen tien hoc phi TUI0001"
                  }, null, 2), 'payload')}
                  className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline"
                >
                  {copiedKey === 'payload' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedKey === 'payload' ? 'Đã sao chép' : 'Sao chép JSON'}</span>
                </button>
              </div>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
                <pre>{`{
  "gateway": "SePay",
  "accountNumber": "0987654321",
  "transferType": "in",
  "transferAmount": 1500000,
  "accumulated": 50000000,
  "referenceCode": "MBVCB.123456789",
  "content": "ST001 chuyen tien hoc phi TUI0001",
  "description": "ST001 chuyen tien hoc phi TUI0001"
}`}</pre>
              </div>
            </div>

            {/* KHUNG SIMULATOR TEST TRỰC TIẾP */}
            <div className="pt-2">
              <BankWebhookSimulator 
                invoices={invoices} 
                onSuccess={() => {
                  fetch('/api/finance')
                    .then(res => res.json())
                    .then(data => { if (data.invoices) setInvoices(data.invoices); });
                }}
              />
            </div>
          </div>

      </main>
    </div>
  );
}

export default function AdminGuidesPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <Suspense fallback={<div className="p-8 text-center text-slate-500 text-sm">Đang tải trang hướng dẫn...</div>}>
        <AdminGuidesContent />
      </Suspense>
    </RoleGuard>
  );
}
