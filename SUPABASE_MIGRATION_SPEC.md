# ĐẶC TẢ KỸ THUẬT: DI CHUYỂN HỆ THỐNG DATABASE SANG SUPABASE
**Dành cho WORKER (`code_worker` / `ag/gemini-3.8-flash-high`)**
**Ngày lập:** 2026-09-20
**Trạng thái:** Sẵn sàng triển khai

---

## 1. MỤC TIÊU VÀ TỔNG QUAN
Dự án **Student Management System** đang hỗ trợ các backend dữ liệu `local` và `gas` (Google Apps Script). Cần bổ sung backend chính thức dựa trên PostgreSQL qua **Supabase** (`DATA_SOURCE=supabase`).

Cơ sở dữ liệu PostgreSQL đã được thiết kế và đặt tại:
- Schema SQL: `supabase/schema.sql` (Chứa 13 bảng đầy đủ quan hệ, Citext, Unique Indexes, RLS cấu hình sẵn).
- Seed SQL: `supabase/seed.sql` (Dữ liệu seed mẫu chuẩn mã hóa SHA-256 cho 1 admin, 20 giáo viên, 400 học viên, 30 lớp, lịch học, điểm danh, tài chính, audit logs).

---

## 2. NHIỆM VỤ CHI TIẾT CỦA WORKER

### Nhiệm vụ 2.1: Cài đặt thư viện Supabase Client
Thực thi cài đặt package `@supabase/supabase-js` vào dự án:
```bash
npm install @supabase/supabase-js
```

### Nhiệm vụ 2.2: Cấu hình biến môi trường
1. Cập nhật file `.env.example`:
```env
# Database Source: local | gas | supabase
DATA_SOURCE=supabase

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key
```
2. Lưu ý: Client dùng `SUPABASE_SERVICE_ROLE_KEY` ở backend/server context của Next.js (hoặc fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY`) để truy cập đầy đủ các thao tác CRUD và bypass RLS mà không bị chặn quyền.

### Nhiệm vụ 2.3: Tạo Supabase Client helper
Tạo file `src/lib/supabase.ts`:
- Khởi tạo `createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })`.
- Đảm bảo kiểm tra nếu thiếu biến môi trường thì báo lỗi rõ ràng hoặc xử lý fallback an toàn.

### Nhiệm vụ 2.4: Xây dựng `src/repositories/SupabaseRepository.ts`
Implement toàn bộ interface `IRepository` từ `src/repositories/IRepository.ts` theo mô hình Singleton (`SupabaseRepository.getInstance()`):

1. **Mapping dữ liệu giữa Typescript và Supabase Schema:**
   - `users`:
     - `id` -> `id`
     - `passwordHash` -> `password_hash`
     - `isActive` -> `is_active`
   - `classrooms`:
     - `facilities` -> mảng text `facilities`
   - `teachers`:
     - `hourlyRate` -> `hourly_rate`
     - `assignedClassIds`: Truy vấn danh sách `classes` có `teacher_id = teacher.id`
   - `students`:
     - `dateOfBirth` -> `date_of_birth`
     - `avatarUrl` -> `avatar_url`
     - `enrolledClassIds`: Truy vấn bảng trung gian `class_students` với `student_id = student.id`
   - `classes`:
     - `teacherId` -> `teacher_id`
     - `roomId` -> `room_id`
     - `tuitionFee` -> `tuition_fee`
     - `scheduleDays` -> `schedule_days`
     - `shiftId` -> `shift_id`
     - `meetingLink` -> `meeting_link`
     - `studentIds`: Truy vấn bảng trung gian `class_students` với `class_id = class.id`
     - *Khi tạo/cập nhật lớp*: Đồng thời insert/xóa tương ứng trong bảng `class_students`.
   - `schedule_slots`:
     - `classId` -> `class_id`, `teacherId` -> `teacher_id`, `roomId` -> `room_id`, `shiftId` -> `shift_id`, `startTime` -> `start_time`, `endTime` -> `end_time`, `meetingLink` -> `meeting_link`
   - `attendance_records`:
     - `scheduleSlotId` -> `schedule_slot_id`, `classId` -> `class_id`, `studentId` -> `student_id`, `checkinTime` -> `checkin_time`, `updatedBy` -> `updated_by`, `updatedAt` -> `updated_at`
   - `class_requests`:
     - `studentId` -> `student_id`, `classId` -> `class_id`, `scheduleSlotId` -> `schedule_slot_id`, `targetScheduleSlotId` -> `target_schedule_slot_id`, `reviewedBy` -> `reviewed_by`, `reviewNote` -> `review_note`
   - `tuition_invoices`:
     - `studentId` -> `student_id`, `classId` -> `class_id`, `paidAmount` -> `paid_amount`, `remainingAmount` -> `remaining_amount`, `dueDate` -> `due_date`, `paidDate` -> `paid_date`, `paymentMethod` -> `payment_method`, `transactionCode` -> `transaction_code`
   - `teacher_payroll_periods`:
     - `teacherId` -> `teacher_id`, `totalSlots` -> `total_slots`, `totalHours` -> `total_hours`, `hourlyRate` -> `hourly_rate`, `grossSalary` -> `gross_salary`, `netSalary` -> `net_salary`, `paidDate` -> `paid_date`
   - `audit_logs`:
     - `userId` -> `user_id`, `userName` -> `user_name`, `userRole` -> `user_role`, `targetResource` -> `target_resource`, `targetId` -> `target_id`, `oldValue` -> `old_value`, `newValue` -> `new_value`, `ipAddress` -> `ip_address`
   - `notifications`:
     - `recipientRole` -> `recipient_role`, `recipientUserId` -> `recipient_user_id`, `isRead` -> `is_read`, `createdAt` -> `created_at`

2. **Các phương thức nghiệp vụ cần lưu ý đặc biệt:**
   - `authenticate(username, passwordHash)`: Tìm trong bảng `users` với `username` (không phân biệt hoa thường) và so khớp `password_hash = passwordHash`, kiểm tra `is_active = true`.
   - `saveAttendanceBatch(records)`: Sử dụng `.upsert()` vào `attendance_records` theo cặp `(schedule_slot_id, student_id)`.
   - `resetData()`: Xóa sạch các bảng theo thứ tự khóa ngoại và chạy lệnh chèn lại từ file SQL hoặc seed script.

### Nhiệm vụ 2.5: Cập nhật `src/repositories/index.ts`
Chỉnh sửa file `src/repositories/index.ts` để nhận diện biến môi trường `DATA_SOURCE=supabase`:
```typescript
import { IRepository } from "./IRepository";
import { LocalRepository } from "./LocalRepository";
import { GoogleAppsScriptRepository } from "./GoogleAppsScriptRepository";
import { SupabaseRepository } from "./SupabaseRepository";

export function getRepository(): IRepository {
  const dataSource = (process.env.DATA_SOURCE || "local").toLowerCase();

  if (dataSource === "supabase") {
    return SupabaseRepository.getInstance();
  }

  if (dataSource === "gas") {
    return GoogleAppsScriptRepository.getInstance();
  }

  return LocalRepository.getInstance();
}

export const repo = getRepository();

export * from "./IRepository";
export * from "./LocalRepository";
export * from "./GoogleAppsScriptRepository";
export * from "./SupabaseRepository";
```

---

## 3. TIÊU CHÍ NGHIỆM THU (TESTING & VERIFICATION)
Sau khi hoàn thành code:
1. `npm run build` không phát sinh bất kỳ lỗi TypeScript nào.
2. Viết hoặc cập nhật test suite (vd: `tests/supabase-repo.test.ts` hoặc mock test) để xác thực các hàm CRUD cốt lõi của `SupabaseRepository`.
3. Bàn giao lại kết quả cho TESTER xác minh tính tương thích ngược với toàn bộ hệ thống API routes và UI components.
