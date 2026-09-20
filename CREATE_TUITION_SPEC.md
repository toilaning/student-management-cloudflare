# Đặc tả Kỹ thuật: Chức năng Tạo Hóa Đơn Học Phí cho Role Admin

> **Tài liệu đặc tả kiến trúc và triển khai kỹ thuật (Specification)**  
> **Người lập:** MANAGER (ag/gemini-3.8-flash-medium)  
> **Dự án:** Student Management System (`/Users/toilaning/projects/student-management`)  
> **Mục tiêu:** Bổ sung tính năng tạo mới phiếu thu / hóa đơn học phí cho học viên tại trang Admin (`/admin/tuition`).

---

## 1. Hiện trạng Hệ thống (Current State)

1. **Giao diện (`src/app/admin/tuition/page.tsx`)**:
   - Hiện tại chỉ hiển thị danh sách hóa đơn học phí, bộ lọc (tìm kiếm, trạng thái), thống kê (tổng phải thu, đã thu, còn nợ) và phân trang.
   - Chưa có nút hành động tạo mới hóa đơn học phí và chưa có Modal nhập thông tin.

2. **API Backend (`src/app/api/finance/route.ts`)**:
   - Đã có `GET`: lấy danh sách hóa đơn hoặc tóm tắt công nợ của học viên.
   - Đang có `POST`: xử lý thanh toán học phí (`processPayment`). Cần tách rõ hoặc mở rộng để phân biệt giữa:
     - Tạo hóa đơn học phí mới (`action: 'CREATE'` hoặc check body có `title`, `studentId`, `amount`, `dueDate` vs thanh toán `invoiceId`, `paymentAmount`).
     - Hoặc hỗ trợ chuẩn hóa payload: nếu body có `title` và không có `invoiceId` -> xử lý tạo mới hóa đơn.

3. **Tầng Repository (`IRepository`, `LocalRepository`, `SupabaseRepository`, `GoogleAppsScriptRepository`)**:
   - Hiện chỉ có các method:
     - `getAllTuitionInvoices()`
     - `getTuitionInvoicesByStudentId(studentId)`
     - `getTuitionInvoiceById(id)`
     - `updateTuitionInvoice(invoice)`
   - **Chưa có** method `createTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice>`.

---

## 2. Chi tiết Đặc tả Kỹ thuật (Detailed Specifications)

### 2.1. Tầng Repository & Interface

#### A. Cập nhật `src/repositories/IRepository.ts`
Thêm khai báo phương thức:
```typescript
createTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice>;
```

#### B. Cập nhật `src/repositories/LocalRepository.ts`
Thực thi lưu Map:
```typescript
public async createTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice> {
  this.tuitionInvoices.set(invoice.id, { ...invoice });
  return invoice;
}
```

#### C. Cập nhật `src/repositories/SupabaseRepository.ts`
Thực thi lưu vào Supabase table `tuition_invoices`:
```typescript
public async createTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice> {
  const client = this.getClient();
  if (!client) throw new Error("Supabase Cloud client is not configured.");

  try {
    const row = mapTuitionInvoiceToDb(invoice);
    const { error } = await client
      .from('tuition_invoices')
      .insert(row);

    if (error) {
      if (this.fallbackToLocalOnFailure) return localRepo.createTuitionInvoice(invoice);
      throw new Error(error.message);
    }
    return invoice;
  } catch (err) {
    if (this.fallbackToLocalOnFailure) return localRepo.createTuitionInvoice(invoice);
    throw err;
  }
}
```

#### D. Cập nhật `src/repositories/GoogleAppsScriptRepository.ts`
Thực thi phương thức gọi GAS hoặc fallback Local:
```typescript
public async createTuitionInvoice(invoice: TuitionInvoice): Promise<TuitionInvoice> {
  return this.callGas<TuitionInvoice>("TuitionService", "createTuitionInvoice", { invoice });
}
```
*(Đồng thời bổ sung router action tương ứng nếu có fallback)*.

---

### 2.2. Tầng Service (`src/services/TuitionPayrollService.ts`)

Bổ sung phương thức `createInvoice`:
```typescript
public async createInvoice(data: {
  studentId: string;
  classId: string;
  title: string;
  amount: number;
  dueDate: string;
  notes?: string;
}): Promise<TuitionInvoice> {
  if (!data.studentId || !data.classId || !data.title || data.amount <= 0 || !data.dueDate) {
    throw new Error('Thiếu thông tin bắt buộc hoặc số tiền không hợp lệ');
  }

  // Sinh ID: TUI + Timestamp ngẫu nhiên 6 số hoặc đếm
  const invoiceId = `TUI${Date.now().toString().slice(-6)}`;

  const newInvoice: TuitionInvoice = {
    id: invoiceId,
    studentId: data.studentId,
    classId: data.classId,
    title: data.title,
    amount: data.amount,
    paidAmount: 0,
    remainingAmount: data.amount,
    dueDate: data.dueDate,
    status: 'Còn nợ',
  };

  await this.repo.createTuitionInvoice(newInvoice);

  // Ghi Audit Log
  await this.repo.addAuditLog({
    userId: 'ADMIN001',
    userName: 'Quản Trị Viên Hệ Thống',
    userRole: 'ADMIN',
    action: 'CREATE',
    targetResource: 'TUITION_INVOICE',
    targetId: newInvoice.id,
    details: `Tạo hóa đơn học phí mã ${newInvoice.id} cho học viên ${newInvoice.studentId}, lớp ${newInvoice.classId}. Số tiền: ${newInvoice.amount.toLocaleString('vi-VN')} VNĐ. Hạn nộp: ${newInvoice.dueDate}${data.notes ? ` (Ghi chú: ${data.notes})` : ''}`,
  });

  return newInvoice;
}
```

---

### 2.3. Tầng API Backend (`src/app/api/finance/route.ts`)

Cập nhật method `POST`:
- Phân biệt 2 luồng:
  1. Nếu body có `action === 'CREATE'` hoặc có trường `title` và không có `invoiceId`:
     - Nhận payload: `{ studentId, classId, title, originalAmount, discountAmount, finalAmount, dueDate, notes }`.
     - Số tiền tính vào hóa đơn là `finalAmount` (hoặc `originalAmount - (discountAmount || 0)`).
     - Gọi `financeService.createInvoice(...)`.
     - Trả về status 201 Created: `{ success: true, invoice: newInvoice }`.
  2. Ngược lại (có `invoiceId` và `paymentAmount`): giữ nguyên logic thanh toán học phí `processPayment`.

---

### 2.4. Tầng Frontend UI (`src/app/admin/tuition/page.tsx`)

#### A. Header Action
- Bổ sung nút bấm `+ Tạo Hóa Đơn Mới` ở góc trên bên phải của trang (Header hoặc sát thanh tìm kiếm / filter):
  - Icon: `Plus` từ `lucide-react`.
  - Style: `inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition`.
  - Sự kiện: click mở Modal tạo hóa đơn (`setIsCreateModalOpen(true)`).

#### B. Modal "Tạo Hóa Đơn Học Phí"
- **State quản lý**:
  - `studentId` (string, required)
  - `classId` (string, required)
  - `title` (string, required - tự động gợi ý theo môn/tháng khi chọn lớp)
  - `originalAmount` (number, required)
  - `discountAmount` (number, default: 0)
  - `finalAmount` (tự động tính: `originalAmount - discountAmount`)
  - `dueDate` (string YYYY-MM-DD, default: cuối tháng hiện tại hoặc +15 ngày)
  - `notes` (string, optional)
  - `isSubmitting` (boolean)
  - `errorMessage` (string | null)

- **Dữ liệu nguồn (Options)**:
  - Tự động fetch danh sách học viên từ `/api/students` và danh sách lớp học từ `/api/classes` khi mở modal hoặc khi khởi tạo trang.
  - Dropdown học viên: hiển thị Mã SV + Họ tên (ví dụ: `SV001 - Nguyễn Văn A`).
  - Dropdown lớp học: hiển thị Mã lớp + Tên môn học (ví dụ: `CLS001 - Lập trình React`).

- **Form UX & Validation**:
  - Hiển thị số tiền dạng format VNĐ trực quan khi nhập liệu.
  - Validate: học viên và lớp học bắt buộc chọn, `finalAmount > 0`, hạn nộp hợp lệ.
  - Spinner trạng thái khi submit.

#### C. Xử lý sau khi tạo thành công
- Hiển thị thông báo Toast / Banner thành công.
- Tự động đóng Modal và reset form.
- Reload lại danh sách hóa đơn từ API `/api/finance` để bảng hiển thị ngay hóa đơn mới tạo và cập nhật lại 3 thẻ thống kê (Tổng phải thu, Đã thu, Còn nợ).

---

## 3. Kế hoạch Phân bổ Công việc cho Pipeline (Execution Plan)

1. **WORKER (`ag/gemini-3.8-flash-high`)**:
   - Bổ sung `createTuitionInvoice` vào `IRepository`, `LocalRepository`, `SupabaseRepository`, `GoogleAppsScriptRepository`.
   - Bổ sung `createInvoice` vào `TuitionPayrollService`.
   - Cập nhật `POST /api/finance` để hỗ trợ tạo hóa đơn mới với status code 201 và ghi audit log.
   - Xây dựng UI Modal và nút bấm "+ Tạo Hóa Đơn Mới" trên `src/app/admin/tuition/page.tsx`, kết nối API fetch students/classes và post invoice.
   - Build & type check kiểm tra toàn vẹn mã nguồn (`npm run build` hoặc `npx tsc --noEmit`).

2. **TESTER (`ag/gemini-3.8-flash-low`)**:
   - Viết hoặc chạy test suite kiểm thử API `POST /api/finance` (tạo hóa đơn mới, validate thiếu field, tính toán `finalAmount`, kiểm tra trạng thái ban đầu 'Còn nợ').
   - Kiểm tra UI render, modal submit và reload state.

---
