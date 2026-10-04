# TÀI LIỆU ĐẶC TẢ KỸ THUẬT (SPECIFICATION)
## NÂNG CẤP BỎ EMAIL LIÊN KẾT, ĐỒNG BỘ 2 CHIỀU HỌC SINH ⟷ TÀI KHOẢN & CẬP NHẬT HỌC PHÍ THỦ CÔNG

- **Dự án**: Student Management System (`/Users/toilaning/projects/student-management`)
- **Tác giả**: MANAGER (Model: `custom-9router-gateway-20128/ag/gemini-3.8-flash-medium`)
- **Đối tượng bàn giao**: ORCHESTRATOR & WORKER (`ag/gemini-3.8-flash-high`) & TESTER (`ag/gemini-3.8-flash-low`)
- **Ngày lập**: 2026-09-20
- **Mục tiêu**: Xử lý triệt để 3 bài toán nâng cấp trải nghiệm quản trị, bảo đảm toàn vẹn dữ liệu hệ thống (Supabase & Google Apps Script).

---

## 1. YÊU CẦU 1: BỎ MỤC EMAIL LIÊN KẾT CỦA HỌC SINH VÀ GIÁO VIÊN

### 1.1. Bối cảnh & Vấn đề
- Hiện tại trang Quản lý học sinh (`src/app/admin/students/page.tsx`) và Quản lý giáo viên (`src/app/admin/teachers/page.tsx`) yêu cầu nhập email và hiển thị cột/dòng email.
- Trong thực tế quản lý trung tâm/trường học, học sinh nhỏ tuổi hoặc giáo viên không nhất thiết sử dụng email khi giao tiếp qua số điện thoại/Zalo. Việc bắt buộc nhập email tạo rào cản khi thêm mới.
- Tuy nhiên trong Database (cả Supabase `schema.sql` và Google Sheets), các trường `email` trên bảng `users`, `students`, `teachers` có thể có ràng buộc `UNIQUE` hoặc `NOT NULL`.

### 1.2. Giải pháp Kỹ thuật & Rà soát File
#### A. Frontend: Trang Quản lý Học sinh (`src/app/admin/students/page.tsx`)
1. **Ẩn/bỏ input Email trong Modal Thêm Học Viên**:
   - Loại bỏ trường `<input type="email" value={newStudentData.email} ... />`.
   - Không bắt buộc người dùng nhập email.
2. **Ẩn/bỏ hiển thị Email trên bảng danh sách học sinh**:
   - Dòng 233: `<div className="text-[10px] text-slate-400 truncate max-w-[180px]">{st.email}</div>` -> Ẩn hoặc loại bỏ, chỉ giữ Tên học sinh và SĐT hoặc ID.
3. **Modal Chi tiết / Sửa học viên (nếu có)**:
   - Ẩn hiển thị email hoặc đặt thành trường không bắt buộc (readonly / ẩn).

#### B. Frontend: Trang Đội ngũ Giáo viên (`src/app/admin/teachers/page.tsx`)
1. **Ẩn/bỏ input Email trong Modal Thêm Giáo Viên**:
   - Loại bỏ trường `<input type="email" value={formData.email} ... />`.
2. **Ẩn/bỏ hiển thị Email trên bảng danh sách giáo viên**:
   - Dòng 199: `<span className="truncate whitespace-nowrap">{tc.email}</span>` -> Ẩn hoặc thay thế bằng SĐT/chuyên môn.

#### C. Backend: API Sinh Email Tự Động (Fallback An Toàn)
1. **API Students (`src/app/api/students/route.ts`)**:
   - Khi tạo học viên mới (`POST /api/students`):
     * Nếu client không gửi `email` (hoặc chuỗi rỗng): Tự động sinh:
       `email: \`${newId.toLowerCase()}@student.local\``
     * Đảm bảo không trùng lặp và thỏa mãn schema `NOT NULL / UNIQUE` của Database.
2. **API Teachers (`src/app/api/teachers/route.ts`)**:
   - Khi tạo giáo viên mới (`POST /api/teachers`):
     * Nếu không có email: Tự động sinh:
       `email: \`${newId.toLowerCase()}@teacher.local\``

---

## 2. YÊU CẦU 2: ĐỒNG BỘ 2 CHIỀU HỌC SINH ⟷ TÀI KHOẢN NGƯỜI DÙNG

### 2.1. Bối cảnh & Vấn đề
- Hiện tại khi thêm học viên ở `POST /api/students`, hệ thống chỉ tạo bản ghi trên bảng `students`. Học sinh không có tài khoản đăng nhập để tra cứu điểm số, thời khóa biểu, công nợ.
- Ngược lại, khi Admin tạo tài khoản có vai trò `STUDENT` ở trang `accounts` (`POST /api/users`), chỉ có bản ghi `users` được tạo, danh sách `students` không có học sinh này, dẫn tới xung đột ID, rác dữ liệu và không thể phân lớp hay thu học phí.

### 2.2. Giải pháp Thiết kế Đồng bộ 2 Chiều

#### A. Chiều 1: Thêm Học Sinh Mới -> Tự động Tạo Tài Khoản `users`
- **Vị trí xử lý**: `src/app/api/students/route.ts` trong hàm `POST`.
- **Luồng xử lý**:
  1. Tạo `newStudent` (ID dạng `STxxx`, ví dụ `ST041`).
  2. Lưu học sinh: `await repo.createStudent(newStudent)`.
  3. Kiểm tra xem tài khoản `users` với `id: newStudent.id` hoặc `username: newStudent.id.toLowerCase()` đã tồn tại chưa:
     * Nếu chưa tồn tại: Khởi tạo đối tượng tài khoản người dùng:
       ```ts
       const authService = new AuthService(repo);
       const defaultPassword = 'password123'; // hoặc cấu hình chuẩn
       const newUser: User = {
         id: newStudent.id,
         username: newStudent.id.toLowerCase(), // vd: st041
         passwordHash: authService.hashPassword(defaultPassword),
         role: 'STUDENT',
         name: newStudent.name,
         email: newStudent.email || `${newStudent.id.toLowerCase()}@student.local`,
         isActive: true,
         createdAt: new Date().toISOString(),
       };
       await repo.createUser(newUser);
       ```
     * Ghi thêm Audit Log: `Tự động tạo tài khoản người dùng [${newStudent.id}] cho học viên ${newStudent.name}`.

#### B. Chiều 2: Tạo Tài Khoản STUDENT -> Tự động Tạo Bản Ghi `students`
- **Vị trí xử lý**: `src/app/api/users/route.ts` trong hàm `POST`.
- **Luồng xử lý**:
  1. Khi nhận request tạo tài khoản với `role === 'STUDENT'`:
     * Chuẩn hóa ID: Nếu username là `STxxx` (vd `st042`), ID là `ST042`. Nếu username tự do, hệ thống lấy `username.toUpperCase()` hoặc tự sinh mã `STxxx` tiếp theo.
     * Tạo tài khoản `newUser` trên bảng `users` như hiện tại.
  2. Kiểm tra trên bảng `students` xem học sinh với `id: newUser.id` đã tồn tại chưa:
     * Nếu chưa tồn tại: Tự động khởi tạo bản ghi `Student`:
       ```ts
       const newStudent: Student = {
         id: newUser.id,
         name: newUser.name,
         dateOfBirth: '2008-01-01', // Ngày sinh mặc định
         gender: 'Nam',
         phone: '0900000000', // SĐT định danh mặc định hoặc lấy từ input form nếu có
         email: newUser.email || `${newUser.id.toLowerCase()}@student.local`,
         address: 'TP. Hồ Chí Minh',
         status: 'Đang học',
         enrolledClassIds: [],
         createdAt: new Date().toISOString(),
       };
       await repo.createStudent(newStudent);
       ```
     * Ghi thêm Audit Log: `Tự động đồng bộ hồ sơ học viên [${newUser.id}] từ tài khoản người dùng`.

#### C. Quy tắc Toàn vẹn & An toàn Dữ liệu (Idempotency)
- Cả 2 chiều đều phải bọc kiểm tra `existing` trước khi `create`, tránh lỗi duplicate key hoặc văng exception.
- Không để lỗi tạo bản ghi phụ làm rollback gián đoạn luồng chính nếu không cần thiết, nhưng phải log rõ ràng.

---

## 3. YÊU CẦU 3: CẬP NHẬT TRẠNG THÁI THANH TOÁN HỌC PHÍ THỦ CÔNG CHO ADMIN

### 3.1. Bối cảnh & Vấn đề
- Bảng học phí tại `src/app/admin/tuition/page.tsx` hiện chỉ hiển thị nút xem mã VietQR đối với hóa đơn còn nợ (`inv.remainingAmount > 0`).
- Khi phụ huynh nộp tiền mặt tại quầy hoặc chuyển khoản trực tiếp qua ngân hàng mà không qua webhook tự động, Admin không có công cụ cập nhật trạng thái hóa đơn ngay trên giao diện.
- Đồng thời Admin cần linh hoạt chuyển trạng thái qua lại giữa **"Đã nộp"**, **"Còn nợ"** (nếu thu nhầm/hủy giao dịch), hoặc đánh dấu **"Quá hạn"**.

### 3.2. Đặc tả Nghiệp vụ Thay đổi Trạng thái

| Trạng thái đích | `paidAmount` | `remainingAmount` | `status` | `paidDate` | `paymentMethod` | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Đã nộp** | `= amount` | `= 0` | `'Đã nộp'` | Ngày nộp chọn (mặc định hôm nay `YYYY-MM-DD`) | `'Tiền mặt'` / `'Chuyển khoản'` / `'Miễn giảm'` | Đã hoàn tất thanh toán toàn bộ công nợ. |
| **Còn nợ** | `= 0` | `= amount` | `'Còn nợ'` | `undefined` / `null` | `undefined` | Hủy thanh toán hoặc hoàn tác về trạng thái chưa nộp. |
| **Quá hạn** | Giữ nguyên hoặc `0` | `= amount - paidAmount` | `'Quá hạn'` | Không đổi | Không đổi | Đánh dấu hóa đơn đã quá hạn nộp tiền để đôn đốc. |

### 3.3. Thiết kế Giao diện UI (`src/app/admin/tuition/page.tsx`)
1. **Cột "Thao tác" trên bảng hóa đơn**:
   - Bổ sung nút hành động dạng Menu hoặc Dropdown/Button nhóm:
     * **Nút "Thu tiền / Cập nhật"** (khi còn nợ hoặc quá hạn): Bật Modal Xác nhận thanh toán thủ công.
     * **Dropdown chọn trạng thái**: Cho phép chuyển nhanh sang:
       1. `Đã nộp (Tiền mặt / Chuyển khoản)`
       2. `Hoàn tác về Còn nợ`
       3. `Đánh dấu Quá hạn`
2. **Modal Xác Nhận Thu Học Phí Thủ Công**:
   - Cho phép Admin chọn:
     * Ngày nộp (mặc định ngày hiện tại `new Date().toISOString().split('T')[0]`).
     * Phương thức thanh toán: `Tiền mặt` | `Chuyển khoản QR` | `Thẻ ngân hàng`.
     * Ghi chú / Mã tham chiếu giao dịch (nếu có).
     * Xác nhận cập nhật `paidAmount = amount` và `status = 'Đã nộp'`.
3. **Cập nhật tức thì (Optimistic UI / Refetch)**:
   - Sau khi cập nhật thành công, gọi lại `loadData()` để cập nhật biểu đồ thống kê học phí, tổng nợ, danh sách hóa đơn và thông báo toast thành công.

### 3.4. Thiết kế Backend API (`src/app/api/finance/route.ts`)
- **Phương thức**: `PUT /api/finance` (hoặc `PATCH /api/finance`).
- **Payload Request**:
  ```json
  {
    "action": "UPDATE_STATUS",
    "invoiceId": "TUI001",
    "status": "Đã nộp", // "Đã nộp" | "Còn nợ" | "Quá hạn"
    "paymentMethod": "Tiền mặt", // khi status = "Đã nộp"
    "paidDate": "2026-09-20", // tuỳ chọn
    "transactionCode": "CASH-ADMIN-01", // tuỳ chọn
    "actorId": "ADMIN001",
    "actorName": "Quản trị viên"
  }
  ```
- **Xử lý trong Route / Service (`TuitionPayrollService.ts`)**:
  1. Tìm hóa đơn bằng `repo.getTuitionInvoiceById(invoiceId)`. Nếu không thấy -> báo lỗi 404.
  2. Theo `status`:
     * Nếu `status === 'Đã nộp'`:
       - `invoice.paidAmount = invoice.amount;`
       - `invoice.remainingAmount = 0;`
       - `invoice.status = 'Đã nộp';`
       - `invoice.paidDate = paidDate || new Date().toISOString().split('T')[0];`
       - `invoice.paymentMethod = paymentMethod || 'Tiền mặt';`
       - `invoice.transactionCode = transactionCode || 'MANUAL-ADMIN';`
     * Nếu `status === 'Còn nợ'`:
       - `invoice.paidAmount = 0;`
       - `invoice.remainingAmount = invoice.amount;`
       - `invoice.status = 'Còn nợ';`
       - `invoice.paidDate = undefined;`
       - `invoice.transactionCode = undefined;`
     * Nếu `status === 'Quá hạn'`:
       - `invoice.status = 'Quá hạn';`
       - `invoice.remainingAmount = invoice.amount - (invoice.paidAmount || 0);`
  3. Cập nhật vào DB: `await repo.updateTuitionInvoice(invoice)`.
  4. Ghi Audit Log:
     ```ts
     await repo.addAuditLog({
       action: 'UPDATE',
       userId: actorId || 'ADMIN001',
       userName: actorName || 'Quản trị viên',
       userRole: 'ADMIN',
       targetResource: 'TUITION',
       targetId: invoice.id,
       details: `Cập nhật thủ công trạng thái hóa đơn [${invoice.id}] thành "${invoice.status}" (Đã nộp: ${invoice.paidAmount.toLocaleString('vi-VN')} đ, Phương thức: ${invoice.paymentMethod || 'N/A'})`,
     });
     ```
  5. Trả về `{ success: true, invoice }`.

---

## 4. KẾ HOẠCH PHÂN BỔ CÔNG VIỆC CHO WORKER & TESTER

### 4.1. Nhiệm vụ của WORKER (`ag/gemini-3.8-flash-high`)
1. **Task W1: Bỏ trường email tại UI & Fallback API**:
   - Sửa `src/app/admin/students/page.tsx` (ẩn input email modal, ẩn dòng email bảng).
   - Sửa `src/app/admin/teachers/page.tsx` (ẩn input email modal, ẩn dòng email bảng).
   - Cập nhật fallback tự sinh email ẩn tại `src/app/api/students/route.ts` & `src/app/api/teachers/route.ts`.
2. **Task W2: Đồng bộ 2 chiều Học sinh ⟷ Users**:
   - Cập nhật `POST /api/students`: Tự sinh tài khoản `users` tương ứng khi thêm học sinh.
   - Cập nhật `POST /api/users`: Tự sinh hồ sơ `students` tương ứng khi tạo tài khoản role `STUDENT`.
   - Bổ sung Audit Log cho cả 2 hành vi đồng bộ tự động.
3. **Task W3: Cập nhật Trạng thái Học phí Thủ công**:
   - Mở rộng `PUT /api/finance` hỗ trợ `action: 'UPDATE_STATUS'`.
   - Cập nhật giao diện `src/app/admin/tuition/page.tsx`: Thêm action dropdown / button nhóm "Cập nhật trạng thái" và modal xác nhận thu tiền.
   - Kiểm tra tương thích cả Supabase và Google Apps Script Repository.

### 4.2. Nhiệm vụ của TESTER (`ag/gemini-3.8-flash-low`)
1. **Kiểm thử Typecheck & Lint**:
   - Chạy `npm run build` hoặc `npx tsc --noEmit` để đảm bảo không lỗi kiểu dữ liệu.
2. **Kiểm thử Luồng Email**:
   - Thêm học sinh không điền email -> Kiểm tra bản ghi sinh ra có email fallback dạng `stxxx@student.local`.
   - Thêm giáo viên không điền email -> Kiểm tra email fallback dạng `gvxxx@teacher.local`.
3. **Kiểm thử Đồng bộ 2 chiều**:
   - Tạo học sinh mới ở `/admin/students` -> Sang `/admin/accounts` kiểm tra xem tài khoản `stxxx` đã tự động xuất hiện chưa. Đăng nhập thử với pass `password123`.
   - Tạo tài khoản học sinh mới ở `/admin/accounts` -> Sang `/admin/students` kiểm tra hồ sơ học viên đã được tạo tự động chưa.
4. **Kiểm thử Cập nhật Học phí**:
   - Chuyển 1 hóa đơn từ "Còn nợ" sang "Đã nộp" thủ công -> Kiểm tra số tiền `paidAmount`, `remainingAmount`, và Audit Log ghi nhận.
   - Chuyển ngược lại về "Còn nợ" -> Kiểm tra số tiền hoàn tác chính xác.

---
