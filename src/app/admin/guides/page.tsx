'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';
import { BankWebhookSimulator } from '@/components/tuition/BankWebhookSimulator';
import { TuitionInvoice } from '@/types/finance';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl, TabItem } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import {
  Building2,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  Shield,
  GraduationCap,
  UserCheck,
  QrCode,
  CalendarDays,
  FileText,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

const SAMPLE_PAYLOAD = {
  gateway: 'SePay',
  accountNumber: '0987654321',
  transferType: 'in',
  transferAmount: 1500000,
  accumulated: 50000000,
  referenceCode: 'MBVCB.123456789',
  content: 'ST001 chuyen tien hoc phi TUI0001',
  description: 'ST001 chuyen tien hoc phi TUI0001',
};

function AdminGuidesContent() {
  const toast = useToast();
  const [invoices, setInvoices] = useState<TuitionInvoice[]>([]);
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'student'>('admin');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/finance')
      .then((res) => res.json())
      .then((data) => {
        if (data.invoices) {
          setInvoices(data.invoices);
        }
      })
      .catch((err) => console.error('Lỗi tải danh sách hóa đơn:', err));
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Đã sao chép vào bộ nhớ tạm');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const roleTabs: TabItem<'admin' | 'teacher' | 'student'>[] = [
    { value: 'admin', label: 'Quản trị viên & Cổng thanh toán' },
    { value: 'teacher', label: 'Dành cho giáo viên' },
    { value: 'student', label: 'Dành cho học sinh' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Hướng dẫn sử dụng hệ thống"
        subtitle="Tài liệu vận hành, quy trình nghiệp vụ và cấu hình cổng thanh toán tự động"
      />

      <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
        {/* Thanh chọn vai trò & Lối tắt */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <SegmentedControl
            items={roleTabs}
            value={activeTab}
            onChange={(v) => setActiveTab(v)}
          />

          <Link href="/admin/tuition" className="self-end sm:self-auto">
            <Button variant="secondary" size="sm" icon={<ArrowRight size={15} />}>
              Quản lý học phí
            </Button>
          </Link>
        </div>

        {/* TAB 1: QUẢN TRỊ VIÊN & CỔNG THANH TOÁN */}
        {activeTab === 'admin' && (
          <div className="space-y-5">
            {/* Thẻ giới thiệu gạch nợ */}
            <Card className="bg-primary text-white border-0 shadow-primary space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-white/15 text-[12px] font-semibold text-white/90">
                <CreditCard size={14} />
                <span>Thanh toán tự động</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold">
                Tự động gạch nợ học phí qua VietQR và Webhook
              </h2>
              <p className="text-[13px] text-white/80 leading-relaxed max-w-3xl">
                Hệ thống tích hợp chuẩn VietQR và webhook biến động số dư. Khi người học quét mã hoặc chuyển khoản đúng cú pháp, hệ thống tự động ghi nhận thanh toán và gạch nợ hóa đơn ngay lập tức.
              </p>
            </Card>

            {/* 3 Bước cấu hình */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="space-y-3">
                <div className="w-8 h-8 rounded-pill bg-primary-soft text-primary-ink flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="text-[15px] font-bold text-foreground">Khai báo tài khoản thụ hưởng</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Tại mục <Link href="/admin/tuition" className="text-primary font-semibold hover:underline">Quản lý học phí</Link>, mở mục cấu hình ngân hàng để nhập:
                </p>
                <ul className="text-[13px] text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Tên ngân hàng thụ hưởng (MB, VCB, TCB...)</li>
                  <li>Số tài khoản ngân hàng</li>
                  <li>Tên chủ tài khoản (viết hoa không dấu)</li>
                </ul>
              </Card>

              <Card className="space-y-3">
                <div className="w-8 h-8 rounded-pill bg-primary-soft text-primary-ink flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="text-[15px] font-bold text-foreground">Cài đặt Webhook nhận tiền</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Đăng ký tài khoản tại cổng đối soát (SePay hoặc Casso) và dán địa chỉ Webhook sau:
                </p>
                <div className="p-2.5 rounded-field bg-muted space-y-1.5 border border-line">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-foreground truncate">
                      /api/payment/webhook
                    </span>
                    <button
                      onClick={() => handleCopy('/api/payment/webhook', 'url')}
                      className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Sao chép địa chỉ webhook"
                    >
                      {copiedKey === 'url' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Phương thức: <span className="font-semibold text-foreground">POST</span> | Định dạng: <span className="font-semibold text-foreground">JSON</span>
                  </p>
                </div>
              </Card>

              <Card className="space-y-3">
                <div className="w-8 h-8 rounded-pill bg-primary-soft text-primary-ink flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="text-[15px] font-bold text-foreground">Cú pháp nhận diện giao dịch</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Mã QR động chứa sẵn nội dung chuyển khoản theo 2 cách nhận diện:
                </p>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex items-center justify-between p-2 rounded-field bg-muted">
                    <span className="text-muted-foreground">Theo mã hóa đơn:</span>
                    <span className="font-mono font-bold text-primary-ink">TUI0001</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-field bg-muted">
                    <span className="text-muted-foreground">Theo mã học sinh:</span>
                    <span className="font-mono font-bold text-primary-ink">ST001</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Chuyển theo mã học sinh sẽ tự gạch nợ lần lượt các hóa đơn cũ nhất.
                  </p>
                </div>
              </Card>
            </div>

            {/* Cấu trúc JSON Webhook */}
            <Card className="space-y-3">
              <CardHeader
                title="Cấu trúc dữ liệu Webhook gửi đến hệ thống"
                subtitle="Định dạng JSON chuẩn hỗ trợ bởi cổng SePay, Casso hoặc webhook nội bộ"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={copiedKey === 'payload' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    onClick={() => handleCopy(JSON.stringify(SAMPLE_PAYLOAD, null, 2), 'payload')}
                  >
                    Sao chép JSON
                  </Button>
                }
              />
              <div className="p-3.5 rounded-field bg-muted border border-line font-mono text-[12px] text-foreground overflow-x-auto">
                <pre>{JSON.stringify(SAMPLE_PAYLOAD, null, 2)}</pre>
              </div>
            </Card>

            {/* Giả lập Webhook để thử nghiệm */}
            <div>
              <div className="mb-2">
                <h3 className="text-[15px] font-bold text-foreground">Công cụ giả lập gạch nợ trực tiếp</h3>
                <p className="text-[13px] text-muted-foreground">
                  Gửi dữ liệu thanh toán mẫu để kiểm tra tính năng gạch nợ hóa đơn ngay trong môi trường hiện tại.
                </p>
              </div>
              <BankWebhookSimulator
                invoices={invoices}
                onSuccess={() => {
                  fetch('/api/finance')
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.invoices) setInvoices(data.invoices);
                    });
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: DÀNH CHO GIÁO VIÊN */}
        {activeTab === 'teacher' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="space-y-3">
              <CardHeader
                title="1. Điểm danh và theo dõi lớp"
                icon={<CheckCircle2 size={18} />}
              />
              <ul className="text-[13px] text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>Truy cập mục <strong>Điểm danh</strong> hoặc chọn ca dạy trong ngày tại màn hình chính.</li>
                <li>Chọn trạng thái cho từng học sinh: <strong>Có mặt</strong>, <strong>Đi muộn</strong>, <strong>Vắng có phép</strong> hoặc <strong>Vắng không phép</strong>.</li>
                <li>Hệ thống lưu tức thì và đồng bộ sang báo cáo học tập của học sinh và phụ huynh.</li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <CardHeader
                title="2. Quản lý lịch dạy"
                icon={<CalendarDays size={18} />}
              />
              <ul className="text-[13px] text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>Xem lịch dạy cá nhân theo tuần hoặc theo tháng.</li>
                <li>Chấm công theo ca trước khi vào lớp để hệ thống ghi nhận thù lao.</li>
                <li>Khi có việc bận, báo trước cho quản trị viên để sắp xếp dạy bù.</li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <CardHeader
                title="3. Thù lao và thống kê tiết dạy"
                icon={<CreditCard size={18} />}
              />
              <ul className="text-[13px] text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>Thù lao được tính tự động dựa trên số tiết đã điểm danh hoàn tất trong tháng.</li>
                <li>Đơn giá mỗi giờ dạy áp dụng theo mức thỏa thuận được lưu trong hồ sơ giáo viên.</li>
                <li>Bảng kê chi tiết sẵn sàng để đối soát vào cuối mỗi kỳ thanh toán.</li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <CardHeader
                title="4. Đơn xin nghỉ từ học sinh"
                icon={<FileText size={18} />}
              />
              <ul className="text-[13px] text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>Học sinh gửi đơn xin nghỉ qua cổng cá nhân kèm lý do và ngày nghỉ.</li>
                <li>Giáo viên phụ trách xem đơn và phản hồi duyệt hoặc từ chối kèm ghi chú.</li>
                <li>Các buổi nghỉ được duyệt sẽ được đánh dấu vắng có phép tự động trong sổ điểm danh.</li>
              </ul>
            </Card>
          </div>
        )}

        {/* TAB 3: DÀNH CHO HỌC SINH */}
        {activeTab === 'student' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="space-y-3">
              <CardHeader
                title="1. Tra cứu lịch học và ca học"
                icon={<CalendarDays size={18} />}
              />
              <ul className="text-[13px] text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>Xem toàn bộ lịch học trong tuần ngay tại bảng điều khiển cá nhân.</li>
                <li>Nắm rõ thông tin phòng học, thời gian bắt đầu và giáo viên phụ trách.</li>
                <li>Nhận thông báo khi lớp có thay đổi lịch hoặc có buổi học bù.</li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <CardHeader
                title="2. Điểm danh và chuyên cần"
                icon={<CheckCircle2 size={18} />}
              />
              <ul className="text-[13px] text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>Theo dõi tỷ lệ chuyên cần và số buổi đã tham gia trong từng khóa học.</li>
                <li>Xác nhận điểm danh theo hướng dẫn của giáo viên trong giờ học.</li>
                <li>Xem lại lịch sử điểm danh từng ngày để kịp thời phản hồi nếu có nhầm lẫn.</li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <CardHeader
                title="3. Nộp học phí qua mã QR"
                icon={<QrCode size={18} />}
              />
              <ul className="text-[13px] text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>Vào mục <strong>Học phí</strong> để xem các hóa đơn cần thanh toán.</li>
                <li>Mở mã QR VietQR và quét bằng ứng dụng ngân hàng bất kỳ.</li>
                <li>Không cần sửa nội dung chuyển khoản vì mã QR đã gắn sẵn mã nhận diện tự động.</li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <CardHeader
                title="4. Gửi đơn xin nghỉ học"
                icon={<FileText size={18} />}
              />
              <ul className="text-[13px] text-muted-foreground space-y-2 list-disc pl-4 leading-relaxed">
                <li>Khi bận việc đột xuất, gửi đơn xin nghỉ trực tiếp trên cổng học sinh.</li>
                <li>Chọn ngày nghỉ, ca học và nhập lý do ngắn gọn.</li>
                <li>Nhận kết quả phản hồi của giáo viên ngay trên màn hình thông báo.</li>
                <li>Muốn học ca khác thì vào mục <strong>Lớp của tôi</strong> để đổi ca ngay, không cần chờ duyệt.</li>
              </ul>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminGuidesPage() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Đang tải hướng dẫn...</div>}>
        <AdminGuidesContent />
      </Suspense>
    </RoleGuard>
  );
}
