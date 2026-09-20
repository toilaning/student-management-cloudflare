# TÀI LIỆU YÊU CẦU KỸ THUẬT SỬA LỖI RESPONSIVE & LAYOUT (RESPONSIVE FIX SPEC)
**Người lập (Manager):** `ag/gemini-3.8-flash-medium`  
**Đối tượng thực thi (Worker):** `code_worker` (`ag/gemini-3.8-flash-high`)  
**Dự án:** Hệ thống Quản lý Đào tạo EduLocal (`/Users/toilaning/projects/student-management`)  
**Ngày cập nhật:** 20/09/2026  

---

## 1. TỔNG QUAN VẤN ĐỀ & NGUYÊN TẮC CHUNG (GENERAL PRINCIPLES)

### 1.1. Hiện trạng lỗi phát hiện
1. **Chữ bị gãy từ, rớt dòng ngắt quãng xấu:**
   - Các tiêu đề bảng (table header `<th>`), thẻ trạng thái (badge), nhãn thông số, đơn vị tiền tệ (`VNĐ`, `Tr`, `đ/giờ`) bị ép rớt chữ từng ký tự/từng từ do thiếu `whitespace-nowrap` và `shrink-0`.
   - Tiêu đề trang trên thanh Header bị tràn ép rớt dòng đè lên các nút thao tác khi ở màn hình mobile (< 640px).
2. **Tràn modal / dropdown trên màn hình hẹp (< 400px, 320px - 375px):**
   - `QuickRoleSwitcher`: Dropdown popover đặt cứng `w-96` (384px) kèm `absolute right-0`, khi xem trên điện thoại có bề rộng 360px - 390px sẽ bị tràn vượt lề trái màn hình (overflow-x).
   - `NotificationDropdown`: Dropdown đặt `w-80 sm:w-96`, trên điện thoại nhỏ (320px - 360px) bị tràn cạnh viền.
   - Các modal thêm mới (`showAddModal`), gán lớp, sửa lịch sử dụng `grid-cols-2` cố định khiến các ô input (ngày sinh, SĐT, giới tính, email) bị bóp méo, chữ placeholder bị cắt cụt.
3. **Thẻ thống kê (Metric Cards):**
   - Các hàng hiển thị con số + đơn vị (`flex items-baseline gap-2`) không có `flex-wrap` và thiếu `whitespace-nowrap`, dẫn đến cụm "100% kích hoạt" hoặc "triệu VNĐ" bị rớt dòng ngắt chữ.
4. **Bảng dữ liệu (Tables) trên Admin:**
   - Thiếu `whitespace-nowrap` ở hầu hết các cột tiêu đề và dữ liệu (Họ tên, mã GV/SV, số tiền, ngày sinh, trạng thái, thao tác), dẫn đến bảng bị co bóp dị dạng khi người dùng lướt trên tablet/mobile.

### 1.2. Bộ quy chuẩn Tailwind CSS bắt buộc cho WORKER
- **Badge & Status Tag:** Bắt buộc có `inline-flex items-center whitespace-nowrap shrink-0`.
- **Đơn vị tiền tệ & Số liệu:** Bắt buộc có `whitespace-nowrap`.
- **Table Headers & Table Cells:** 
  - Toàn bộ thẻ `<th>` phải có `whitespace-nowrap`.
  - Các ô dữ liệu mã định danh (`Mã SV`, `Mã GV`, `Mã Lớp`, `Mã HĐ`), ngày tháng, số tiền, nút thao tác bắt buộc có `whitespace-nowrap`.
  - Cột Họ tên hoặc Mô tả dài dùng `min-w-[160px]` hoặc `min-w-[200px]` kèm `font-medium` để tránh co bóp cột.
- **Header Navigation:** Cắt gọn tiêu đề bằng `truncate min-w-0 max-w-[130px] sm:max-w-xs md:max-w-none`, ẩn subtitle trên mobile (`hidden sm:block`).
- **Dropdown & Modal:** Thay thế `w-96` cố định bằng `w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm sm:max-w-md right-0 sm:right-0 fixed sm:absolute top-16 sm:top-auto left-3 sm:left-auto right-3 sm:right-0` để luôn vừa vặn 100% mọi màn hình điện thoại.

---

## 2. CHI TIẾT SỬA ĐỔI TỪNG COMPONENT & TRANG (SPECIFICATION)

### 2.1. `src/components/common/Header.tsx`
- **Vấn đề:** 
  - `title` và `subtitle` nằm trong thẻ `div` không có `min-w-0`, khi tiêu đề dài sẽ đẩy dồn các nút bên phải làm tràn header.
  - Lớp `hidden xs:inline` ở logo không có trong cấu hình Tailwind mặc định (Tailwind chỉ có `sm, md, lg, xl, 2xl`).
- **Yêu cầu Worker sửa:**
  1. Thẻ bao brand logo: thay `hidden xs:inline` thành `hidden sm:inline`.
  2. Khối tiêu đề: bọc trong `<div className="min-w-0 flex-1 sm:flex-initial">`.
  3. Thẻ `<h1>{title}</h1>`: thêm `truncate text-sm sm:text-base md:text-lg max-w-[130px] sm:max-w-[220px] md:max-w-none`.
  4. Thẻ `<p>{subtitle}</p>`: thêm `hidden md:block truncate text-xs text-slate-500`.
  5. Nút Logout: đảm bảo `whitespace-nowrap shrink-0`.

### 2.2. `src/components/common/QuickRoleSwitcher.tsx`
- **Vấn đề:**
  - Nút bấm trigger: chứa `{currentUser.name}` và `({currentUser.id})`. Khi trên mobile, nút này quá dài làm đè lên chuông thông báo.
  - Menu Dropdown: đặt `absolute right-0 mt-2 w-96` -> Tràn mép màn hình điện thoại (màn hình < 384px sẽ bị vỡ layout ngang).
  - Tab chọn vai trò: `grid grid-cols-3` đặt nhãn "Quản trị (1)", "Giáo viên (20)", "Học viên (400)" trên màn hình nhỏ chữ bị rớt dòng.
- **Yêu cầu Worker sửa:**
  1. Nút trigger:
     - Thêm `shrink-0 max-w-[150px] sm:max-w-none truncate`.
     - Ẩn phần mã `({currentUser.id})` trên mobile: `<span className="hidden md:inline text-slate-400 text-xs">({currentUser.id})</span>`.
     - Role badge bên trong nút thêm `shrink-0 whitespace-nowrap`.
  2. Hộp dropdown:
     - Thay `absolute right-0 mt-2 w-96` thành:
       `fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 mt-2 sm:w-96 max-w-sm sm:max-w-none mx-auto sm:mx-0 z-50`.
  3. Thanh tab chọn vai trò:
     - Thêm `whitespace-nowrap px-1 text-[11px] sm:text-xs`.
  4. Danh sách học viên / giáo viên:
     - Tên và email có `truncate max-w-[180px] sm:max-w-xs`.

### 2.3. `src/components/common/NotificationDropdown.tsx`
- **Vấn đề:**
  - Dropdown đặt `w-80 sm:w-96` kèm `absolute right-0`. Trên mobile 320px - 360px sẽ bị lệch mép trái.
- **Yêu cầu Worker sửa:**
  - Đổi class hộp thông báo:
    `fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 mt-2 sm:w-96 max-w-sm sm:max-w-none z-50`.
  - Thẻ tiêu đề thông báo `h4`: thêm `truncate font-semibold`.
  - Nút "Đọc tất cả": thêm `whitespace-nowrap shrink-0`.

### 2.4. `src/components/common/Sidebar.tsx`
- **Vấn đề:**
  - Thẻ profile người dùng dưới chân hoặc trên đầu sidebar: tên dài bị rớt dòng xấu nếu không có `truncate`.
- **Yêu cầu Worker sửa:**
  - Giữ vững `truncate` ở tên người dùng và email.
  - Các mục navigation menu: thêm `whitespace-nowrap truncate` ở nhãn `<span className="truncate">{item.label}</span>` để thanh bên luôn thẳng hàng.

### 2.5. `src/app/admin/dashboard/page.tsx`
- **Vấn đề:**
  - Các thẻ Metric: Khối hiển thị tiền tệ `(stats.totalRevenue / 1_000_000).toFixed(1) Tr` kèm `VNĐ` bị ngắt dòng khi xem ở độ phân giải tablet hoặc 2 cột.
  - Dòng text "Còn nợ: ... triệu VNĐ": bị ngắt chữ.
  - Bảng "Lịch học tiêu biểu" và "Nhật ký hoạt động": chữ chi tiết ca học bị gãy dòng lung tung.
- **Yêu cầu Worker sửa:**
  1. Thẻ Metric:
     - Đổi khối số liệu sang: `<div className="mt-3 flex items-baseline gap-1.5 flex-wrap">`.
     - Số tiền + chữ "Tr": thêm `whitespace-nowrap font-bold`.
     - Thẻ đơn vị "VNĐ": thêm `whitespace-nowrap text-xs text-slate-400 font-medium`.
     - Dòng text ghi chú phụ: thêm `whitespace-nowrap text-xs`.
  2. Danh sách ca học tiêu biểu:
     - Thông tin chi tiết: `<div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">`.
     - Badge ca học và badge trạng thái: thêm `whitespace-nowrap shrink-0`.
  3. Nhật ký hoạt động:
     - Giờ ghi log: `whitespace-nowrap shrink-0`.
     - Tên người thực hiện: `truncate max-w-[150px] font-bold`.

### 2.6. `src/app/admin/students/page.tsx`
- **Vấn đề:**
  - Bảng sinh viên: Các cột `Họ và tên`, `Liên hệ`, `Lớp đang theo học`, `Trạng thái`, `Thao tác` bị co cụm khi màn hình nhỏ.
  - Nút "Gán lớp" và nút "Xóa" bị rớt dòng đè lên nhau.
  - Modal "Thêm Học Viên": Các dòng input dùng `grid grid-cols-2` cố định gây chật hẹp trên mobile.
  - Modal "Gán lớp": Danh sách lớp học hiển thị nút "Gán vào lớp" bị đẩy xuống dòng thứ 2 làm vỡ layout card.
- **Yêu cầu Worker sửa:**
  1. Bảng `table`:
     - Tất cả `<th>`: thêm `whitespace-nowrap py-3 px-3 sm:px-4 text-xs font-semibold`.
     - `<td>` Mã SV: `whitespace-nowrap font-mono font-bold`.
     - `<td>` Họ và tên: `whitespace-nowrap min-w-[160px] font-semibold`.
     - `<td>` Giới tính, Ngày sinh: `whitespace-nowrap`.
     - `<td>` Liên hệ: `whitespace-nowrap` (Số điện thoại font-medium, email nhỏ bên dưới truncate max-w-[180px]).
     - `<td>` Lớp đang theo học: thẻ tag bọc `whitespace-nowrap inline-flex`.
     - `<td>` Trạng thái: badge `whitespace-nowrap inline-flex`.
     - `<td>` Thao tác: `whitespace-nowrap text-right min-w-[110px]`. Nút gán lớp và xoá bọc trong `inline-flex items-center gap-1.5 justify-end`.
  2. Modal Thêm học viên:
     - Đổi các `grid grid-cols-2 gap-3` thành `grid grid-cols-1 sm:grid-cols-2 gap-3`.
  3. Modal Gán lớp:
     - Item lớp: flex container có `flex-col sm:flex-row sm:items-center justify-between gap-2`.
     - Nút "Gán vào lớp" / "Hủy gán lớp": `shrink-0 whitespace-nowrap self-end sm:self-center`.

### 2.7. `src/app/admin/classes/page.tsx`
- **Vấn đề:**
  - Card lớp học: Dòng Giảng viên, Sĩ số, Lớp học Online (Google Meet link), Lịch trong tuần, Học phí khóa có text dài bị ép dòng lệch cột.
  - Nút "Quản lý học viên" và "Đổi GV" ở chân card: bị gãy chữ trên màn hình hẹp.
- **Yêu cầu Worker sửa:**
  1. Card lớp học:
     - Tiêu đề lớp: `font-bold text-base line-clamp-1`.
     - Link Google Meet: `whitespace-nowrap truncate max-w-[150px] inline-flex items-center gap-1`.
     - Học phí: `whitespace-nowrap font-bold text-emerald-600`.
     - Tên giảng viên: `truncate max-w-[140px] font-bold`.
  2. Chân card:
     - Nút "Quản lý học viên": `whitespace-nowrap truncate text-xs font-bold`.
     - Nút "Đổi GV": `whitespace-nowrap shrink-0 text-xs font-bold`.

### 2.8. `src/app/admin/teachers/page.tsx`
- **Vấn đề:**
  - Card giảng viên: Đơn giá giờ dạy (`350.000 đ/giờ`), Chuyên môn, Email bị rớt dòng lộn xộn.
  - Form modal: `grid grid-cols-2` ép chữ trên mobile.
- **Yêu cầu Worker sửa:**
  1. Card giảng viên:
     - Tên giảng viên: `truncate max-w-[160px] font-bold`.
     - Badge trạng thái: `whitespace-nowrap shrink-0`.
     - Đơn giá giờ dạy: `<strong className="text-emerald-600 whitespace-nowrap">{tc.hourlyRate.toLocaleString('vi-VN')} đ/giờ</strong>`.
     - Email & SĐT: `truncate whitespace-nowrap`.
  2. Modal Thêm giảng viên:
     - Chuyển `grid grid-cols-2 gap-3` thành `grid grid-cols-1 sm:grid-cols-2 gap-3`.

### 2.9. `src/app/admin/calendar/page.tsx`
- **Vấn đề:**
  - Thanh bộ lọc chọn ngày và tuần: Các nút "Hôm nay", nút mũi tên `< >` và ô chọn ngày bị tràn dòng khi xem trên mobile.
  - Các card ca học theo từng ca/phòng: Thiếu `whitespace-nowrap` trên giờ học, mã phòng, badge trạng thái.
- **Yêu cầu Worker sửa:**
  1. Thanh điều khiển lịch:
     - Bọc cụm chọn ngày bằng `flex-wrap gap-2 sm:gap-3 w-full sm:w-auto`.
     - Nút bấm thêm ca học: `whitespace-nowrap w-full sm:w-auto justify-center`.
  2. Card ca học:
     - Khối thời gian: `whitespace-nowrap font-semibold`.
     - Google meet link: `whitespace-nowrap truncate max-w-[140px]`.
     - Nút sửa nhanh / xoá ca: `shrink-0 whitespace-nowrap`.

### 2.10. `src/app/admin/payroll/page.tsx` & `src/app/admin/tuition/page.tsx`
- **Vấn đề:**
  - Bảng lương (`payroll`): 10 cột dữ liệu (Mã GV, Tên GV, Số ca dạy, Tổng giờ, Đơn giá/giờ, Lương gộp, Thưởng, Thực nhận, Trạng thái, Thao tác). Các tiêu đề cột và tiền tệ bị ngắt từng chữ (ví dụ: "Thực \n nhận", "15.000.000 \n đ").
  - Bảng học phí (`tuition`): Cột Khoản thu, Đã nộp, Còn lại, Hạn nộp, Mã giao dịch bị co bóp xấu.
- **Yêu cầu Worker sửa:**
  1. Bảng Bảng lương:
     - Toàn bộ 10 cột `<th>`: bắt buộc có `whitespace-nowrap px-3 sm:px-4 py-3`.
     - Cột Số ca dạy, Tổng giờ: `whitespace-nowrap`.
     - Cột Đơn giá, Lương gộp, Thưởng, Thực nhận: bắt buộc `whitespace-nowrap font-semibold font-mono`.
     - Cột Trạng thái: badge `whitespace-nowrap inline-flex`.
     - Cột Thao tác: nút "Thanh toán", "Chốt lương" có `whitespace-nowrap shrink-0`.
  2. Bảng Học phí & Công nợ:
     - Toàn bộ `<th>`: `whitespace-nowrap px-3 sm:px-4 py-3`.
     - Cột Mã HĐ, Mã SV, Mã Lớp: `whitespace-nowrap font-mono`.
     - Cột Khoản thu, Đã nộp, Còn lại: `whitespace-nowrap font-semibold font-mono`.
     - Cột Hạn nộp & Mã giao dịch: `whitespace-nowrap`.
     - Thẻ lọc trạng thái ('ALL', 'Đã nộp', 'Còn nợ', 'Quá hạn'): bọc trong `flex flex-wrap gap-1.5 sm:gap-2`.

### 2.11. `src/app/student/dashboard/page.tsx` & `src/app/student/schedule/page.tsx`
- **Vấn đề:**
  - Banner chào mừng: nút "Xem lịch học tuần này" bị ép méo khi trên màn hình điện thoại.
  - Thẻ Metric công nợ học phí: Chữ "Tr" và "triệu đ" bị nhảy dòng.
  - Lịch học sắp tới: Google Meet link và thời gian ca học bị xuống dòng gãy đoạn.
- **Yêu cầu Worker sửa:**
  1. Banner: Chuyển flex thành `flex-col sm:flex-row gap-4 items-start sm:items-center`. Nút hành động: `whitespace-nowrap shrink-0 w-full sm:w-auto text-center`.
  2. Metric thẻ công nợ: `whitespace-nowrap` cho các con số và đơn vị tiền.
  3. Danh sách buổi học:
     - Thời gian: `whitespace-nowrap text-xs text-slate-500`.
     - Link Google Meet: `whitespace-nowrap inline-flex items-center gap-1 font-bold text-emerald-600`.
     - Badge trạng thái: `whitespace-nowrap shrink-0`.

### 2.12. `src/app/teacher/dashboard/page.tsx` & `src/app/teacher/schedule/page.tsx`
- **Vấn đề:**
  - Metric thẻ "Lương tạm tính T9": Giá trị "xx Tr" và "đ/h" bị rớt dòng.
  - Danh sách ca dạy: Nút "Điểm danh" và badge trạng thái rớt dòng làm thụt lùi layout.
- **Yêu cầu Worker sửa:**
  1. Metric thẻ lương: Giá trị tiền + "Tr" bọc `whitespace-nowrap font-bold text-purple-700`. Đơn vị `đ/h` bọc `whitespace-nowrap`.
  2. Danh sách ca dạy: Nút "Điểm danh" thêm `whitespace-nowrap shrink-0`. Badge trạng thái thêm `whitespace-nowrap shrink-0`.
  3. Trang `schedule`: Các item ngày học, ca học, phòng học thêm `whitespace-nowrap` cho nhãn và dữ liệu.

---

## 3. CHECKLIST KIỂM TRA CHO TESTER & REVIEWER
- [ ] Màn hình điện thoại iPhone SE / Android hẹp (320px - 375px):
  - [ ] Header không bị tràn ngang, không xuất hiện scrollbar ngang ngoài ý muốn ở cấp trang (trừ bảng dữ liệu có scrollbar riêng).
  - [ ] Bấm mở `QuickRoleSwitcher`: Modal không bị tràn viền màn hình, chọn tab mượt mà.
  - [ ] Bấm mở `NotificationDropdown`: Modal hiển thị gọn gàng, không bị đẩy tràn mép trái.
- [ ] Các thẻ Metric Card (Dashboard Admin / Teacher / Student):
  - [ ] Số tiền VNĐ và đơn vị hiển thị trên cùng 1 hàng trực quan, không bị ngắt chữ "V" và "NĐ".
- [ ] Các bảng dữ liệu (Students, Payroll, Tuition):
  - [ ] Tất cả tiêu đề cột và nội dung hiển thị chuẩn hàng ngang, cuộn ngang mượt mà trong container `overflow-x-auto`.
  - [ ] Badge trạng thái và các nút thao tác không bị bẻ đôi chữ.
- [ ] Các form modal thêm mới và phân công:
  - [ ] Các trường input hiển thị 1 cột trên mobile (< 640px) và 2 cột trên tablet/desktop (>= 640px).

---
*Tài liệu này đã được lưu tại:* `/Users/toilaning/projects/student-management/RESPONSIVE_FIX_SPEC.md`
