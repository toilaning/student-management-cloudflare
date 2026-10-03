# Redesign spec — 3 cổng Admin / Giáo viên / Học sinh

Mọi trang phải tuân theo file này. Đây là nguồn sự thật duy nhất cho giao diện.

## 1. Ngôn ngữ & màu

Chỉ dùng token trong `tailwind.config.ts`. TUYỆT ĐỐI không dùng màu cứng kiểu
`bg-slate-*`, `text-gray-*`, `bg-emerald-*`, `bg-indigo-*`, `bg-blue-*`,
`bg-purple-*`, `bg-amber-*`, `bg-rose-*`, `bg-red-*` trong trang mới.

Token dùng được:
- Nền: `bg-background`, thẻ `bg-card`, vùng chìm `bg-muted`
- Chữ: `text-foreground`, `text-muted-foreground`, `text-subtle-foreground`
- Viền: `border-line`, `border-line-strong`
- Chính: `primary` (+ `primary-hover`, `primary-soft`, `primary-ink`)
- Trạng thái: `success`/`success-soft`, `warning`/`warning-soft`, `danger`/`danger-soft`, `info`/`info-soft`
- Bo góc: `rounded-field` (ô nhập), `rounded-card` (thẻ), `rounded-pill` (nút)
- Bóng: `shadow-card`, `shadow-soft`, `shadow-pop`, `shadow-primary`
- Chữ số: thêm class `tabular` cho số liệu cho thẳng cột

Không dùng emoji trong giao diện. Icon lấy từ `lucide-react` (SVG).

## 2. Bộ component dùng chung — BẮT BUỘC dùng, không tự viết lại

Import từ `@/components/ui`:
- `Button` — `variant`: primary | secondary | ghost | danger | success; `size`: sm | md | lg | icon; props `loading`, `fullWidth`, `icon`.
- `Card` (`padded`, `interactive`), `CardHeader` (`title`, `subtitle`, `action`, `icon`), `StatCard` (`label`, `value`, `hint`, `icon`, `tone`).
- `Badge` (`tone`, `dot`), `AttendanceBadge` (`status`), `TuitionBadge` (`status`).
- `Field`, `Input`, `Textarea`, `Select`.
- `Sheet` (`isOpen`, `onClose`, `title`, `description`, `footer`, `size`).
- `useToast()` → `.success(text)`, `.error(text)`, `.info(text)`.
- `EmptyState` (`icon`, `title`, `description`, `action`).
- `SegmentedControl` / `Tabs`.
- `SearchInput` (`value`, `onChange`, `placeholder`).
- `PageHeader` (`title`, `subtitle`, `action`).
- `Avatar` (`name`, `size`).
- `DataTable` (`columns`, `rows`, `rowKey`, `loading`, `emptyTitle`, `emptyDescription`, `emptyIcon`, `onRowClick`, `renderMobile`, `footer`) và `Pager`.

KHÔNG sửa các file trong `src/components/ui/` hay `src/components/common/`. Chỉ đọc và dùng.

## 3. Khung trang chuẩn

Mọi trang trong portal giữ nguyên cấu trúc bọc ngoài:

```tsx
'use client';
import { Header } from '@/components/common/Header';
import { RoleGuard } from '@/components/common/RoleGuard';

export default function Page() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="..." subtitle="..." />
        <main className="p-4 sm:p-6 max-w-content mx-auto w-full space-y-5">
          {/* nội dung */}
        </main>
      </div>
    </RoleGuard>
  );
}
```

Quy tắc:
- KHÔNG tự thêm `bg-slate-50`, `font-sans`, `text-slate-800` ở thẻ bọc. Nền đã do layout lo.
- `<main>` dùng `max-w-content` (không dùng `max-w-7xl`).
- Tiêu đề mục trong trang: `text-[15px] font-bold text-foreground`.
- Một màn hình chỉ một nút chính (variant primary). Các nút khác dùng secondary/ghost.
- Nút phải cao tối thiểu 44px trên mobile (dùng size md/lg; size sm chỉ trong bảng).
- Chữ nhỏ nhất 12px. Nội dung mobile ≥ 16px cho ô nhập (Input đã lo).
- Luôn có trạng thái đang tải (dùng `loading` của DataTable hoặc khối `animate-pulse`) và trạng thái rỗng (`EmptyState`).
- Bấm nút phải có phản hồi: dùng `loading` prop khi gọi API, dùng `useToast()` để báo kết quả.

## 4. Cách viết chữ (QUAN TRỌNG)

- Tiếng Việt tự nhiên, ngắn, như người thật nói với người thật.
- CẤM các từ/câu kiểu AI: "Hãy cùng", "Chào mừng bạn đến với", "Khám phá", "giải pháp toàn diện",
  "tối ưu hóa trải nghiệm", "hệ thống sẽ tự động", "một cách dễ dàng", "không chỉ... mà còn",
  "Hãy bắt đầu hành trình", dấu chấm than liên tục, câu dài nhiều mệnh đề.
- Viết ngắn: "Điểm danh", "Lưu điểm danh", "Chọn gói", "Gửi đơn", "Đổi ca".
- Nhãn bảng viết thường, ngắn: "Ngày", "Lớp", "Ca", "Trạng thái".
- Trạng thái giữ nguyên giá trị dữ liệu tiếng Việt: 'Có mặt', 'Đi muộn', 'Vắng có phép',
  'Vắng không phép', 'Điểm danh bù', 'Chưa điểm danh', 'Đã nộp', 'Còn nợ', 'Quá hạn', 'Miễn giảm'.

## 5. Bất biến kỹ thuật — KHÔNG được phá

- Giữ nguyên mọi lời gọi API: URL, query, method, body. Chỉ đổi giao diện.
- Giữ nguyên `RoleGuard allowedRoles` của từng trang.
- Không đổi tên biến/hàm xử lý logic trừ khi bắt buộc; không đổi kiểu dữ liệu trong `src/types`.
- Không thêm thư viện mới. Không sửa `package.json`, `tailwind.config.ts`, `globals.css`.
- TypeScript phải sạch. Chạy `./node_modules/.bin/tsc --noEmit` (KHÔNG dùng npx) và sửa tới khi exit 0.
- Được phép thay `alert()` / `confirm()` bằng `useToast()` và `Sheet`.
- Được phép bỏ `<Modal>` cũ để dùng `<Sheet>` trực tiếp (Sheet có sẵn tiêu đề và nút đóng).

## 6. Bảng màu trạng thái (dùng `AttendanceBadge`/`Badge`)

- Có mặt → success; Đi muộn → warning; Vắng có phép → info; Vắng không phép → danger;
  Điểm danh bù → primary; Chưa điểm danh → neutral.
- Học phí: Đã nộp → success; Còn nợ → warning; Quá hạn → danger; Miễn giảm → info.
