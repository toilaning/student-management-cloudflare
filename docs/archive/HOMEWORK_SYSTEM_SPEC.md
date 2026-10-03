# ĐẶC TẢ KỸ THUẬT: HỆ THỐNG GIAO BÀI TẬP VÀ QUẢN LÝ DEADLINE (GIAI ĐOẠN 2)

**Dự án:** Student Management System  
**Role:** MANAGER (`ag/gemini-3.8-flash-medium`)  
**Mục tiêu:** Thiết lập tài liệu đặc tả chuẩn kỹ thuật cho WORKER triển khai và TESTER nghiệm thu hệ thống bài tập vẽ mỹ thuật, quản lý deadline và nộp bài trên Dashboard (Admin, Teacher, Student).

---

## 1. MÔ HÌNH DỮ LIỆU (DATA TYPES)
Tạo file: `src/types/homework.ts` và export trong `src/types/index.ts`.

### 1.1 `HomeworkTask` (Đề bài tập do Giáo viên / Admin giao)
```typescript
export interface HomeworkTask {
  id: string;              // Format: HW0001, HW0002,...
  classId: string;         // Mã lớp học áp dụng (ví dụ: CLS0001, CLS0002)
  title: string;           // Tiêu đề bài tập (ví dụ: "Bài 01: Phác thảo dáng người cơ bản")
  description: string;     // Yêu cầu chi tiết: chất liệu (chì, màu nước, digital), góc vẽ, lưu ý chuyên môn
  deadline: string;        // ISO-8601 string hoặc YYYY-MM-DDTHH:mm
  createdBy: string;       // Tên hoặc User ID của Admin/Giáo viên giao bài
  createdAt: string;       // ISO-8601 string thời gian tạo
}
```

### 1.2 `HomeworkSubmission` (Bản nộp bài của học sinh)
```typescript
export type HomeworkSubmissionStatus = 'CHUA_NOP' | 'DA_NOP' | 'QUA_HAN';

export interface HomeworkSubmission {
  id: string;                  // Format: SUB0001, SUB0002,...
  taskId: string;              // Tham chiếu HomeworkTask.id
  studentId: string;           // Tham chiếu Student.id (hoặc user ID học viên)
  submittedAt: string;         // ISO-8601 string (thời điểm nộp bài hoặc cập nhật trạng thái)
  status: HomeworkSubmissionStatus; // Trạng thái nộp bài
  discordMessageUrl?: string;  // Link message/ảnh bài vẽ nộp trên Discord (kênh #nop-bai-tap)
  note?: string;               // Ghi chú hoặc nhận xét của giáo viên / học sinh
}
```

---

## 2. KIẾN TRÚC TẦNG DỮ LIỆU (REPOSITORY INTERFACE & IMPLEMENTATIONS)

### 2.1 Mở rộng `src/repositories/IRepository.ts`
Bổ sung các phương thức quản lý bài tập và nộp bài vào `IRepository`:
```typescript
import { HomeworkTask, HomeworkSubmission } from '@/types/homework';

export interface IRepository {
  // ... các phương thức hiện có ...

  // Homework Tasks
  getAllHomeworkTasks(): Promise<HomeworkTask[]>;
  getHomeworkTasksByClassId(classId: string): Promise<HomeworkTask[]>;
  createHomeworkTask(task: HomeworkTask): Promise<HomeworkTask>;

  // Homework Submissions
  getHomeworkSubmissionsByTaskId(taskId: string): Promise<HomeworkSubmission[]>;
  getHomeworkSubmissionsByStudentId(studentId: string): Promise<HomeworkSubmission[]>;
  upsertHomeworkSubmission(submission: HomeworkSubmission): Promise<HomeworkSubmission>;
}
```

### 2.2 Cài đặt trên `src/repositories/LocalRepository.ts`
- Quản lý 2 mảng in-memory:
  + `private homeworkTasks: HomeworkTask[] = [];`
  + `private homeworkSubmissions: HomeworkSubmission[] = [];`
- Khởi tạo Mock Seeds (3-5 bài tập mẫu đa dạng trạng thái để kiểm thử trực quan):
  1. `HW0001`: Lớp `CLS0001` - "Bài 01: Phác thảo dáng người cơ bản", deadline còn 3 ngày nữa.
  2. `HW0002`: Lớp `CLS0001` - "Bài 02: Đánh bóng khối cầu & khối lập phương", deadline vừa hết hôm qua (để test trạng thái QUA_HAN).
  3. `HW0003`: Lớp `CLS0002` - "Bài 01: Phối màu sắc độ cảnh hoàng hôn", deadline còn 5 ngày nữa.
  4. Tạo sẵn 4-6 submissions tương ứng cho các học sinh mẫu (VD: `STU0001` đã nộp có link Discord, `STU0002` chưa nộp, học sinh nộp quá hạn).
- Xử lý `upsertHomeworkSubmission`: Kiểm tra nếu tồn tại cặp `(taskId, studentId)` hoặc `id` thì update, ngược lại gán ID mới (`SUBxxxx`) và thêm vào mảng.

### 2.3 Cài đặt trên `src/repositories/SupabaseRepository.ts`
- Cài đặt mapping vào 2 bảng Supabase / PostgreSQL (tạo migration / cấu trúc tương ứng):
  + Bảng `homework_tasks`: `id`, `class_id`, `title`, `description`, `deadline`, `created_by`, `created_at`
  + Bảng `homework_submissions`: `id`, `task_id`, `student_id`, `submitted_at`, `status`, `discord_message_url`, `note`
- Nếu bảng Supabase chưa có trong database môi trường hiện tại, triển khai fallback an toàn (graceful fallback) hoặc query theo schema chuẩn Supabase Client.

---

## 3. BACKEND REST API DESIGN

### 3.1 `src/app/api/homework/tasks/route.ts`
- **`GET /api/homework/tasks?classId={classId}`**:
  + Query params: `classId` (tùy chọn).
  + Logic: Nếu có `classId` gọi `getHomeworkTasksByClassId`, nếu không gọi `getAllHomeworkTasks`.
  + Response: `{ success: true, data: HomeworkTask[] }` (HTTP 200).
- **`POST /api/homework/tasks`**:
  + Request body: Omit `id` & `createdAt` (Server tự sinh ID dạng `HW${Date.now()}` hoặc format `HW000x` và gán `createdAt: new Date().toISOString()`).
  + Validation: `classId`, `title`, `deadline` là bắt buộc.
  + Response: `{ success: true, data: HomeworkTask }` (HTTP 201).

### 3.2 `src/app/api/homework/submissions/route.ts`
- **`GET /api/homework/submissions?taskId={taskId}&studentId={studentId}`**:
  + Query params: `taskId` hoặc `studentId`.
  + Logic: Lọc theo `taskId` hoặc `studentId` thông qua repository methods.
  + Response: `{ success: true, data: HomeworkSubmission[] }` (HTTP 200).
- **`POST /api/homework/submissions`**:
  + Request body: `HomeworkSubmission` (hoặc payload nộp bài gồm `taskId`, `studentId`, `status`, `discordMessageUrl`, `note`).
  + Logic: Upsert submission qua `upsertHomeworkSubmission`. Sẵn sàng tích hợp webhook Discord Bot (nộp bài qua Discord sẽ push vào endpoint này).
  + Response: `{ success: true, data: HomeworkSubmission }` (HTTP 200).

---

## 4. THIẾT KẾ GIAO DIỆN WEB DASHBOARD (UI/UX)

### 4.1 Phía Admin & Giáo viên (`/admin/dashboard` & `/teacher/dashboard`)
Tạo component: `src/components/homework/TeacherHomeworkWidget.tsx`
- **Chức năng chính**:
  1. **Nút `+ Giao Bài Tập Mới`**:
     - Mở Modal giao bài với form:
       + Dropdown chọn Lớp học (danh sách lớp học lấy từ repository).
       + Ô nhập Tiêu đề bài tập vẽ.
       + Ô Textarea nhập Hướng dẫn yêu cầu bài tập (vật liệu, khổ giấy, kỹ thuật).
       + DateTime Picker chọn Hạn nộp (Deadline).
     - Submit form gọi API `POST /api/homework/tasks`, cập nhật danh sách lập tức.
  2. **Danh sách bài tập đã giao**:
     - Hiển thị theo dạng Card hoặc Bảng tổng hợp: Tiêu đề bài, Lớp, Hạn nộp.
     - **Thống kê tỷ lệ nộp bài**: Tính toán trực quan số lượng học viên đã nộp trên tổng sĩ số lớp (ví dụ: `18/20 học viên đã nộp` kèm thanh Progress Bar trực quan).
     - Xem chi tiết danh sách nộp bài theo từng task (trạng thái từng học viên, link bài vẽ Discord).

### 4.2 Phía Học sinh (`/student/dashboard`)
Tạo component: `src/components/homework/StudentHomeworkWidget.tsx`
- **Chức năng chính**:
  1. **Widget "Danh Sách Bài Tập Cần Hoàn Thành"**:
     - Hiển thị các bài tập thuộc lớp mà học sinh đang theo học.
     - Nội dung thẻ bài tập:
       + Tên bài tập vẽ, tên lớp.
       + Đề bài tóm tắt / ghi chú của giáo viên.
     - **Đồng hồ đếm ngược & Badge hạn nộp**:
       + Tính toán thời gian còn lại: `Hạn: 23:59 25/09 - Còn 2 ngày` (hoặc `Đã quá hạn 1 ngày`).
     - **Huy hiệu trạng thái (Status Badge)**:
       + `Chưa nộp ⏳` (Màu cam / Amber badge).
       + `Đã nộp ✅` (Màu xanh lá / Emerald badge - hiển thị nút xem bài nộp hoặc link Discord).
       + `Quá hạn ⚠️` (Màu đỏ / Rose badge nếu chưa nộp mà thời gian hiện tại > deadline).
  2. **Banner/Thông báo hướng dẫn nộp bài Discord**:
     - Hiển thị khung Callout hướng dẫn nổi bật:
       > 🎨 **Hướng dẫn nộp bài:** Gửi ảnh bài vẽ vào kênh `#nop-bai-tap` trên máy chủ Discord lớp học để được chấm và điểm danh bài tập.

---

## 5. KẾ HOẠCH BÀN GIAO & PHÂN CÔNG (PIPELINE ROADMAP)

| Bước | Vai trò | Trách nhiệm |
|---|---|---|
| **1** | **MANAGER** (Đã hoàn thành) | Khảo sát cấu trúc hiện tại, thiết lập tài liệu đặc tả `HOMEWORK_SYSTEM_SPEC.md`. |
| **2** | **WORKER** (`ag/gemini-3.8-flash-high`) | - Khởi tạo `src/types/homework.ts`.<br>- Bổ sung methods vào `IRepository.ts`, `LocalRepository.ts` (kèm seeds), `SupabaseRepository.ts`.<br>- Xây dựng 2 API routes `/api/homework/tasks` và `/api/homework/submissions`.<br>- Xây dựng các UI Components và tích hợp vào dashboard tương ứng. |
| **3** | **TESTER** (`ag/gemini-3.8-flash-low`) | - Viết và chạy unit tests/integration tests kiểm tra CRUD bài tập, tính toán hạn nộp, tỷ lệ nộp bài.<br>- Kiểm tra typecheck (`tsc --noEmit`) và Next.js build. |

