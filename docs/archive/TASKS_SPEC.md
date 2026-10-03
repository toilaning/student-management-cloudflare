# KẾ HOẠCH THỰC THI & ĐẶC TẢ CHI TIẾT (TASKS_SPEC.md)
**Dự án:** Student Management Local (Hệ thống Quản lý Học viên & Trung tâm Đào tạo)  
**Địa điểm workspace:** `/Users/toilaning/projects/student-management` (Host macOS)  
**Vai trò phụ trách thực thi:** WORKER (`code_worker` / `ag/gemini-3.8-flash-high`)  
**Kiến trúc:** Clean Architecture, In-Memory Repository (Singleton), 100% Tiếng Việt, Zero External DB Dependency.

---

## I. KIẾN TRÚC TỔNG THỂ & CẤU TRÚC THƯ MỤC

```text
/Users/toilaning/projects/student-management
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── src/
│   ├── types/                     # Định nghĩa TypeScript Domain Models
│   │   ├── auth.ts
│   │   ├── student.ts
│   │   ├── teacher.ts
│   │   ├── classroom.ts
│   │   ├── schedule.ts
│   │   ├── attendance.ts
│   │   ├── finance.ts
│   │   └── audit.ts
│   ├── repositories/              # Repository Layer (In-Memory Singleton)
│   │   ├── IRepository.ts         # Interface CRUD & query
│   │   ├── LocalRepository.ts     # Implement singleton + mock memory state
│   │   └── seeds/                 # Data generator (Synthetic 400 SV, 20 GV, 30 Lớp)
│   │       ├── seedData.ts
│   │       ├── students.seed.ts
│   │       ├── teachers.seed.ts
│   │       └── classes.seed.ts
│   ├── services/                  # Business Logic Layer
│   │   ├── AuthService.ts         # Password hash (SHA-256 / bcryptjs), RBAC verification
│   │   ├── ConflictEngine.ts      # Phát hiện trùng lịch giáo viên, phòng học, lớp
│   │   ├── TuitionPayrollService.ts# Tính toán học phí, công nợ, bảng lương giáo viên
│   │   └── AuditService.ts        # Ghi log mọi hành động nhạy cảm
│   ├── components/                # UI Components (Tailwind + Lucide)
│   │   ├── common/
│   │   │   ├── QuickRoleSwitcher.tsx # Thanh chuyển role nhanh (Admin, Teacher, Student)
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── DataTable.tsx
│   │   ├── admin/                 # Admin specific components
│   │   ├── teacher/               # Teacher specific components
│   │   └── student/               # Student specific components
│   └── app/                       # Next.js App Router (100% Tiếng Việt)
│       ├── layout.tsx
│       ├── page.tsx               # Redirect hoặc Dashboard Overview
│       ├── admin/                 # Admin Portal
│       │   ├── dashboard/page.tsx
│       │   ├── calendar/page.tsx
│       │   ├── classes/page.tsx
│       │   ├── teachers/page.tsx
│       │   ├── payroll/page.tsx
│       │   ├── students/page.tsx
│       │   ├── tuition/page.tsx
│       │   └── audit/page.tsx
│       ├── teacher/               # Teacher Portal
│       │   ├── dashboard/page.tsx
│       │   ├── schedule/page.tsx
│       │   ├── classes/page.tsx
│       │   ├── attendance/page.tsx
│       │   └── requests/page.tsx
│       ├── student/               # Student Portal
│       │   ├── dashboard/page.tsx
│       │   ├── schedule/page.tsx
│       │   ├── attendance/page.tsx
│       │   ├── requests/page.tsx
│       │   ├── tuition/page.tsx
│       │   └── payment/page.tsx
│       └── api/                   # API Routes (nếu cần cho client hydration / actions)
└── tests/                         # Test suites (Node Test Runner / ts-node)
    ├── rbac.test.ts
    ├── conflict.test.ts
    ├── tuition-payroll.test.ts
    └── isolation.test.ts
```

---

## II. DANH SÁCH NHIỆM VỤ CHI TIẾT DÀNH CHO WORKER

### Nhiệm vụ 1: Khởi tạo Project & Cấu hình môi trường (Setup)
- **Mục tiêu:** Tạo Next.js App Router với TypeScript, Tailwind CSS, Lucide React icons.
- **Chi tiết thực hiện:**
  1. Khởi tạo `package.json`, cài đặt các dependencies:
     - `next@^14`, `react@^18`, `react-dom@^18`
     - `typescript`, `@types/react`, `@types/node`
     - `tailwindcss`, `postcss`, `autoprefixer`
     - `lucide-react`
     - `crypto-js` (hoặc module node:crypto cho hashing)
  2. Tạo `tsconfig.json` với path alias `@/*` -> `./src/*`.
  3. Cấu hình `tailwind.config.ts` đảm bảo responsive, màu sắc hiện đại (Indigo/Slate/Emerald).
  4. Đảm bảo chạy thử `npm run build` hoặc script test không lỗi.

### Nhiệm vụ 2: Thiết kế Domain Types & Interfaces (Types Layer)
- **Mục tiêu:** Định nghĩa chặt chẽ TypeScript interfaces cho toàn bộ hệ thống.
- **Files cần tạo:**
  - `src/types/auth.ts`: `User`, `Role` (`'ADMIN' | 'TEACHER' | 'STUDENT'`), `SessionContext`, `Permission`.
  - `src/types/student.ts`: Mã ST001..ST400, họ tên, email, sđt, trạng thái (`Đang học`, `Bảo lưu`, `Đã tốt nghiệp`), lớp trực thuộc.
  - `src/types/teacher.ts`: Mã GV001..GV020, họ tên, chuyên môn, hourlyRate (hệ số lương/giờ), trạng thái (`Đang dạy`, `Nghỉ phép`).
  - `src/types/classroom.ts`: Mã phòng (P.101..P.305), sức chứa, thiết bị.
  - `src/types/schedule.ts`: Mã ca học, ngày học (tháng 09/2026), giờ bắt đầu/kết thúc, mã phòng, mã GV, mã lớp học.
  - `src/types/attendance.ts`: Điểm danh từng buổi: `Mặt`, `Vắng có phép`, `Vắng không phép`, `Đi muộn`, ghi chú.
  - `src/types/finance.ts`: Học phí theo khóa/tháng, trạng thái (`Đã nộp`, `Còn nợ`, `Quá hạn`), bảng lương GV (số tiết * rate).
  - `src/types/audit.ts`: Action, userId, targetId, timestamp, oldValues, newValues.

### Nhiệm vụ 3: Synthetic Dataset Generator & In-Memory Repository
- **Mục tiêu:** Tạo kho dữ liệu 100% in-memory singleton phục vụ test và vận hành local.
- **Yêu cầu dữ liệu:**
  - **400 Học viên:** ST001 -> ST400 kèm thông tin cá nhân giả lập sinh động bằng Tiếng Việt.
  - **20 Giáo viên:** GV001 -> GV020 kèm rate lương theo giờ (vd: 200,000đ - 500,000đ/giờ).
  - **30 Lớp học:** Phân bổ các môn (Toán, Lý, Hóa, Tiếng Anh, Lập trình, v.v.), sĩ số 10-20 bạn/lớp.
  - **Lịch học tháng 09/2026:** Trải đều các ngày trong tuần (T2-T7), các ca học chuẩn:
    - Ca 1: 08:00 - 10:00
    - Ca 2: 10:15 - 12:15
    - Ca 3: 13:30 - 15:30
    - Ca 4: 15:45 - 17:45
    - Ca 5: 18:30 - 20:30
  - Dữ liệu điểm danh mẫu, công nợ học phí, đơn xin nghỉ phép/đổi lịch, lịch sử audit log.
- **Repository Pattern:**
  - `IRepository.ts`: Các hàm CRUD bất đồng bộ hoặc đồng bộ cho Student, Teacher, Schedule, Attendance, Tuition, Audit.
  - `LocalRepository.ts`: Triển khai Singleton lưu toàn bộ records trong bộ nhớ RAM, tự động nạp Seed khi khởi động.

### Nhiệm vụ 4: Core Service Layer
- **Mục tiêu:** Xử lý toàn bộ logic nghiệp vụ tách biệt hoàn toàn khỏi UI.
- **Modules:**
  1. `AuthService.ts`:
     - Lưu trữ mật khẩu dạng Hash (SHA-256 / PBKDF2), kiểm tra mật khẩu.
     - Hàm `checkPermission(role, action, resource)`.
     - Data isolation: Sinh viên chỉ được truy vấn dữ liệu của chính mình (ID khớp context), Giáo viên chỉ được xem lớp mình dạy.
  2. `ConflictEngine.ts`:
     - `checkScheduleConflict(newSlot)`:
       - Kiểm tra Giáo viên có bị trùng lịch trong khung giờ không?
       - Kiểm tra Phòng học có bị trùng không?
       - Kiểm tra Lớp học có bị học 2 môn cùng một lúc không?
       - Trả về mã lỗi và thông điệp chi tiết bằng Tiếng Việt.
  3. `TuitionPayrollService.ts`:
     - Tính tổng công nợ học sinh, tạo phiếu thu, xác nhận thanh toán.
     - Tính lương giáo viên trong tháng 09/2026 dựa trên số ca dạy thực tế và điểm danh hoàn thành.
  4. `AuditService.ts`:
     - Ghi nhận mọi thay đổi: Đổi lịch, xin nghỉ, sửa điểm danh, thanh toán học phí.

### Nhiệm vụ 5: Giao diện Người Dùng (3 Portals + Quick Role Switcher)
- **Yêu cầu chung:** 100% Tiếng Việt, UI chuẩn Tailwind CSS, hỗ trợ Responsive (Desktop/Tablet/Mobile).
- **Thanh Quick Role Switcher:**
  - Nằm cố định ở thanh Header hoặc Floating Bar.
  - Cho phép 1 click chuyển đổi giữa:
    - **Admin:** Toàn quyền quản trị.
    - **Giáo viên:** Chọn nhanh 1 trong 20 GV (vd: GV001 - Thầy Nguyễn Văn A).
    - **Học viên:** Chọn nhanh 1 trong 400 SV (vd: ST001 - Bạn Trần Thị Mai).
  - Tự động đồng bộ context sang portal tương ứng.
- **1. Admin Portal (`/admin`):**
  - Dashboard: Thống kê tổng số học viên, giáo viên, số lớp, doanh thu học phí, quỹ lương tháng 09/2026.
  - Lịch học (Calendar View): Lưới ca học theo tuần/tháng, cảnh báo trực quan nếu có conflict.
  - Quản lý Lớp học & Phân công giáo viên.
  - Quản lý Giáo viên: Hồ sơ, cấu hình đơn giá theo giờ, bảng công dạy.
  - Bảng lương (Payroll): Danh sách thanh toán cho 20 GV, nút chốt lương/xuất phiếu.
  - Quản lý Học viên & Theo dõi công nợ học phí.
  - Audit Log: Xem lịch sử toàn hệ thống.
- **2. Teacher Portal (`/teacher`):**
  - Dashboard: Số lớp đang phụ trách, lịch dạy hôm nay/tuần này.
  - Lịch dạy cá nhân.
  - Điểm danh học viên theo từng buổi học (Mặt / Vắng / Muộn).
  - Quản lý & duyệt yêu cầu xin nghỉ / đổi ca từ học viên.
- **3. Student Portal (`/student`):**
  - Dashboard: Tiến độ học tập, tổng số buổi vắng, thông báo học phí.
  - Lịch học cá nhân trong tháng 09/2026.
  - Lịch sử điểm danh & chuyên cần.
  - Tạo đơn xin nghỉ học / Đề xuất đổi lịch học.
  - Tra cứu học phí & Mock cổng thanh toán (QR Code chuyển khoản giả lập).

### Nhiệm vụ 6: Test Suites (Node Test Runner)
- **Mục tiêu:** Viết kịch bản test tự động không cần phụ thuộc framework nặng, chạy qua `node --test` hoặc `ts-node`.
- **4 Bộ Test bắt buộc:**
  1. `rbac.test.ts`: Kiểm tra phân quyền Admin, Teacher, Student; ngăn chặn truy cập trái phép.
  2. `isolation.test.ts`: Đảm bảo học viên A không thể xem bảng điểm, học phí của học viên B; giáo viên không sửa lớp mình không phụ trách.
  3. `conflict.test.ts`: Test đầy đủ các trường hợp trùng phòng, trùng giáo viên, trùng lớp trong engine xếp lịch.
  4. `tuition-payroll.test.ts`: Kiểm tra tính chính xác của phép tính lương giáo viên và cộng dồn học phí.

---

## III. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
1. Mã nguồn sạch, tuân thủ Clean Architecture, phân tách rõ ràng Types, Repositories, Services, Components.
2. Nạp đầy đủ Synthetic dataset: 400 học viên, 20 giáo viên, 30 lớp học và lịch tháng 09/2026.
3. Chạy được hoàn toàn local trên macOS không yêu cầu cài đặt Docker, PostgreSQL hay MongoDB.
4. Mọi màn hình hiển thị 100% bằng Tiếng Việt, UI chỉn chu, Quick Role Switcher hoạt động tức thì.
5. Chạy lệnh test (`npm test` hoặc `node --test`) pass 100% cả 4 bộ test suites.

---
*Kế hoạch được lập bởi MANAGER (ag/gemini-3.8-flash-medium).*
