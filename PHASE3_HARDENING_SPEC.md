# PHASE 3: PRODUCTION HARDENING, CLEANUP & DEPLOYMENT SPECIFICATION

- **Dự án**: `student-management` (Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL)
- **Vị trí**: `/Users/toilaning/projects/student-management`
- **Người lập kế hoạch**: MANAGER (`ag/gemini-3.8-flash-medium`)
- **Đối tượng thực thi**: WORKER (`ag/gemini-3.8-flash-high`) & TESTER (`ag/gemini-3.8-flash-low`)
- **Trạng thái**: READY FOR WORKER EXECUTION

---

## 1. TỔNG QUAN HIỆN TRẠNG DỰ ÁN (AUDIT SUMMARY)

### 1.1. Git & Environment Baseline
- **Git Repo**: Chưa có `.gitignore` chuẩn. Toàn bộ `node_modules`, `.next`, `.DS_Store`, `.env.local` trước đó chưa được bảo vệ bằng `.gitignore`. Đã tạo initial commit snapshot để lưu vết.
- **Biến môi trường**:
  - `DATA_SOURCE=supabase` (đang kích hoạt Supabase Cloud `https://mvcwdqzmvgjdwqnnxaxb.supabase.co`).
  - `.env.local` đang chứa `SUPABASE_SERVICE_ROLE_KEY` chuẩn của backend.
  - `.env.example` tồn tại nhưng chưa đồng bộ đầy đủ các khóa cần thiết và hướng dẫn bảo mật.
  - Thiếu `.gitignore` dẫn tới nguy cơ commit nhầm secret lên remote repo.
- **Test Suite**: 28/28 unit/integration tests (`npm test`) đang PASS hoàn toàn (Auth, API, Classes, Students, Tuition, Payroll).

### 1.2. Phát hiện Kiểm toán Mã nguồn (Code Audit Findings)
1. **QuickRoleSwitcher (Dev Bypass Component)**:
   - File: `src/components/common/QuickRoleSwitcher.tsx`
   - Đang được nhúng trực tiếp trong `src/components/common/Header.tsx` (dòng 52).
   - Cho phép người dùng chuyển đổi quyền hạn Admin, Teacher, Student tức thì mà không cần xác thực mật khẩu.
   - **Đánh giá**: Rủi ro bảo mật nghiêm trọng nếu xuất hiện ở môi trường Production (`process.env.NODE_ENV === 'production'`). Cần đưa vào diện **DEV_ONLY**, ẩn hoàn toàn ở production hoặc chỉ hiển thị khi có cờ `process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_SWITCHER === 'true'` trong dev.
2. **Console Statements (Logs)**:
   - Tìm thấy khoảng 40 vị trí gọi `console.*` trong `src/`. Đa số là `console.error` trong catch blocks (hợp lệ để debug client/server) nhưng cần chuẩn hóa, loại bỏ các `console.log` rác/thừa thãi hoặc thay thế bằng logger có kiểm soát môi trường.
3. **Mock Data & Hardcoded Text**:
   - `src/app/student/tuition/page.tsx`: Chứa chức năng `handleConfirmMockPayment`, nhãn "VietQR Mock".
   - `src/components/common/QuickRoleSwitcher.tsx`: Chứa dòng "Hệ thống Quản lý Đào tạo • Chế độ Mock Singleton Local".
   - Cần dọn dẹp và chuẩn hóa nhãn hiển thị thành production-ready.
4. **Bảo mật Supabase & Secrets Isolation**:
   - `SUPABASE_SERVICE_ROLE_KEY` chỉ được gọi tại `src/lib/supabase.ts` (server context) và thông báo lỗi trong `src/repositories/SupabaseRepository.ts`. Không có biến nào bị phơi nhiễm sang client code (`NEXT_PUBLIC_...` không bị gắn nhầm service key).
   - Tuy nhiên, trong `src/lib/supabase.ts`, cần kiểm tra kỹ việc fallback `NEXT_PUBLIC_SUPABASE_ANON_KEY` và đảm bảo client-side components không import trực tiếp `supabaseAdmin`.

---

## 2. PHÂN LOẠI DANH MỤC MÃ NGUỒN (CATEGORIZATION)

| Thành phần / File | Phân loại | Hành động cụ thể |
| :--- | :--- | :--- |
| `.gitignore` | **PRODUCTION_REQUIRED** | Tạo file `.gitignore` chuẩn cho Next.js, chặn triệt để `.env*`, `.next`, `node_modules`, `.DS_Store`, build cache. |
| `.env.example` | **PRODUCTION_REQUIRED** | Chuẩn hóa toàn diện, xóa bỏ mọi key thật, hướng dẫn chi tiết setup cho Production. |
| `QuickRoleSwitcher.tsx` | **DEV_ONLY** | Bọc điều kiện hiển thị: chỉ render khi `process.env.NODE_ENV === 'development'` hoặc có env flag dev. Tự động ẩn trên Production. |
| `VietQR Mock` & `handleConfirmMockPayment` | **DEV_ONLY / POLISH** | Chuyển đổi trạng thái thanh toán theo luồng sandbox rõ ràng, gắn nhãn giao dịch thử nghiệm/cổng thanh toán mô phỏng an toàn. |
| `console.log` / debug logs | **SAFE_TO_REMOVE** | Rà soát và xóa bỏ các `console.log` kiểm thử, chỉ giữ lại `console.error` cho exception logging có cấu trúc. |
| `SupabaseRepository.ts` & `src/lib/supabase.ts` | **PRODUCTION_REQUIRED** | Giữ vững kết nối 100% Supabase Cloud, kiểm tra các query, đảm bảo isolation logic theo user role. |
| `gas-backend/` & `scripts/` | **TEST_ONLY / LEGACY** | Đã chuyển giao sang Supabase, giữ lại làm tài liệu tham khảo migration nhưng đảm bảo không nạp vào Next.js build runtime. |

---

## 3. KẾ HOẠCH HÀNH ĐỘNG CHI TIẾT CHO WORKER (ACTION PLAN)

### BƯỚC 1: Khởi tạo & Cấu hình `.gitignore` triệt để
- Tạo file `/Users/toilaning/projects/student-management/.gitignore` chứa:
  - `node_modules`, `.next`, `.env*.local`, `.env`, `.DS_Store`, `tsconfig.tsbuildinfo`, `build`, `coverage`.
- Chạy `git rm -r --cached .next node_modules .env.local .DS_Store` để loại bỏ các file nhạy cảm và build artifact khỏi Git index.

### BƯỚC 2: Chuẩn hóa `.env.example` & Bảo vệ Secrets
- Cập nhật `.env.example` với đầy đủ các trường cấu hình mẫu không chứa secret thật:
  - `DATA_SOURCE=supabase`
  - `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`
  - `NEXT_PUBLIC_APP_NAME="Hệ thống Quản lý Học viên"`
  - `NEXT_PUBLIC_APP_ENV=production`
  - `NEXT_PUBLIC_ENABLE_DEV_ROLE_SWITCHER=false`

### BƯỚC 3: Cách ly `QuickRoleSwitcher` (Dev-Only Guard)
- Trong `src/components/common/Header.tsx` hoặc `src/components/common/QuickRoleSwitcher.tsx`:
  - Thêm kiểm tra điều kiện môi trường:
    ```tsx
    const isDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_DEV_ROLE_SWITCHER === 'true';
    if (!isDev) return null;
    ```
  - Đảm bảo khi build hoặc chạy trong môi trường production, QuickRoleSwitcher hoàn toàn biến mất, bảo vệ luồng đăng nhập thực tế của hệ thống.

### BƯỚC 4: Rà soát & Dọn dẹp Code (Cleanup & Polish)
- Kiểm tra các file trang student/tuition, admin/tuition: loại bỏ các chuỗi "Mock Singleton Local", chuẩn hóa giao diện thanh toán học phí.
- Dọn dẹp các câu lệnh `console.log` thừa trong code base, giữ `console.error` cho các trường hợp bắt lỗi nghiêm trọng.

### BƯỚC 5: Kiểm tra Build Sản phẩm (Production Verification)
- Chạy `npm run build` để đảm bảo Next.js compile thành công 100% không có lỗi type hoặc SSR hydration.
- Chạy `npm test` để kiểm tra 28 test cases không bị hồi quy.

---

## 4. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
1. `.gitignore` hoạt động chuẩn xác, `.env.local` và `.next` không bao giờ bị track bởi Git.
2. `QuickRoleSwitcher` biến mất hoàn toàn khi chạy ở `NODE_ENV === 'production'`.
3. Không lộ `SUPABASE_SERVICE_ROLE_KEY` ở bất kỳ bundle client-side nào.
4. `npm run build` biên dịch thành công không cảnh báo/lỗi.
5. Bộ test 28/28 cases tiếp tục PASS 100%.
