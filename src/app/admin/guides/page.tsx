'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { BankWebhookSimulator } from '@/components/tuition/BankWebhookSimulator';
import { TuitionInvoice } from '@/types/finance';
import { 
  Building2, 
  Bot, 
  Zap, 
  HelpCircle, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  QrCode, 
  ShieldCheck, 
  Terminal, 
  Key, 
  MessageSquare, 
  Sparkles,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

function AdminGuidesContent() {
  const [activeTab, setActiveTab] = useState<'bank' | 'discord'>('bank');
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
        subtitle="Tài liệu cấu hình Cổng thanh toán Ngân hàng (SePay/Casso/VietQR) & Triển khai Discord Bot" 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'bank'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 size={16} />
              <span>1. Ngân hàng & Webhook Gạch nợ</span>
            </button>
            <button
              onClick={() => setActiveTab('discord')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'discord'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Bot size={16} />
              <span>2. Cài đặt Discord Bot & Slash Commands</span>
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
        {activeTab === 'bank' && (
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
        )}

        {/* SECTION 2: HƯỚNG DẪN DISCORD BOT */}
        {activeTab === 'discord' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Banner giới thiệu bot */}
            <div className="bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-purple-200 border border-white/10">
                  <Bot size={14} />
                  <span>Tự động hóa phòng học trực tuyến</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  Cài Đặt & Vận Hành Discord Bot Điểm Danh & Nộp Bài
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Discord Bot kết nối trực tiếp với Database trung tâm qua REST API. Bot hỗ trợ giảng viên mở phiên điểm danh nhanh, quét tự động học sinh trong Voice Channel và thu bài tập tự động từ kênh Discord.
                </p>
              </div>
            </div>

            {/* 4 Bước triển khai */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Bước 1 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm">Tạo Bot trên Discord Developer Portal</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Truy cập <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1">Discord Developer Portal <ExternalLink size={12} /></a>:
                </p>
                <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                  <li>Tạo Application mới, đặt tên (ví dụ: <b>EduLocal Assistant</b>).</li>
                  <li>Mục <b>Bot</b>: Bấm <i>Reset Token</i> để lấy <code className="bg-slate-100 text-purple-700 px-1 rounded">DISCORD_BOT_TOKEN</code>.</li>
                  <li>Kích hoạt đầy đủ 3 mục <b>Privileged Gateway Intents</b>:
                    <div className="font-semibold text-slate-700 mt-1">
                      • Presence Intent &bull; Server Members Intent &bull; Message Content Intent
                    </div>
                  </li>
                </ul>
              </div>

              {/* Bước 2 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm">Mời Bot vào Server Lớp Học</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tạo link mời Bot với quyền hạn cần thiết:
                </p>
                <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                  <li>Vào mục <b>OAuth2 &gt; URL Generator</b>.</li>
                  <li>Chọn Scopes: <code className="bg-slate-100 text-slate-700 px-1 rounded">bot</code> và <code className="bg-slate-100 text-slate-700 px-1 rounded">applications.commands</code>.</li>
                  <li>Chọn Bot Permissions: <b>Administrator</b> hoặc tối thiểu (<code className="bg-slate-100 text-slate-700 px-1 rounded">Manage Channels</code>, <code className="bg-slate-100 text-slate-700 px-1 rounded">Send Messages</code>, <code className="bg-slate-100 text-slate-700 px-1 rounded">Connect</code>, <code className="bg-slate-100 text-slate-700 px-1 rounded">Read Message History</code>).</li>
                  <li>Sao chép link được tạo và dán vào trình duyệt để thêm Bot vào Server lớp học của trung tâm.</li>
                </ul>
              </div>

              {/* Bước 3 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm">Cấu hình biến môi trường (`discord-bot/.env`)</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tạo file <code className="bg-slate-100 text-indigo-600 px-1 rounded">discord-bot/.env</code> từ mẫu <code className="bg-slate-100 text-slate-700 px-1 rounded">.env.example</code>:
                </p>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] space-y-1 overflow-x-auto">
                  <div>DISCORD_BOT_TOKEN=MTA...your_token</div>
                  <div>DISCORD_CLIENT_ID=123456789...</div>
                  <div>DISCORD_GUILD_ID=987654321...</div>
                  <div>WEB_API_URL=http://localhost:3000</div>
                  <div>DISCORD_API_SECRET=edulocal_bot_secret_2026</div>
                </div>
              </div>

              {/* Bước 4 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    4
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm">Khởi chạy Bot</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Chạy lệnh npm tại thư mục gốc dự án:
                </p>
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-800">
                    <span>npm run bot:start</span>
                    <button 
                      onClick={() => handleCopy('npm run bot:start', 'run')}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      {copiedKey === 'run' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Hoặc chế độ dev tự reload: <code className="text-indigo-600 font-mono">npm run bot:dev</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Bảng 6 lệnh Slash Commands */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Bảng Tra Cứu 6 Lệnh Slash Commands
                  </h3>
                  <p className="text-xs text-slate-500">
                    Danh sách các lệnh đã được đăng ký và hỗ trợ đầy đủ trong Server Discord lớp học
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                  6 Slash Commands
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Lệnh Slash</th>
                      <th className="px-4 py-3">Mục đích</th>
                      <th className="px-4 py-3">Quyền thực hiện</th>
                      <th className="px-4 py-3">Hướng dẫn sử dụng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                        /mo-diemdanh
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Mở phiên điểm danh lớp
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          Giảng viên, Admin
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Chọn lớp &amp; ca học, bot mở phiên điểm danh kèm đếm ngược thời gian trong kênh chat.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                        /diemdanh-voice
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Điểm danh tự động qua Voice Channel
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          Giảng viên, Admin
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Bot quét các thành viên đang có mặt trong kênh thoại phòng học và tự động check-in vào sổ điểm danh.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                        /vao-hoc
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Học sinh check-in vào lớp
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Học sinh
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Bấm nút hoặc gõ lệnh để check-in ca học hiện tại khi phiên điểm danh đang mở.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                        /lop-hoc
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Tra cứu thông tin lớp học
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          Tất cả
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Hiển thị sĩ số, giáo viên phụ trách, lịch học trong tuần và link tài liệu môn học.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                        /dinh-huong
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Hướng dẫn tân sinh viên / Quy chế
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          Tất cả
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Cung cấp link portal, nội quy điểm danh, quy định nộp học phí và chính sách bảo lưu.
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                        /huong-dan
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Danh mục trợ giúp lệnh bot
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          Tất cả
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Hiển thị hướng dẫn chi tiết cú pháp và chức năng của tất cả các lệnh bot.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quy trình nộp bài tập qua kênh #nop-bai-tap */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Quy Trình Nộp Bài Tập Tự Động Tại Kênh <code className="text-indigo-600">#nop-bai-tap</code>
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Học sinh chỉ cần gửi link bài tập trực tiếp vào kênh quy định mà không cần đăng nhập vào trang web:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">1. Cú pháp gửi tin nhắn</div>
                  <p className="text-slate-500">
                    Học sinh gửi tin nhắn kèm link (GitHub, Google Drive, Figma) và mã bài tập (ví dụ: <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-bold">HW001</code>).
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">2. Bot tiếp nhận &amp; ghi nhận</div>
                  <p className="text-slate-500">
                    Discord Bot tự động phân tích cú pháp, gọi API <code className="text-slate-700 font-bold">POST /api/homework/submit</code> và cập nhật trạng thái nộp bài.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">3. Phản hồi xác nhận</div>
                  <p className="text-slate-500">
                    Bot thả reaction hoặc gửi tin nhắn thông báo nộp thành công kèm mốc thời gian chính xác tới học sinh.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
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
