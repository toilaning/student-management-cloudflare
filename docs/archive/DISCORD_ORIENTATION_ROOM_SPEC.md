# ĐẶC TẢ KỸ THUẬT: CHUYỂN ĐỔI PHÒNG HỌC DISCORD & NÂNG CẤP ORIENTATION BOT
**Mã tài liệu:** SPEC-DISCORD-ROOM-ORIENTATION-01  
**Ngày lập:** 2026-09-20  
**Người lập:** MANAGER (Model: `ag/gemini-3.8-flash-medium`)  
**Mục tiêu:** Chuyển đổi toàn bộ cơ chế họp trực tuyến từ Google Meet sang Link Room phòng học Discord; nâng cấp Discord Bot với hệ thống định hướng lớp học (Orientation & Classroom Guidance).

---

## PHẦN 1: TỔNG QUAN & PHẠM VI BIẾN ĐỔI

### 1.1 Chuyển đổi Google Meet -> Discord Room
- Loại bỏ hoàn toàn nhãn hiển thị và liên kết Google Meet trên toàn bộ giao diện Web Dashboard (Admin, Teacher, Student).
- Chuẩn hóa trường dữ liệu: Giữ nguyên `meetingLink` trong database schema và TypeScript types nhưng đổi mô tả / label / placeholder thành **"Link phòng học Discord / Room Link"** (ví dụ: `https://discord.com/channels/...`).
- Cập nhật seed data mẫu sang định dạng Discord room: `https://discord.com/channels/edu-center/room-cls01`.

### 1.2 Nâng cấp Bot Định Hướng Lớp Học (Classroom Guidance & Orientation)
- Xây dựng 3 slash command mới:
  1. `/dinh-huong` (alias `/huong-dan`): Cung cấp cẩm nang toàn diện cho học viên lớp vẽ với Embed trực quan và các nút bấm hành động.
  2. `/lop-hoc`: Tra cứu thông tin lớp học học viên đang tham gia (Môn học, GV, Lịch học, Voice Room link).
  3. `/vao-hoc`: Nút bấm 1-chạm đưa thẳng học viên vào đúng phòng Voice học vẽ của lớp mình.
- Bổ sung Event `guildMemberAdd`: Chào đón học viên mới vào Discord Server, gửi Welcome Embed kèm hướng dẫn liên kết tài khoản và nút bấm nhanh.

---

## PHẦN 2: CHI TIẾT KỸ THUẬT PHẦN 1 - WEB DASHBOARD & CHUYỂN ĐỔI LINK PHÒNG HỌC

### 2.1 Types (`src/types/`)
- `src/types/schedule.ts`:
  - `meetingLink?: string;` // Chú thích: `Link phòng học Discord / Room Link`
- `src/types/classroom.ts`:
  - `meetingLink?: string;` // Chú thích: `Link phòng học Discord / Room Link`

### 2.2 Trang Quản Trị Lịch Học (`src/app/admin/calendar/page.tsx`)
- Thay đổi nhãn "Google Meet" -> "Link Room Discord / Phòng học Discord".
- Placeholder: `https://discord.com/channels/edu-center/...`
- Modal chi tiết ca học / thêm ca học: Nút "Vào phòng học Discord" thay cho "Vào Google Meet".

### 2.3 Trang Quản Lý Lớp Học (`src/app/admin/classes/page.tsx`)
- Modal cấu hình meetLink: Đổi label từ "Link Google Meet" sang "Link phòng học Discord / Room Link".
- Placeholder: `https://discord.com/channels/edu-center/room-...`
- Cột hoặc chi tiết lớp học: Đổi biểu tượng/nhãn hiển thị sang Discord Room.

### 2.4 Trang Dashboard Học Viên (`src/app/student/dashboard/page.tsx`) & Giáo Viên (`src/app/teacher/dashboard/page.tsx`)
- Nút "Vào Google Meet" đổi thành **"Vào phòng học Discord"**.
- Icon: Sử dụng icon Video / Headphones / MessagesSquare / Radio từ `lucide-react`.
- Khi click mở tab mới `target="_blank"` link phòng Discord. Nếu lớp chưa có link, hiển thị tooltip hoặc trạng thái "Chưa cấu hình phòng Discord".

### 2.5 Seed Data & Mock Data (`supabase/seed.sql`, `src/lib/mockData.ts` nếu có)
- Cập nhật các link `https://meet.google.com/...` thành định dạng:
  `https://discord.com/channels/edu-center/room-cls01`, `https://discord.com/channels/edu-center/room-cls02`, ...

---

## PHẦN 3: CHI TIẾT KỸ THUẬT PHẦN 2 - DISCORD BOT ORIENTATION & GUIDANCE

### 3.1 Cấu trúc Thư mục Nâng cấp trong `discord-bot/`
```
discord-bot/
├── src/
│   ├── commands/
│   │   ├── diemdanh-voice.js
│   │   ├── mo-diemdanh.js
│   │   ├── dinh-huong.js        <-- MỚI: Cẩm nang học vẽ & định hướng
│   │   ├── lop-hoc.js           <-- MỚI: Tra cứu thông tin lớp học
│   │   └── vao-hoc.js           <-- MỚI: Nút 1-chạm vào phòng Voice
│   ├── events/
│   │   ├── interactionCreate.js (Mở rộng hỗ trợ các nút trong cẩm nang)
│   │   ├── messageCreate.js
│   │   └── guildMemberAdd.js    <-- MỚI: Chào mừng học viên mới
│   ├── api.js                   (Bổ sung endpoint lấy thông tin lớp của học viên theo discord_id)
│   └── index.js                 (Đăng ký các lệnh mới và event guildMemberAdd)
```

### 3.2 Endpoint Backend Bổ Sung cho Bot (`src/app/api/discord/student-class/route.ts`)
- **Route:** `GET /api/discord/student-class?discord_id={id}`
- **Chức năng:**
  - Tra cứu trong bảng `students` tìm học sinh có `discord_id`.
  - Nếu chưa liên kết -> trả về `{ linked: false }`.
  - Nếu đã liên kết -> lấy danh sách lớp học mà học sinh đang tham gia (từ bảng `enrollments` -> `classes`), bao gồm:
    * `class_id`, `class_name`, `course_name`
    * `teacher_name`
    * `schedule_days`, `shift_time`
    * `meeting_link` (Link phòng học Discord)
    * `discord_voice_channel_id` (nếu có cấu hình)

### 3.3 Chi tiết các Slash Commands Mới

#### A. Command `/dinh-huong` (hoặc `/huong-dan`)
- **Tên:** `dinh-huong` (Description: "Cẩm nang hướng dẫn học viên lớp vẽ và sử dụng Discord").
- **Nội dung Embed:**
  - **Title:** `🎨 CẨM NANG DÀNH CHO HỌC VIÊN LỚP VẼ`
  - **Color:** `#5865F2` (Discord Blurple)
  - **Fields:**
    1. `1️⃣ Liên kết tài khoản`: Hướng dẫn gửi cú pháp hoặc dùng Web Dashboard cập nhật Discord ID để hệ thống nhận diện.
    2. `2️⃣ Tham gia phòng Voice học vẽ`: Hướng dẫn vào đúng phòng Voice của lớp để xem giáo viên livestream chia sẻ màn hình/vẽ mẫu và bật mic trao đổi.
    3. `3️⃣ Điểm danh bài học`:
       * Tự động nhận diện khi tham gia Voice trong khung giờ ca học.
       * Hoặc bấm nút điểm danh 1-Click khi giáo viên mở điểm danh.
    4. `4️⃣ Nộp bài tập vẽ (#nop-bai-tap)`:
       * Đính kèm ảnh bài vẽ chất lượng cao tại kênh `#nop-bai-tap`.
       * Kèm theo mã học sinh hoặc mã bài tập. Bot sẽ tự động quét, đẩy ảnh lên Web Dashboard và chuyển trạng thái `ĐÃ NỘP`.
    5. `5️⃣ Lịch học & Hạn nộp`: Tra cứu nhanh lịch cá nhân hoặc nhận thông báo tự động từ Bot trước 24h và 4h.
- **ActionRow Buttons:**
  - Button 1: `🔗 Liên kết tài khoản` (ID: `btn_huongdan_lienket` hoặc URL Web)
  - Button 2: `🔊 Vào phòng học ngay` (ID: `btn_vao_hoc_nhanh`)
  - Button 3: `📚 Xem lớp học của tôi` (ID: `btn_xem_lop_hoc`)

#### B. Command `/lop-hoc`
- **Tên:** `lop-hoc` (Description: "Tra cứu thông tin lớp học vẽ của bạn").
- **Luồng xử lý:**
  1. Bot gọi `api.getStudentClass(interaction.user.id)`.
  2. Nếu chưa liên kết: Báo Embed màu vàng nhắc liên kết mã học sinh.
  3. Nếu có dữ liệu lớp: Tạo Embed hiển thị chi tiết:
     - Tên môn / Lớp
     - Giáo viên đứng lớp
     - Lịch học trong tuần & Giờ học
     - Link phòng học Discord (Button link trực tiếp).

#### C. Command `/vao-hoc`
- **Tên:** `vao-hoc` (Description: "Vào phòng học Discord của lớp bạn nhanh chóng").
- **Luồng xử lý:**
  1. Lấy thông tin lớp học đang diễn ra hoặc lớp học của học viên.
  2. Trả về nút bấm chuyển hướng (Link Button) dẫn trực tiếp vào Voice Channel phòng học vẽ tương ứng.

### 3.4 Sự kiện `guildMemberAdd.js` (Chào Đón Học Sinh Mới)
- Khi học sinh mới vào Discord Guild:
  - Gửi tin nhắn chào mừng (vào kênh `#chao-mung` hoặc DM cho thành viên).
  - Embed: Chào mừng gia nhập Trung tâm Mỹ thuật & Luyện vẽ.
  - ActionRow:
    - Button `📖 Cẩm nang học vẽ` (Trigger action hiển thị cẩm nang)
    - Button `🔗 Liên kết tài khoản` (Link về trang cá nhân web)
    - Button `🔊 Vào phòng học` (Link chuyển vào khu vực học tập)

---

## PHẦN 4: KẾ HOẠCH PHÂN CHIA NHIỆM VỤ (WORKER & TESTER)

| Bước | Nhiệm vụ | Vai trò phụ trách | Output kiểm tra |
|---|---|---|---|
| **1** | Cập nhật Types, Calendar, Classes, Dashboard Student/Teacher sang Link Discord Room | WORKER | Build pass, giao diện hiển thị đúng nhãn Discord, không còn chữ Google Meet |
| **2** | Cập nhật API route `/api/discord/student-class` và seed data room link | WORKER | API trả về đúng lớp học của học viên qua discord_id |
| **3** | Viết các commands `/dinh-huong`, `/lop-hoc`, `/vao-hoc` và event `guildMemberAdd` | WORKER | Thư mục `discord-bot/src/commands/` và `events/` đầy đủ code |
| **4** | Cập nhật `interactionCreate.js`, `api.js`, `index.js` trong discord-bot | WORKER | Bot khởi động không lỗi cú pháp, nạp đủ 5 commands |
| **5** | Chạy kiểm thử tự động, test suite Next.js và Bot simulation | TESTER | Jest / Vitest / E2E test pass |

