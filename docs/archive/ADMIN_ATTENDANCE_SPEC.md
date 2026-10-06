# ĐẶC TẢ KỸ THUẬT CHI TIẾT (SPEC) - GIAI ĐOẠN 1
## HỆ THỐNG QUẢN TRỊ ĐIỂM DANH TOÀN TRƯỜNG & ĐIỂM DANH BÙ (ADMIN ATTENDANCE)

---

- **Mã tài liệu:** SPEC-ADMIN-ATTENDANCE-01
- **Người lập:** MANAGER (`ag/gemini-3.8-flash-medium`)
- **Đối tượng thực hiện:** WORKER (`ag/gemini-3.8-flash-high`)
- **Đối tượng kiểm thử:** TESTER (`ag/gemini-3.8-flash-low`)
- **Phạm vi tác động:** `src/types/attendance.ts`, `src/repositories/`, `src/app/api/attendance/route.ts`, `src/components/common/Sidebar.tsx`, `src/app/admin/attendance/page.tsx`.

---

## 1. MỤC TIÊU & BỐI CẢNH
Xây dựng phân hệ Quản trị Điểm danh Toàn trường dành cho cấp quản lý (Admin), cho phép:
1. Giám sát và thực hiện điểm danh cho tất cả các lớp, mọi ca học trong ngày của toàn hệ thống (không bị giới hạn bởi giáo viên phụ trách).
2. Hỗ trợ đầy đủ 5 trạng thái điểm danh: **Có mặt**, **Đi muộn**, **Vắng có phép**, **Vắng không phép**, và **Điểm danh bù**.
3. Lưu vết chi tiết thời gian check-in (`checkinTime`), phương thức (`method`: BOT/MANUAL), lý do và ca học gốc bị vắng khi học sinh học bù (`originalSlotId`, `makeupReason`).
4. Thao tác tiện ích nhanh: Đánh dấu tất cả có mặt, cập nhật hàng loạt (batch save), mở modal ghi nhận điểm danh bù linh hoạt.

---

## 2. KIẾN TRÚC & PHÂN TÍCH TÁC ĐỘNG HỆ THỐNG

### 2.1. Cập nhật Model & Interface (`src/types/attendance.ts`)
#### Hiện tại:
```typescript
export type AttendanceStatus = 'Có mặt' | 'Vắng có phép' | 'Vắng không phép' | 'Đi muộn';
export interface AttendanceRecord {
  id: string;
  scheduleSlotId: string;
  classId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  checkinTime?: string;
  note?: string;
  updatedBy: string;
  updatedAt: string;
}
```

#### Yêu cầu mở rộng:
1. `AttendanceStatus` thêm giá trị `'Điểm danh bù'`:
   ```typescript
   export type AttendanceStatus = 'Có mặt' | 'Vắng có phép' | 'Vắng không phép' | 'Đi muộn' | 'Điểm danh bù';
   ```
2. `AttendanceRecord` bổ sung các trường:
   - `checkinTime?: string;` (Định dạng `YYYY-MM-DD HH:mm:ss` hoặc ISO string `YYYY-MM-DDTHH:mm:ss`).
   - `originalSlotId?: string;` (Khóa liên kết ca học gốc mà học sinh bị vắng hoặc cần bù).
   - `makeupReason?: string;` (Lý do điểm danh bù / học bù).
   - `method?: 'BOT' | 'MANUAL';` (Phân biệt điểm danh tự động qua bot quét QR/nhận diện hay quản trị viên/giáo viên nhập tay, mặc định `'MANUAL'`).

---

### 2.2. Tầng Repository & Data Mapping
1. **`src/repositories/IRepository.ts`**:
   - Duy trì các hàm hiện tại:
     - `getAttendanceBySlotId(slotId: string): Promise<AttendanceRecord[]>`
     - `getAttendanceByStudentId(studentId: string): Promise<AttendanceRecord[]>`
     - `getAttendanceByClassId(classId: string): Promise<AttendanceRecord[]>`
     - `saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord>`
     - `saveAttendanceBatch(records: AttendanceRecord[]): Promise<AttendanceRecord[]>`
   - Bổ sung hàm hỗ trợ lọc linh hoạt nếu cần hoặc mở rộng query:
     - `getAttendance(params: { slotId?: string; studentId?: string; classId?: string; date?: string }): Promise<AttendanceRecord[]>` (khuyến nghị hỗ trợ lọc theo ngày và lớp).
2. **`src/repositories/LocalRepository.ts`**:
   - Đảm bảo `LocalRepository` lưu giữ đầy đủ các trường mới (`originalSlotId`, `makeupReason`, `method`, `checkinTime`) khi thực hiện `saveAttendanceRecord` và `saveAttendanceBatch`.
   - Cung cấp hàm lọc kết hợp `date`, `classId`, `slotId` nếu query yêu cầu.
3. **`src/repositories/SupabaseRepository.ts`**:
   - Cập nhật hàm `mapAttendanceRecordFromDb` và `mapAttendanceRecordToDb`:
     ```typescript
     function mapAttendanceRecordFromDb(row: any): AttendanceRecord {
       return {
         id: row.id,
         scheduleSlotId: row.schedule_slot_id,
         classId: row.class_id,
         studentId: row.student_id,
         date: typeof row.date === 'string' ? row.date.split('T')[0] : row.date,
         status: row.status,
         checkinTime: row.checkin_time || undefined,
         note: row.note || undefined,
         originalSlotId: row.original_slot_id || undefined,
         makeupReason: row.makeup_reason || undefined,
         method: row.method || 'MANUAL',
         updatedBy: row.updated_by,
         updatedAt: row.updated_at || new Date().toISOString(),
       };
     }

     function mapAttendanceRecordToDb(rec: AttendanceRecord): any {
       return {
         id: rec.id,
         schedule_slot_id: rec.scheduleSlotId,
         class_id: rec.classId,
         student_id: rec.studentId,
         date: rec.date,
         status: rec.status,
         checkin_time: rec.checkinTime || null,
         note: rec.note || null,
         original_slot_id: rec.originalSlotId || null,
         makeup_reason: rec.makeupReason || null,
         method: rec.method || 'MANUAL',
         updated_by: rec.updatedBy,
         updated_at: rec.updatedAt || new Date().toISOString(),
       };
     }
     ```

---

### 2.3. Backend API (`src/app/api/attendance/route.ts`)
#### 1. Phương thức `GET`:
- Tiếp nhận các Search Params:
  - `slotId`: lấy danh sách điểm danh theo ca học cụ thể.
  - `classId`: lấy danh sách điểm danh theo lớp.
  - `date`: định dạng `YYYY-MM-DD`.
  - `studentId`: lấy lịch sử điểm danh của một học viên.
- Logic xử lý:
  - Cho phép kết hợp `date` và `classId` hoặc `slotId`.
  - Ví dụ: Khi lọc theo `slotId`, trả về các record của slot đó. Nếu có thêm `date` hoặc `classId`, thực hiện filter tương ứng.
  - Kết quả trả về: `{ records: AttendanceRecord[] }`.

#### 2. Phương thức `POST`:
- Tiếp nhận Payload:
  - Batch:
    ```json
    {
      "records": [ ...AttendanceRecord[] ],
      "slotId": "SCH0001",
      "updatedBy": "ADMIN001",
      "updaterName": "Quản trị viên"
    }
    ```
  - Single:
    ```json
    {
      "record": { ...AttendanceRecord },
      "updatedBy": "ADMIN001",
      "updaterName": "Quản trị viên"
    }
    ```
- Xử lý:
  - Validate các trường bắt buộc (`studentId`, `scheduleSlotId`, `classId`, `date`, `status`).
  - Đối với trạng thái `'Điểm danh bù'`, nếu có `originalSlotId` và `makeupReason`, phải được lưu trữ nguyên vẹn.
  - Tự động ghi Audit Log với `userRole: 'ADMIN'` (hoặc role của updater), `action: 'ATTENDANCE_CHECK'`, ghi chú rõ số lượng bản ghi và thông tin slot.

---

### 2.4. Sidebar Admin (`src/components/common/Sidebar.tsx`)
- Thêm mục menu vào danh sách `adminNav`:
  ```typescript
  { 
    label: 'Sổ Điểm danh Toàn trường', 
    href: '/admin/attendance', 
    icon: UserCheck 
  }
  ```
- Vị trí khuyến nghị: Đặt ngay dưới mục "Lịch học trung tâm" hoặc "Duyệt đơn & Đổi ca" để người quản trị dễ dàng thao tác theo luồng công việc hàng ngày.
- Đảm bảo `UserCheck` (đã có sẵn trong import từ `lucide-react`) hiển thị trực quan và đồng bộ phong cách.

---

### 2.5. Giao diện Trang Quản trị Điểm danh (`src/app/admin/attendance/page.tsx`)
Trang được thiết kế chuyên nghiệp, đồng bộ hệ thống giao diện Tailwind CSS hiện tại.

#### 1. Phân quyền & Layout:
- Bọc toàn bộ trang bằng `<RoleGuard allowedRoles={['ADMIN']}>`.
- Bọc nội dung bằng `<Suspense>` để hỗ trợ URL query params an toàn trên Next.js App Router.
- Header chuẩn: `title="Sổ Điểm Danh Toàn Trường"`, `subtitle="Quản lý chuyên cần, giờ check-in và điểm danh bù cho tất cả các lớp học"`.

#### 2. Khối Bộ lọc Điều hành (Control Filter Bar):
- **Ngày học (`date`)**: Input `type="date"`, mặc định là ngày hôm nay (`new Date().toISOString().split('T')[0]`).
- **Lớp học (`classId`)**: Dropdown danh sách tất cả lớp học (lấy từ `/api/classes`), có tùy chọn "Tất cả các lớp" hoặc chọn một lớp cụ thể.
- **Ca học (`slotId`)**: Dropdown danh sách các ca học (lấy từ `/api/schedule?date=...&classId=...`).
  - Hiển thị đầy đủ thông tin: `[Ca {shiftId}] {startTime} - {endTime} | Môn: {subject} | Phòng: {roomId} | GV: {teacherName}`.
  - Khi người dùng đổi Ngày học hoặc Lớp học, danh sách Ca học tự động cập nhật và chọn ca đầu tiên khả dụng.

#### 3. Thanh Thống kê Nhanh (Summary Metrics Bar):
Hiển thị 5 thẻ thống kê trực quan số lượng học viên theo từng trạng thái trong ca học hiện tại:
- **Có mặt** (Màu Emerald - Xanh lá)
- **Đi muộn** (Màu Amber - Vàng cam)
- **Vắng có phép** (Màu Blue - Xanh dương)
- **Vắng không phép** (Màu Rose - Đỏ)
- **Điểm danh bù** (Màu Purple - Tím)

#### 4. Bảng Dữ liệu Điểm danh (Attendance Table):
Các cột hiển thị:
1. **STT**: Đánh số thứ tự tăng dần.
2. **Mã HV & Họ và tên**: Hiển thị avatar ký tự đầu, mã học viên badge, họ và tên học viên.
3. **Trạng thái Điểm danh (5 nút bấm nhanh)**:
   - Button Group gồm 5 nút: `Có mặt`, `Đi muộn`, `Vắng có phép`, `Vắng không phép`, `Điểm danh bù`.
   - Nút được kích hoạt sẽ có background màu tương ứng nổi bật.
   - Khi bấm `Có mặt`: Nếu chưa có `checkinTime`, tự động điền giờ hiện tại (hoặc giờ bắt đầu ca: `HH:mm:ss`).
   - Khi bấm `Đi muộn`: Tự động điền giờ hiện tại (hoặc giờ trễ hơn ca học).
   - Khi bấm `Điểm danh bù`: Cho phép mở modal hoặc chọn thông tin ca gốc liên kết.
4. **Giờ vào lớp (`checkinTime`)**:
   - Cho phép nhập/chỉnh sửa trực tiếp (input text hoặc time picker ngắn gọn định dạng `HH:mm` hoặc `HH:mm:ss`).
   - Có nút icon làm mới/lấy giờ hiện tại (Now).
5. **Thông tin Điểm danh bù**:
   - Hiển thị nhãn ca gốc (`originalSlotId`) và lý do học bù nếu trạng thái là `Điểm danh bù`.
6. **Ghi chú (`note`)**:
   - Input text cho phép Admin nhập ghi chú riêng cho từng học viên.

#### 5. Thanh Công cụ Tiện ích (Actions Bar):
- Nút **"Đánh dấu tất cả Có mặt"**: Gán trạng thái `'Có mặt'` và tự động cập nhật `checkinTime` cho toàn bộ học sinh chưa điểm danh trong danh sách.
- Nút **"Điểm danh bù học viên ngoài ca"**: Mở Modal để tìm và thêm 1 học viên thuộc lớp khác/ca khác vào ca này để học bù.
- Nút **"Lưu sổ điểm danh"**:
  - Gửi request POST batch lên `/api/attendance`.
  - Hiển thị trạng thái loading, icon spinner và thông báo Toast/Alert thành công ("Đã lưu sổ điểm danh thành công!").

#### 6. Modal Điểm danh bù (Makeup Attendance Modal):
- **Trường hợp sử dụng:**
  - Điểm danh bù cho một học sinh trong danh sách ca hiện tại (ghi nhận bù cho một buổi vắng trước đó).
  - Thêm một học viên vắng từ ca khác sang ca hiện tại để học bù.
- **Các trường thông tin trong Modal:**
  1. *Chọn học viên:* Dropdown tìm kiếm học viên (Mã HV - Tên).
  2. *Chọn ca học gốc bị vắng (`originalSlotId`):* Lấy danh sách các ca học trong quá khứ của học viên có trạng thái `Vắng có phép` hoặc `Vắng không phép`.
  3. *Lý do học bù (`makeupReason`):* Textarea ghi rõ lý do (ví dụ: "Bị ốm ca ngày 15/09", "Trùng lịch thi học kỳ").
  4. *Thời gian check-in:* Mặc định thời gian hiện tại.
  5. *Nút xác nhận:* Lưu bản ghi điểm danh bù vào danh sách ca hiện tại.

---

## 3. CHECKLIST TRIỂN KHAI CHO WORKER

| STT | File cần sửa / tạo mới | Nội dung chi tiết |
|---|---|---|
| 1 | `src/types/attendance.ts` | Thêm `'Điểm danh bù'` vào `AttendanceStatus`. Mở rộng `AttendanceRecord` với `checkinTime`, `originalSlotId`, `makeupReason`, `method`. |
| 2 | `src/repositories/SupabaseRepository.ts` | Cập nhật mapper `mapAttendanceRecordFromDb` và `mapAttendanceRecordToDb` bao gồm các trường mới. |
| 3 | `src/repositories/LocalRepository.ts` | Đảm bảo seed dữ liệu và các hàm get/save lưu trữ nguyên vẹn các trường mới. |
| 4 | `src/app/api/attendance/route.ts` | Nâng cấp API GET hỗ trợ lọc kết hợp `date`, `classId`, `slotId`. Nâng cấp POST lưu trữ `originalSlotId`, `makeupReason`, `method`, `checkinTime` và ghi Audit Log chi tiết. |
| 5 | `src/components/common/Sidebar.tsx` | Thêm menu `{ label: 'Sổ Điểm danh Toàn trường', href: '/admin/attendance', icon: UserCheck }` vào `adminNav`. |
| 6 | `src/app/admin/attendance/page.tsx` | Tạo mới toàn bộ trang Quản trị Điểm danh Toàn trường, tích hợp bộ lọc ngày/lớp/ca, bảng 5 trạng thái, nút tất cả có mặt, lưu batch, và Modal Điểm danh bù. |

---

## 4. CHECKLIST KIỂM THỬ DÀNH CHO TESTER

1. **Kiểm thử TypeScript & Lint:**
   - Chạy `npm run type-check` hoặc `npx tsc --noEmit` đảm bảo không có lỗi type nào trong toàn bộ dự án.
2. **Kiểm thử Menu Sidebar:**
   - Đăng nhập quyền Admin (`ADMIN001`), kiểm tra mục "Sổ Điểm danh Toàn trường" hiển thị chuẩn xác và active route khi truy cập `/admin/attendance`.
3. **Kiểm thử Bộ lọc & Dữ liệu:**
   - Thay đổi Ngày học -> Ca học hiển thị tương ứng.
   - Thay đổi Lớp học -> Lọc đúng ca học và danh sách học viên của lớp đó.
4. **Kiểm thử Thao tác Điểm danh:**
   - Bấm từng nút trạng thái trong 5 nút: `Có mặt`, `Đi muộn`, `Vắng có phép`, `Vắng không phép`, `Điểm danh bù`.
   - Bấm "Đánh dấu tất cả Có mặt" -> Kiểm tra toàn bộ học viên đổi sang Có mặt kèm giờ checkin.
   - Chỉnh sửa `checkinTime` và `ghi chú`.
   - Bấm "Lưu sổ điểm danh" -> Kiểm tra API POST trả về HTTP 200 `{ success: true }`.
5. **Kiểm thử Modal Điểm danh bù:**
   - Mở modal -> Chọn học sinh -> Chọn ca học vắng trước đó -> Nhập lý do -> Xác nhận.
   - Bản ghi được cập nhật với trạng thái `Điểm danh bù`, có `originalSlotId` và `makeupReason`.
6. **Kiểm thử Phân quyền:**
   - Đăng nhập với tài khoản Giáo viên hoặc Học viên -> Truy cập `/admin/attendance` -> Bị chặn hoặc chuyển hướng hợp lệ bởi `<RoleGuard>`.

---
*Tài liệu này là căn cứ bàn giao trực tiếp cho WORKER triển khai và TESTER nghiệm thu chất lượng.*
