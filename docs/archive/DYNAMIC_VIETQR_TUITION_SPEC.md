# ĐẶC TẢ THIẾT KẾ VÀ TRIỂN KHAI: CƠ CHẾ VIETQR ĐỘNG & LOẠI BỎ LỚP HỌC TRONG TẠO HỌC PHÍ

- **Dự án:** Student Management System (`/Users/toilaning/projects/student-management`)
- **Tài liệu:** Kế hoạch kỹ thuật & Đặc tả kiến trúc
- **Tác giả:** MANAGER (`ag/gemini-3.8-flash-medium`)
- **Đối tượng bàn giao:** WORKER (`ag/gemini-3.8-flash-high`) & TESTER (`ag/gemini-3.8-flash-low`)

---

## 1. TỔNG QUAN YÊU CẦU & BỐI CẢNH

### 1.1 Yêu cầu người dùng:
1. **Bỏ chọn Lớp học khỏi Form tạo học phí (`/admin/tuition`):**
   - Chỉ bỏ trường chọn Lớp trong form tạo học phí; tuyệt đối không xóa entity hoặc module Lớp học của toàn hệ thống.
   - Trường `classId` trong schema/cơ sở dữ liệu được gán giá trị mặc định hợp lệ (`'CHUNG'` hoặc `'ALL'`) hoặc class mặc định/tùy chọn để đảm bảo tính toàn vẹn khóa ngoại (Foreign Key) và tính tương thích ngược với Supabase/Local/GAS repo.
2. **Cơ chế Cấu hình Ngân hàng Admin (Điều chỉnh linh hoạt):**
   - Cho phép Admin thay đổi thông tin: Số tài khoản (STK), Ngân hàng (Bank ID / Tên ngân hàng), Tên chủ tài khoản (Account Name).
   - Có Modal / Panel cấu hình trực quan tại trang Quản lý học phí `/admin/tuition`.
   - Lưu trữ bền vững (LocalStorage key `admin_bank_config` kèm endpoint API cấu hình `/api/settings/bank` hoặc fallback chuẩn).
3. **Cơ chế VietQR Code Động chuẩn Napas:**
   - Tạo mã QR thanh toán theo chuẩn VietQR Napas:
     ```
     https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<STUDENT_ID>&accountName=<ACCOUNT_NAME>
     ```
   - **Nội dung chuyển khoản bắt buộc:** Mã học sinh (`studentId` - ví dụ `ST001`). Cho phép mở rộng thêm invoiceId nếu cần nhưng trọng tâm nhận diện tự động là `Mã Học Sinh`.
4. **Cổng thanh toán QR phía Học sinh & Admin:**
   - Thay thế mock SVG QR hiện tại bằng ảnh VietQR thật từ API VietQR với các thông số động.
   - Hiển thị đầy đủ thông tin: STK, Tên ngân hàng, Tên chủ tài khoản, Số tiền, Nội dung chuyển khoản.
   - Thêm tiện ích một chạm: Nút **Copy STK**, **Copy Số tiền**, **Copy Nội dung chuyển khoản**.

---

## 2. PHÂN TÍCH RÀ SOÁT & GIẢI PHÁP KỸ THUẬT CHI TIẾT

### 2.1 Loại bỏ trường Lớp học trong Form tạo học phí (`/admin/tuition`)
* **Hiện trạng:**
  - `src/app/admin/tuition/page.tsx` có state `classId`, validation bắt buộc `if (!classId) setFormError('Vui lòng chọn lớp học')`, dropdown select `Lớp học *` và fetch danh sách classes khi mở modal.
  - Table học phí hiển thị cột `Mã lớp`.
  - Service `TuitionPayrollService.ts` validate `!data.classId`.
  - Database Supabase `tuition_invoices.class_id` có Foreign Key `REFERENCES classes(id)`.
* **Giải pháp xử lý:**
  1. Trong Form tạo học phí (`src/app/admin/tuition/page.tsx`):
     - Xóa ô chọn dropdown `Lớp học`.
     - Loại bỏ validation bắt buộc `classId` trên giao diện.
     - Khi submit, gán `classId: 'CHUNG'` (hoặc nếu Supabase yêu cầu tồn tại trong bảng `classes`, fallback lấy mã class đầu tiên hoặc sử dụng `'CHUNG'` đã được seed/xử lý an toàn).
     - Tiêu đề mặc định nếu không nhập: `Học phí học viên ${studentId}` thay vì `Học phí môn ${classId}`.
  2. Bảng danh sách học phí (`/admin/tuition`):
     - Có thể giữ cột `Lớp` nhưng hiển thị linh hoạt (nếu `classId === 'CHUNG'` hoặc không có thì hiển thị badge `Chung` hoặc `-`).
  3. Service & API (`src/services/TuitionPayrollService.ts` & `src/app/api/finance/route.ts`):
     - Cho phép `classId` optional hoặc gán default `'CHUNG'` / `'ALL'`.
     - Kiểm tra nếu `classId` không truyền từ client, backend tự động gán `classId = 'CHUNG'`.

### 2.2 Thiết kế Cơ chế Cấu hình Ngân hàng Admin
* **Mô hình Dữ liệu (`BankConfig`):**
  ```typescript
  export interface AdminBankConfig {
    bankId: string;       // Mã ngân hàng theo VietQR: MB, VCB, TCB, VPB, ACB, TPB, BIDV, CTG, etc.
    bankName: string;     // Tên hiển thị: Ngân hàng Quân Đội (MB Bank)
    accountNo: string;    // Số tài khoản
    accountName: string;  // Tên chủ tài khoản: NGUYEN VAN A
  }
  ```
* **Cấu hình mặc định (Default Bank Config):**
  ```typescript
  export const DEFAULT_BANK_CONFIG: AdminBankConfig = {
    bankId: 'MB',
    bankName: 'MBBank (Ngân hàng TMCP Quân Đội)',
    accountNo: '0987654321',
    accountName: 'TRUNG TAM DAO TAO TOILANING',
  };
  ```
* **Danh sách Ngân hàng hỗ trợ VietQR (Lookup list):**
  - Cung cấp danh sách các ngân hàng phổ biến tại Việt Nam (MB, Vietcombank, Techcombank, VPBank, ACB, TPBank, BIDV, VietinBank, Agribank, OCB, Sacombank, VIB) với mã chuẩn VietQR để Admin dễ dàng chọn từ dropdown.
* **Lưu trữ & Quản lý:**
  - Tạo endpoint `/api/settings/bank` (GET/POST) hoặc tiện ích helper `BankConfigService` kết hợp `localStorage` / server state.
  - Trên giao diện `/admin/tuition`, bổ sung nút **"Cấu hình tài khoản nhận tiền"** (icon `Settings` / `Landmark` / `CreditCard`) cạnh nút "Tạo phiếu thu".
  - Mở Modal **"Cấu hình Tài khoản Ngân hàng VietQR"** cho phép Admin sửa:
    + Chọn Ngân hàng (Dropdown danh sách ngân hàng lớn).
    + Nhập Số tài khoản (input text/number).
    + Nhập Tên chủ tài khoản (tự động uppercase).
  - Bấm "Lưu cấu hình": Lưu vào `localStorage` (key: `admin_bank_config`) và đồng bộ vào AppContext / API để trang học sinh có thể lấy được ngay.

### 2.3 Thiết kế Tạo mã VietQR Động chuẩn Napas
* **Cơ chế URL VietQR:**
  - Format URL:
    ```
    https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(studentId)}&accountName=${encodeURIComponent(accountName)}
    ```
  - Ví dụ thực tế:
    `https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=1500000&addInfo=ST001&accountName=TRUNG%20TAM%20DAO%20TAO%20TOILANING`
* **Nội dung chuyển khoản (`addInfo`):**
  - **Bắt buộc:** Mã học sinh của hóa đơn (Ví dụ: `ST001` hoặc `ST001 TUI123456`).
  - Chuẩn hóa text: Bỏ dấu tiếng Việt, viết hoa, không ký tự đặc biệt lạ để các app ngân hàng quét và điền chính xác 100%.

### 2.4 Cải tiến Modal Thanh toán QR Phía Học sinh & Admin
* **Tệp mục tiêu:**
  - `src/app/student/tuition/page.tsx`
  - (Tùy chọn bổ sung nút xem QR thanh toán ngay trên từng dòng hóa đơn ở `/admin/tuition` để Admin có thể xem và gửi ảnh QR cho phụ huynh).
* **Giao diện Modal QR mới:**
  1. **Khung hiển thị mã QR:**
     - Thẻ `<img>` nạp trực tiếp từ URL VietQR động đã format ở trên.
     - Có loader / skeleton khi ảnh đang tải; fallback nếu lỗi mạng.
     - Logo VietQR & Napas247 chuẩn sắc nét.
  2. **Chi tiết thông tin thanh toán (Kèm nút Copy 1 chạm):**
     - **Ngân hàng:** `<Tên ngân hàng> (<Mã ngân hàng>)`
     - **Số tài khoản:** `<Số tài khoản>` + Nút `Copy` (sử dụng `navigator.clipboard.writeText`, hiển thị icon `Check` khi copy thành công).
     - **Chủ tài khoản:** `<Tên chủ tài khoản>` + Nút `Copy`.
     - **Số tiền:** `<Số tiền VNĐ>` + Nút `Copy`.
     - **Nội dung CK:** `<Mã học sinh>` (Highligh màu vàng/cam nổi bật, kèm cảnh báo: *"Vui lòng giữ nguyên nội dung chuyển khoản là Mã học sinh để hệ thống tự động ghi nhận"*).
  3. **Nút tương tác:**
     - Nút "Mở ứng dụng ngân hàng / Tải mã QR".
     - Nút "Xác nhận đã chuyển khoản" (Mock ghi nhận thanh toán hoàn tất).

---

## 3. PHÂN CÔNG THỰC THI (WORKER & TESTER)

### Giai đoạn 1: WORKER (`ag/gemini-3.8-flash-high`)
1. **Tạo types và helper VietQR:**
   - Tạo file `src/types/bank.ts` và helper `src/utils/vietqr.ts` chứa list ngân hàng VietQR, type `AdminBankConfig`, hàm generate QR URL.
2. **Cập nhật Backend & Services:**
   - `src/services/TuitionPayrollService.ts`: Đặt `classId?: string` mặc định `'CHUNG'`.
   - `src/app/api/finance/route.ts`: Xử lý fallback `classId || 'CHUNG'`.
   - Tạo route `/api/settings/bank/route.ts` để đọc/ghi thông tin ngân hàng admin (có in-memory fallback hoặc storage).
3. **Cập nhật Giao diện Admin (`src/app/admin/tuition/page.tsx`):**
   - Bỏ chọn Lớp học khỏi Create Tuition Modal.
   - Thêm Modal Cấu hình Ngân hàng Admin (STK, Bank, Tên).
   - Thêm nút xem VietQR cho từng hóa đơn trên bảng Admin.
4. **Cập nhật Giao diện Học sinh (`src/app/student/tuition/page.tsx`):**
   - Thay thế mock SVG bằng thẻ `img` VietQR động.
   - Hiển thị đầy đủ STK, Ngân hàng, Tên chủ thẻ, Số tiền, Nội dung CK là Mã HS.
   - Tích hợp tính năng Copy vào clipboard với hiệu ứng toast/visual feedback.

### Giai đoạn 2: TESTER (`ag/gemini-3.8-flash-low`)
1. Kiểm thử form tạo học phí khi không có lớp học -> Hóa đơn được tạo thành công, `classId` không bị lỗi null/undefined.
2. Kiểm thử đổi cấu hình ngân hàng ở Admin -> Trang học sinh load mã QR và thông tin STK/Ngân hàng/Tên mới ngay lập tức.
3. Kiểm thử URL VietQR sinh ra:
   - Check tham số `amount`, `addInfo` (đúng mã học sinh), `accountName`.
4. Kiểm thử các nút Copy Clipboard hoạt động tốt trên các trình duyệt.
5. Chạy TypeScript type-check (`npm run build` hoặc `npx tsc --noEmit`) để đảm bảo không lỗi kiểu dữ liệu.

---
