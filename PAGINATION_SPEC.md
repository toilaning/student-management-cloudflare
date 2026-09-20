# Đặc tả Kỹ thuật: Hệ thống Phân trang Toàn diện (Pagination Specification)

## 1. Hiện trạng & Phân tích Vấn đề "Không hiển thị quá 50 mục"

Qua khảo sát toàn bộ codebase `/Users/toilaning/projects/student-management`, phát hiện nguyên nhân trực tiếp khiến người dùng không thể xem quá 50 mục:

1. **Quản trị Tài khoản (`src/app/admin/accounts/page.tsx`):**
   - Đang có code cứng: `filtered.slice(0, 50).map(u => ...)`
   - Dưới chân bảng hiển thị: *"Đang hiển thị 50 / X tài khoản phù hợp với bộ lọc."* nhưng hoàn toàn **không có nút chuyển trang**, khiến toàn bộ tài khoản từ thứ 51 trở đi bị giấu hoàn toàn!
2. **Quản lý Học phí & Công nợ (`src/app/admin/tuition/page.tsx`):**
   - Đang có code cứng: `filtered.slice(0, 50).map(inv => ...)`
   - Dưới chân bảng hiển thị: *"Hiển thị 50 phiếu thu mẫu gần nhất trong hệ thống"* nhưng cũng **không có nút chuyển trang**, gây mất mát tầm nhìn với danh sách công nợ lớn.
3. **Quản lý Học viên (`src/app/admin/students/page.tsx` & `src/app/api/students/route.ts`):**
   - API đã hỗ trợ phân trang `page` & `limit`, nhưng UI chỉ có nút Trước/Sau đơn giản, cố định `limit=20`, chưa cho người dùng chọn số lượng mục hiển thị (10, 25, 50, 100), chưa có điều hướng trang đầu, trang cuối hoặc chọn số trang cụ thể.
4. **Nhật ký Hệ thống (Audit Trail) (`src/app/admin/audit/page.tsx`):**
   - Hiện render toàn bộ `filtered.map(...)`, khi số lượng bản ghi audit log tăng lên hàng nghìn dòng sẽ gây lag DOM và suy giảm hiệu năng duyệt dữ liệu.
5. **Danh sách Giảng viên (`src/app/admin/teachers/page.tsx`) & Lớp học (`src/app/admin/classes/page.tsx`):**
   - Chưa tích hợp phân trang đồng bộ khi dữ liệu tăng trưởng.

---

## 2. Thiết kế Giải pháp Phân trang Chuẩn & Đồng bộ

### 2.1. Component Dùng Chung: `PaginationControls`
- **Đường dẫn đề xuất:** `src/components/common/PaginationControls.tsx`
- **Props Interface:**
  ```typescript
  export interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[]; // Mặc định: [10, 25, 50, 100]
    className?: string;
    showPageSizeSelector?: boolean; // Mặc định: true
    itemLabel?: string; // Mặc định: 'mục' (học viên, tài khoản, hóa đơn...)
  }
  ```
- **Giao diện & Trải nghiệm Người dùng (UI/UX):**
  1. **Hiển thị thông tin tiến trình:**
     - Công thức: `Hiển thị từ itemStart đến itemEnd trên tổng số totalItems itemLabel`
     - Ví dụ: *"Hiển thị 1 - 25 trên tổng số 400 học viên"*
  2. **Bộ chọn số lượng mục trên mỗi trang (Page Size Selector):**
     - Dropdown / Select gồm: `10 / trang`, `25 / trang`, `50 / trang`, `100 / trang`.
     - Khi thay đổi pageSize, tự động reset `currentPage` về 1.
  3. **Cụm nút điều hướng thông minh:**
     - Nút **Trang đầu** (`<<` / `ChevronsLeft`): Về trang 1 (Disabled khi `currentPage === 1`).
     - Nút **Trang trước** (`<` / `ChevronLeft`): Về `currentPage - 1` (Disabled khi `currentPage === 1`).
     - **Dãy số trang (Numbered buttons):** Tự động co gọn thông minh với dấu ba chấm (`...`):
       * Ví dụ: `[1] 2 3 ... 16` hoặc `1 ... 4 [5] 6 ... 16` hoặc `1 ... 14 15 [16]`.
     - Nút **Trang sau** (`>` / `ChevronRight`): Tới `currentPage + 1` (Disabled khi `currentPage === totalPages`).
     - Nút **Trang cuối** (`>>` / `ChevronsRight`): Tới `totalPages` (Disabled khi `currentPage === totalPages`).
  4. **Tương thích Responsive:**
     - Co dãn linh hoạt trên Mobile và Desktop (chuyển sang dạng rút gọn trên màn hình hẹp nếu cần).

---

## 3. Kiến trúc State & Dữ liệu (Frontend State Management)

Đối với mỗi trang danh sách, chuẩn hóa quản trị trạng thái:
- `currentPage`: Bắt đầu từ 1.
- `pageSize`: Mặc định 20 hoặc 25 (tùy chọn 10, 25, 50, 100).
- `totalItems`: Tổng số phần tử sau khi filter hoặc từ API.
- `totalPages`: `Math.ceil(totalItems / pageSize) || 1`.
- **Nguyên tắc tương tác:** Khi người dùng nhập từ khóa tìm kiếm hoặc đổi filter (role, status), `currentPage` PHẢI được reset về 1.

---

## 4. Kế hoạch Phân rã Công việc (Task Breakdown cho WORKER)

### Giai đoạn 1: Xây dựng Component Nền tảng
- **Task 1.1:** Tạo component `src/components/common/PaginationControls.tsx` với đầy đủ props, icons (`lucide-react`: `ChevronLeft`, `ChevronRight`, `ChevronsLeft`, `ChevronsRight`), style Tailwind nhất quán với hệ thống.

### Giai đoạn 2: Khắc phục Triệt để các Trang Bị Nghẽn 50 Mục
- **Task 2.1: Quản trị Tài khoản (`src/app/admin/accounts/page.tsx`)**
  - Bỏ hạn chế `filtered.slice(0, 50)`.
  - Thêm state `currentPage` (mặc định 1) và `pageSize` (mặc định 25).
  - Cắt dữ liệu hiển thị theo `const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)`.
  - Đặt `<PaginationControls>` ở chân bảng, nhãn `tài khoản`.
- **Task 2.2: Quản lý Học phí & Công nợ (`src/app/admin/tuition/page.tsx`)**
  - Bỏ hạn chế `filtered.slice(0, 50)`.
  - Thêm state `currentPage` và `pageSize`.
  - Phân trang mượt mà cho toàn bộ danh sách hóa đơn/công nợ.
  - Đặt `<PaginationControls>` ở chân bảng, nhãn `hóa đơn`.

### Giai đoạn 3: Nâng cấp Trang Học viên & Nhật ký Hệ thống
- **Task 3.1: Quản lý Học viên (`src/app/admin/students/page.tsx`)**
  - Thay thế cụm nút phân trang cũ bằng `<PaginationControls>`.
  - Thêm state `pageSize` (cho phép 10, 20, 25, 50, 100).
  - Cập nhật hàm gọi `/api/students?page=&limit=&search=...`.
- **Task 3.2: Nhật ký Hệ thống (`src/app/admin/audit/page.tsx`)**
  - Thêm client-side pagination cho danh sách audit log.
  - Tích hợp `<PaginationControls>` với pageSize mặc định 25 bản ghi/trang.

### Giai đoạn 4: Kiểm tra & Đồng bộ Bổ sung (Lớp học, Giảng viên)
- **Task 4.1:** Kiểm tra trang Lớp học và Giảng viên, sẵn sàng gắn `<PaginationControls>` khi cần.
- **Task 4.2: Build Check & Verification:**
  - Chạy `npm run build` đảm bảo không phát sinh lỗi TypeScript hoặc JSX.
  - Kiểm tra tương thích giao diện trên nhiều độ phân giải.

---

## 5. Tiêu chí Nghiệm thu (Definition of Done)
1. **Tuyệt đối không còn giới hạn cứng 50 mục**: Người dùng xem được toàn bộ 400 học viên, toàn bộ tài khoản và toàn bộ phiếu thu học phí.
2. **Đầy đủ tính năng điều hướng**: Trang đầu, trang trước, số trang trực tiếp, trang sau, trang cuối.
3. **Tùy biến kích thước trang**: Hỗ trợ linh hoạt 10, 25, 50, 100 mục/trang.
4. **Trải nghiệm mượt mà**: Tìm kiếm/bộ lọc tự động đưa về trang 1, không gây nhảy trang bất thường.
5. **Codebase chuẩn hóa**: Component sạch, tái sử dụng 100%, không trùng lặp code.
