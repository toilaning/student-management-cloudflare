# TÀI LIỆU ĐẶC TẢ KỸ THUẬT: QUẢN LÝ ĐƠN TỪ HỌC VIÊN, DUYỆT ĐƠN ADMIN & GIẢI PHÁP MODAL SHADOW

- **Dự án**: Hệ thống Quản lý Đào tạo & Học viên Local (`student-management`)
- **Tác giả**: MANAGER (Model: `custom-9router-gateway-20128/ag/gemini-3.8-flash-medium`)
- **Ngày lập**: 2026-09-20
- **Đối tượng thực thi**: WORKER (`ag/gemini-3.8-flash-high`) -> TESTER (`ag/gemini-3.8-flash-low`)

---

## 1. NGUYÊN TẮC THI CÔNG & PHẠM VI
1. **Tuyệt đối KHÔNG gói file ZIP**: Toàn bộ quy trình chỉ làm việc trực tiếp trên mã nguồn và chạy build test (`npm run build`, `npm test` hoặc script tương ứng).
2. **Tuân thủ Clean Architecture**: Giữ vững cấu trúc Repository, Types, UI Component và Context hiện có của dự án.
3. **Mục tiêu đáp ứng**:
   - Nâng cấp Portal học sinh (`src/app/student/requests/page.tsx`): Chọn ca học cụ thể khi xin nghỉ; chọn ca cũ & ca mới cuộn ngang (horizontal slots) cùng môn khi đổi ca.
   - Bổ sung Portal Admin duyệt đơn (`src/app/admin/requests/page.tsx`): Menu sidebar, danh sách lọc/tìm kiếm, duyệt/từ chối đơn.
   - Nâng cấp API Requests (`src/app/api/requests/route.ts`): Hỗ trợ truy vấn toàn diện cho Admin (không cần teacherId/studentId), cập nhật trạng thái đơn và kiểm tra lịch.
   - Giải quyết triệt để lỗi Modal Backdrop/Shadow không phủ trọn màn hình.

---

## 2. NGUYÊN NHÂN & GIẢI PHÁP TRIỆT ĐỂ CHO LỖI MODAL SHADOW (100vw / 100vh)

### 2.1. Phân tích nguyên nhân gốc rễ (Root Cause Analysis)
Hiện tượng các thẻ Pop-up/Modal có lớp phủ `fixed inset-0 bg-black/50` nhưng không che phủ toàn màn hình hoặc bị co cụm trong khung nội dung bắt nguồn từ các yếu tố CSS/DOM sau:
1. **Containing Block Trapping do CSS Transforms/Filters**:
   - Khi một phần tử cha (hoặc container lồng ghép) có thuộc tính `transform` (ví dụ `translate-x-0` trên Sidebar hoặc các animation container `animate-in`, `transition-transform`), `filter`, `perspective` hoặc `contain: paint`, trình duyệt sẽ tạo ra một **Containing Block** mới.
   - Mọi phần tử con có `position: fixed` bên trong sẽ chỉ định vị tương đối với thẻ cha đó thay vì Viewport của màn hình.
2. **Bị giới hạn bởi Layout Flex / Stacking Context**:
   - Ở `RootLayout` (`src/app/layout.tsx`), cấu trúc là:
     ```tsx
     <div className="flex min-h-screen">
       <Sidebar />
       <div className="flex-1 flex flex-col min-w-0">
         {children} {/* Modal nằm sâu trong children */}
       </div>
     </div>
     ```
   - Sidebar có `z-50` (`fixed md:static top-0 bottom-0 left-0 z-50 ...`). Khi Modal nằm trong `{children}`, nếu container cha có stacking context hoặc z-index thấp hơn `Sidebar`, Modal sẽ bị Sidebar che đè hoặc backdrop chỉ phủ phần `flex-1`.
   - Ngoài ra, nếu có thanh scroll dọc/ngang, `inset-0` có thể bị hụt nếu viewport bị tính sai hoặc thanh cuộn chiếm không gian.

### 2.2. Giải pháp dứt điểm (Definitive Solution)
1. **Kỹ thuật React Portal (`createPortal`)**:
   - Đưa DOM của Modal ra trực tiếp dưới thẻ `document.body` bằng component `ModalPortal` hoặc hook `usePortal`.
   - Tránh 100% việc bị giam hãm trong các thẻ cha có `transform`, `overflow: hidden`, hay `relative`.
2. **Chuẩn hóa CSS cho Modal Wrapper**:
   - Khi render ra body:
     ```tsx
     <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
       <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl ..." onClick={e => e.stopPropagation()}>
         ...
       </div>
     </div>
     ```
   - Sử dụng `z-[9999]` (cao hơn mọi Header `z-30` và Sidebar `z-50`).
   - Khóa cuộn trang `document.body.style.overflow = 'hidden'` khi modal mở và hoàn trả khi đóng.
3. **Thực thi component dùng chung `Modal`**:
   - Tạo component chuẩn `src/components/common/Modal.tsx` tái sử dụng cho toàn bộ dự án (`student/requests`, `admin/calendar`, `student/tuition`, v.v.).

---

## 3. ĐẶC TẢ CHI TIẾT: PORTAL HỌC SINH (`src/app/student/requests/page.tsx`)

### 3.1. Dữ liệu đầu vào
- Gọi song song:
  - `GET /api/requests?studentId={currentStudentId}` (danh sách đơn đã gửi).
  - `GET /api/classes?studentId={currentStudentId}` (danh sách lớp học của học sinh).
  - `GET /api/schedule?studentId={currentStudentId}` (danh sách toàn bộ ca học của học sinh).
  - `GET /api/schedule` (toàn bộ ca học của trung tâm để phục vụ việc chọn ca đổi mới).

### 3.2. Luồng giao diện Modal Tạo đơn mới
Form gồm các trường:
1. **Loại yêu cầu (Tab switch)**: `XIN_NGHI` (Đơn xin nghỉ học) hoặc `DOI_LICH` (Đơn đề xuất đổi ca).
2. **Chọn môn / Lớp học**: Dropdown hiển thị các lớp học sinh đang tham gia.
3. **Khi chọn "Đơn xin nghỉ học" (`XIN_NGHI`)**:
   - Hiển thị danh sách/dropdown **"Chọn ca học xin nghỉ"**:
     - Lọc từ danh sách ca học của học sinh thuộc `classId` đã chọn (và có ngày >= ngày hiện tại hoặc các ca sắp tới).
     - Mỗi lựa chọn hiển thị rõ: `Ngày (DD/MM/YYYY) - [Ca X: 08:00 - 10:00] - Phòng: P... - GV: ...`.
     - Lưu `scheduleSlotId` vào form.
4. **Khi chọn "Đơn đổi ca" (`DOI_LICH`)**:
   - **Bước 3a - Chọn ca học hiện tại muốn đổi**:
     - Danh sách ca học hiện tại của học sinh thuộc môn/lớp đã chọn.
     - Khi chọn ca hiện tại, trích xuất thông tin môn học (`subject` hoặc `classId`) và ngày giờ của ca này.
   - **Bước 3b - Bảng chọn ca học mới (Horizontal Scrollable Timeline/Slots)**:
     - Hiển thị dải ô ca học cuộn theo chiều ngang (`overflow-x-auto flex gap-3 pb-2`).
     - **Điều kiện tiên quyết**: Ca học mới **BẮT BUỘC phải cùng môn học** (`slot.subject === currentSlot.subject` hoặc thuộc các lớp có cùng `subject`).
     - Bỏ qua chính ca đang học hiện tại.
     - Mỗi card ca học gồm:
       - Ngày học (Thứ, DD/MM/YYYY)
       - Ca học & Giờ (`Ca 1 (08:00 - 10:00)`)
       - Lớp & Giảng viên
       - Trạng thái: nút "Chọn ca này" (Active highlight màu xanh `emerald` khi được chọn).
     - Lưu `targetScheduleSlotId` vào form.
5. **Lý do xin phép**: Textarea bắt buộc nhập.
6. **Nút gửi**: Gửi payload đầy đủ lên `POST /api/requests`.

---

## 4. ĐẶC TẢ CHI TIẾT: PORTAL ADMIN & BACKEND API

### 4.1. Cập nhật Sidebar Navigation (`src/components/common/Sidebar.tsx`)
- Thêm mục vào `adminNav`:
  ```tsx
  { label: 'Duyệt đơn & Đổi ca', href: '/admin/requests', icon: Inbox },
  ```
  Đặt ở vị trí phù hợp (ngay sau 'Lịch học trung tâm' hoặc sau 'Quản lý Lớp học').

### 4.2. Xây dựng trang Admin Requests (`src/app/admin/requests/page.tsx`)
- **Bảo vệ tuyến đường**: `<RoleGuard allowedRoles={['ADMIN']}>`.
- **Giao diện & Chức năng**:
  - Header: Tiêu đề "Phê duyệt Đơn từ Học viên (Nghỉ học & Đổi ca)".
  - Bộ lọc:
    - Lọc theo loại đơn: Tất cả / Đơn xin nghỉ / Đề xuất đổi ca.
    - Lọc theo trạng thái: Tất cả / Chờ duyệt / Đã duyệt / Từ chối.
    - Tìm kiếm theo mã sinh viên, mã lớp, mã đơn.
  - Thông tin mỗi thẻ đơn:
    - Mã đơn, Ngày gửi, Loại đơn (Badge màu phân biệt).
    - Học viên nộp đơn (ID & Tên nếu có), Lớp học, Môn học.
    - Ca học xin nghỉ / Ca học hiện tại -> Ca học mới đề xuất đổi (nếu là đổi ca).
    - Lý do của học viên.
    - Phản hồi / Ghi chú duyệt.
  - Hành động duyệt:
    - Nút "Từ chối" (màu đỏ) & "Chấp thuận duyệt" (màu xanh emerald).
    - Modal/Input nhập lý do phản hồi (Review Note) trước khi duyệt/từ chối.
    - Khi Admin duyệt: Gửi `reviewerId: currentUser.id`, `reviewerRole: 'ADMIN'`.

### 4.3. Nâng cấp API Requests (`src/app/api/requests/route.ts`)
1. **Phương thức GET**:
   - Nếu không truyền `studentId` và không truyền `teacherId` -> Trả về toàn bộ danh sách `requests` (phục vụ Admin).
   - Làm giàu dữ liệu (enrich): đính kèm thông tin ca học hiện tại (`scheduleSlot`) và ca học đích (`targetScheduleSlot`) để client hiển thị trực quan mà không cần gọi thêm nhiều API.
2. **Phương thức POST**:
   - Hỗ trợ trường `targetScheduleSlotId` khi học sinh tạo đơn `DOI_LICH`.
   - Trong nhánh `action === 'DECIDE'`:
     - Cập nhật `status`, `reviewedBy`, `reviewNote`.
     - Nếu là `DOI_LICH` và được `ĐÃ_DUYỆT`: Có thể cập nhật danh sách học viên trong slot tương ứng hoặc ghi log kiểm toán rõ ràng.
     - Ghi nhật ký hệ thống `AuditLog` với vai trò chuẩn của người duyệt (ADMIN hoặc TEACHER).

---

## 5. KẾ HOẠCH BÀN GIAO CHO WORKER & TESTER

### Bước 1: WORKER
1. Tạo component `src/components/common/Modal.tsx` sử dụng React Portal đưa trực tiếp ra `document.body`, xử lý `z-[9999]`, backdrop mờ, chặn click-outside và khóa scroll.
2. Cập nhật `src/types/schedule.ts` (đảm bảo `ClassRequest` có `targetScheduleSlotId?: string`).
3. Cập nhật `src/app/api/requests/route.ts`:
   - GET hỗ trợ Admin lấy tất cả.
   - POST lưu `targetScheduleSlotId` và ghi audit log đúng role.
4. Cập nhật `src/app/student/requests/page.tsx`:
   - Tích hợp chọn ca học từ `/api/schedule?studentId=...`.
   - Thiết kế timeline cuộn ngang (`overflow-x-auto`) cho ca học mới cùng môn khi chọn Đổi ca.
   - Dùng modal portal mới tạo.
5. Thêm route `/admin/requests` trong `src/app/admin/requests/page.tsx` và bổ sung menu trong `Sidebar.tsx`.
6. Rà soát các modal hiện có trong hệ thống để áp dụng giải pháp backdrop mới.

### Bước 2: TESTER
1. Chạy `npm run build` trên host để đảm bảo không lỗi TypeScript hay bundle.
2. Kiểm tra giao diện và luồng:
   - Học sinh tạo đơn xin nghỉ -> chọn đúng ca học.
   - Học sinh tạo đơn đổi ca -> chỉ chọn được ca mới cùng môn học, giao diện cuộn ngang mượt mà.
   - Admin truy cập `/admin/requests` -> xem được tất cả đơn, duyệt và từ chối thành công.
   - Modal hiển thị che phủ 100vw x 100vh, không bị hụt góc, không bị che bởi Sidebar.

---
