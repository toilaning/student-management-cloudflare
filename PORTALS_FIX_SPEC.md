# TÀI LIỆU ĐẶC TẢ VÀ PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ
## SỬA LỖI & HOÀN THIỆN TÍNH NĂNG PORTAL GIÁO VIÊN & HỌC SINH (EDU LOCAL)

---

### 1. TỔNG QUAN HIỆN TRẠNG & NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE)

Sau khi rà soát toàn bộ source code backend, frontend, luồng xác thực (Auth/Session/Context) và kết quả chạy trực tiếp trên Next.js Server, chúng tôi xác định các nguyên nhân khiến **Portal Giáo viên (`/teacher/*`)** và **Portal Học sinh (`/student/*`)** bị báo cáo là "không sử dụng được":

#### 1.1. Luồng State Hydration & Default User trong `AppContext.tsx`
- **Hiện tượng**: `AppContext.tsx` khởi tạo `currentUser` mặc định là `defaultAdmin` (`id: 'ADMIN001', role: 'ADMIN'`).
- Khi user chưa đăng nhập hoặc khi vừa tải lại trang (reload), nếu `localStorage` chưa load kịp (`isLoading = true`), ứng dụng vẫn cung cấp `currentUser = defaultAdmin`.
- Trên các trang `/teacher/*` hoặc `/student/*`, `useEffect` chạy ngay với `currentUser.id = 'ADMIN001'`. Do đó:
  - Khi gọi `/api/classes?teacherId=ADMIN001` -> Trả về `[]` (rỗng vì Admin không phải giáo viên).
  - Khi gọi `/api/schedule?teacherId=ADMIN001` -> Trả về `[]`.
  - Khi gọi `/api/students?id=ADMIN001` -> Trả về `null`.
  - Trên Sidebar, giao diện hiển thị "Admin Portal" thay vì "Teacher Portal" hoặc "Student Portal".

#### 1.2. Thiếu cơ chế Route Guard (Bảo vệ tuyến đường theo Role)
- Chưa có middleware hoặc Client Route Guard để kiểm tra: Nếu `role !== 'TEACHER'` mà truy cập `/teacher/*` thì redirect về `/login` hoặc chuyển sang đúng portal tương ứng. Tương tự cho `/student/*`.
- Khi user đăng nhập từ `/login`, router chuyển hướng đúng (`/teacher/dashboard` hoặc `/student/dashboard`), nhưng nếu người dùng mở tab mới hoặc gõ URL trực tiếp mà không lưu state đồng bộ (SSR / Client Hydration mismatch), giao diện sẽ bị rơi vào trạng thái Admin với dữ liệu trống trơn.

#### 1.3. Vấn đề Cookie Session & Server-Side vs Client-Side
- Hệ thống hiện tại lưu user đăng nhập thuần trong `localStorage` (`active_user_id`), không có Cookie đồng bộ. Khi server render SSR, Next.js không biết người dùng hiện tại là ai nên render trạng thái Admin mặc định.
- Khi người dùng bấm "Đăng xuất" ở Header, hàm `logout()` xóa `active_user_id` và điều hướng về `/login`. Nhưng nếu trên trang `/teacher/*` hay `/student/*` chưa đăng nhập, người dùng không được tự động chuyển về `/login`.

#### 1.4. Hiển thị UI và Trạng thái dữ liệu rỗng (Empty State handling)
- Các trang `/teacher/dashboard`, `/teacher/schedule`, `/teacher/classes`, `/teacher/attendance`, `/teacher/requests`:
  - Đã gọi API tương ứng (`/api/classes`, `/api/schedule`, `/api/requests`, `/api/payroll`, `/api/attendance`).
  - Backend API và Supabase Repository hoạt động chính xác (đã test cURL trả về đúng 100% dữ liệu cho `GV001` và `ST001`).
  - Tuy nhiên, trong lúc `loading = true` hoặc khi `currentUser.role !== 'TEACHER'`, một số trang không có Skeleton loader hoặc thông báo rõ ràng khiến người dùng tưởng trang bị đơ/trắng trang/hỏng.
- Trang `/teacher/attendance/page.tsx`:
  - Sử dụng `useSearchParams()` nhưng thiếu dynamic check nếu slot được chọn không thuộc giáo viên hiện tại, cần tối ưu dropdown slot mặc định.
- Trang `/student/tuition/page.tsx`:
  - Gọi `/api/finance?studentId=${currentUser.id}`. API trả về danh sách hoá đơn đầy đủ, nhưng khi bấm nộp tiền QR thì cần thông báo trực quan hơn.

---

### 2. KẾT QUẢ KIỂM TRA HÀM REPOSITORY & API BACKEND

| Endpoint / Method | Kết quả kiểm thử (cURL / Local DB) | Trạng thái |
|---|---|---|
| `POST /api/auth/login` (`gv001` / `teacher123`) | Trả về `user: { id: "GV001", role: "TEACHER", ... }` | ✅ Hoạt động tốt |
| `POST /api/auth/login` (`st001` / `student123`) | Trả về `user: { id: "ST001", role: "STUDENT", ... }` | ✅ Hoạt động tốt |
| `GET /api/classes?teacherId=GV001` | Trả về 2 lớp học (`CLS01`, `CLS16`) kèm đầy đủ học viên | ✅ Hoạt động tốt |
| `GET /api/schedule?teacherId=GV001` | Trả về 26 ca dạy trong tháng 09/2026 | ✅ Hoạt động tốt |
| `GET /api/attendance?slotId=SCH0001` | Trả về danh sách 13 bản ghi điểm danh học viên | ✅ Hoạt động tốt |
| `GET /api/requests?teacherId=GV001` | Trả về danh sách 2 đơn xin phép học sinh gửi | ✅ Hoạt động tốt |
| `GET /api/payroll?teacherId=GV001` | Trả về bảng lương tháng 09/2026 của GV Trần Hữu Bình | ✅ Hoạt động tốt |
| `GET /api/classes?studentId=ST001` | Trả về lớp `CLS01` học viên ST001 tham gia | ✅ Hoạt động tốt |
| `GET /api/schedule?studentId=ST001` | Trả về 13 ca học của ST001 | ✅ Hoạt động tốt |
| `GET /api/attendance?studentId=ST001` | Trả về 8 bản ghi điểm danh lịch sử | ✅ Hoạt động tốt |
| `GET /api/finance?studentId=ST001` | Trả về hoá đơn học phí 3.500.000đ | ✅ Hoạt động tốt |

---

### 3. ĐẶC TẢ CÁC TẬP TIN CẦN ĐIỀU CHỈNH / SỬA ĐỔI

#### 3.1. `src/context/AppContext.tsx`
- **Mục tiêu**:
  - Không khởi tạo `currentUser` cứng là Admin ngay lập tức nếu chưa đọc xong `localStorage`.
  - Bổ sung `isAuthenticated: boolean` và cờ `isReady: boolean` để các trang biết khi nào thông tin user thực tế đã được nạp xong.
  - Đồng bộ `currentUser` vào cookie nhẹ (`client_role`, `client_user_id`) để hỗ trợ đồng bộ hiển thị và tránh lệch role giữa Client và Layout.
  - Khi user chưa đăng nhập mà truy cập các portal cần quyền (`/admin/*`, `/teacher/*`, `/student/*`), cung cấp cơ chế guard chuyển về `/login`.

#### 3.2. Tạo Component HOC / Guard: `src/components/common/RoleGuard.tsx`
- **Mục tiêu**:
  - Bọc quanh nội dung các trang portal.
  - Kiểm tra `currentUser.role`:
    - Nếu trang `/teacher/*` mà role không phải `TEACHER`, tự động hiển thị màn hình cảnh báo hoặc redirect sang portal của chính họ / `/login`.
    - Nếu trang `/student/*` mà role không phải `STUDENT`, tương tự redirect.
  - Trong lúc `isLoading = true`, hiển thị Spinner loading mượt mà thay vì hiển thị dữ liệu rỗng.

#### 3.3. Tối ưu giao diện & UX các trang Portal Giáo viên:
- `src/app/teacher/dashboard/page.tsx`: Thêm Skeleton loading state khi đang fetch dữ liệu, xử lý trường hợp giáo viên chưa có lớp/lịch.
- `src/app/teacher/schedule/page.tsx`: Đảm bảo bộ lọc ngày/tháng và link sang điểm danh hoạt động mượt mà.
- `src/app/teacher/classes/page.tsx`: Hiển thị danh sách học viên trong từng lớp rõ ràng khi bấm xem chi tiết.
- `src/app/teacher/attendance/page.tsx`: Tối ưu load slot đầu tiên, chọn slot và lưu điểm danh với phản hồi toast.
- `src/app/teacher/requests/page.tsx`: Cho phép duyệt / từ chối đơn với phản hồi tức thì và cập nhật danh sách ngay trên giao diện.

#### 3.4. Tối ưu giao diện & UX các trang Portal Học sinh:
- `src/app/student/dashboard/page.tsx`: Thêm Skeleton loading, link Google Meet mở tab mới chuẩn xác.
- `src/app/student/schedule/page.tsx`: Hiển thị lịch học trực quan theo tuần/tháng.
- `src/app/student/classes/page.tsx`: Xử lý đăng ký lớp và cập nhật ngay state danh sách lớp đã đăng ký.
- `src/app/student/attendance/page.tsx`: Trình bày bảng thống kê số buổi có mặt/vắng/muộn chi tiết.
- `src/app/student/requests/page.tsx`: Modal tạo đơn xin nghỉ/đổi ca chọn đúng lớp học sinh đang học.
- `src/app/student/tuition/page.tsx`: Modal quét mã QR và xác nhận nộp tiền học phí hoạt động tức thì.

#### 3.5. Đồng bộ Quick Login & Role Switcher trên môi trường Web:
- Đảm bảo khi bấm vào Quick Login trên `/login` hoặc Role Switcher trên Header, hệ thống cập nhật state `currentUser` tức thì và `router.replace` tới đúng portal tương ứng.

---

### 4. KẾ HOẠCH BÀN GIAO THỰC THI (CHO WORKER)
1. **Bước 1**: Cập nhật `src/context/AppContext.tsx` để xử lý chuẩn xác state `isLoading`, `isReady`, khởi tạo user từ storage.
2. **Bước 2**: Xây dựng `src/components/common/RoleGuard.tsx` và tích hợp vào các trang `/teacher/*` và `/student/*`.
3. **Bước 3**: Kiểm tra và tinh chỉnh lại toàn bộ 5 trang `/teacher/*` và 6 trang `/student/*` để đảm bảo không bị lỗi hydration, không gọi API với id rỗng, hiển thị đầy đủ dữ liệu và thao tác mượt mà.
4. **Bước 4**: Chạy test kiểm thử toàn diện trên trình duyệt và kiểm tra build (`npm run build`).

Tài liệu được lập bởi: **MANAGER** (Model: `custom-9router-gateway-20128/ag/gemini-3.8-flash-medium`)  
Thời gian: **20/09/2026**
