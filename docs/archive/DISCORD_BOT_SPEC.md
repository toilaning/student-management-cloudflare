# ĐẶC TẢ KỸ THUẬT CHI TIẾT - GIAI ĐOẠN 3: DISCORD BOT INTEGRATION
**Dự án:** Student Management System  
**Module:** Discord Bot & Web API Integration  
**Phiên bản đặc tả:** 1.0.0  
**Tác giả:** MANAGER (Role: ag/gemini-3.8-flash-medium)  
**Tình trạng:** Sẵn sàng chuyển giao cho WORKER triển khai  

---

## 1. TỔNG QUAN HỆ THỐNG & KIẾN TRÚC MÔ-ĐUN

Discord Bot là cầu nối tương tác thời gian thực giữa lớp học trực tuyến trên Discord Server và Hệ thống Quản lý Học sinh (Next.js Dashboard + Database).

### 1.1 Cấu trúc Thư mục `discord-bot/`
Thư mục bot được đặt độc lập tại root dự án `/Users/toilaning/projects/student-management/discord-bot/` để có thể chạy độc lập dưới dạng tiến trình nền (PM2 / Node.js worker) hoặc tích hợp qua npm script của root:

```text
student-management/
├── discord-bot/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── diemdanh-voice.js      # Slash command: Điểm danh Voice tự động
│   │   │   └── mo-diemdanh.js         # Slash command: Nút bấm Điểm danh 1-Click
│   │   ├── events/
│   │   │   ├── interactionCreate.js   # Bắt button click, modal, slash command
│   │   │   ├── messageCreate.js       # Bắt nộp bài vẽ tại kênh #nop-bai-tap
│   │   │   └── ready.js               # Khởi động bot, đồng bộ slash commands
│   │   ├── crons/
│   │   │   └── deadline-reminder.js   # Tự động quét và nhắc deadline theo giờ
│   │   ├── services/
│   │   │   └── api-client.js          # HTTP Client giao tiếp với Next.js Web API
│   │   ├── config.js                  # Cấu hình nạp từ biến môi trường
│   │   └── index.js                   # Điểm khởi chạy chính (Client initialization)
│   ├── .env.example                   # Biến môi trường mẫu cho bot
│   ├── package.json                   # Dependencies & Scripts riêng cho bot
│   └── README.md                      # Hướng dẫn cài đặt & vận hành Bot
├── src/
│   └── app/
│       └── api/
│           └── discord/
│               ├── attendance/route.ts        # Web API nhận batch checkin từ Bot
│               ├── homework-submit/route.ts   # Web API nhận bài nộp ảnh từ Bot
│               └── pending-tasks/route.ts     # Web API cung cấp danh sách deadline
```

### 1.2 Cấu hình Môi trường `.env` (`discord-bot/.env`)
```ini
# Discord Application Credentials
DISCORD_BOT_TOKEN="your_discord_bot_token_here"
DISCORD_CLIENT_ID="your_discord_client_id_here"
DISCORD_GUILD_ID="your_discord_guild_id_here"

# Web API Backend Endpoint
WEB_API_URL="http://localhost:3000"
DISCORD_API_SECRET="your_shared_secret_key_between_bot_and_web_api"

# Channel IDs Configuration
DISCORD_SUBMISSION_CHANNEL_ID="channel_id_nop_bai_tap"
DISCORD_REMINDER_CHANNEL_ID="channel_id_thong_bao_deadline"

# Bot Settings
TIMEZONE="Asia/Ho_Chi_Minh"
```

### 1.3 `discord-bot/package.json`
```json
{
  "name": "student-management-discord-bot",
  "version": "1.0.0",
  "description": "Discord Bot Integration for Student Attendance, Art Submissions, and Deadline Reminders",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "deploy-commands": "node src/deploy-commands.js"
  },
  "dependencies": {
    "discord.js": "^14.18.0",
    "dotenv": "^16.4.7",
    "node-cron": "^3.0.3"
  }
}
```

Script chạy bot độc lập từ thư mục gốc của dự án:
- Root `package.json` thêm script: `"bot:start": "node discord-bot/src/index.js"`, `"bot:dev": "node --watch discord-bot/src/index.js"`.

---

## 2. CHI TIẾT CÁC TÍNH NĂNG DISCORD BOT

### 2.1 Tính năng 1: Điểm danh Voice tự động (`/diemdanh-voice ca_id:...`)
- **Lệnh Slash Command**: `/diemdanh-voice [ca_id]`
  - Tham số `ca_id` (Bắt buộc): Mã hoặc ID của ca học hiện tại.
- **Quy trình xử lý**:
  1. Người thực hiện lệnh (Giảng viên / Trợ giảng) phải đang ở trong một Voice Channel, hoặc Bot sẽ quét Voice Channel mà người gọi lệnh đang kết nối.
  2. Bot lấy danh sách tất cả các member đang có mặt trong Voice Channel (lấy mảng `discord_id`, `tag`, `displayName`).
  3. Lấy mốc thời gian quét chính xác theo format: `YYYY-MM-DD HH:mm:ss` (múi giờ `Asia/Ho_Chi_Minh`).
  4. Bot gọi Web API:
     - Method: `POST`
     - URL: `${WEB_API_URL}/api/discord/attendance`
     - Headers: `Authorization: Bearer ${DISCORD_API_SECRET}`, `Content-Type: application/json`
     - Payload:
       ```json
       {
         "ca_id": "CA_20260920_01",
         "checkin_time": "2026-09-20 20:30:00",
         "method": "BOT_VOICE",
         "present_discord_ids": ["123456789012345678", "987654321098765432"]
       }
       ```
  5. Web API đối chiếu `discord_id` với bảng học sinh thuộc ca học, ghi nhận trạng thái:
     - Có mặt (`status: 'CO_MAT'`, `checkin_time: "..."`, `method: 'BOT'`).
     - Vắng mặt (`status: 'VANG'`, `method: 'BOT'`).
  6. Bot nhận response từ Web API và phản hồi Discord Embed:
     - Tiêu đề: `📋 KẾT QUẢ ĐIỂM DANH VOICE - CA HỌC: [ca_id]`
     - Trường `Có mặt (X)`: Danh sách tên học sinh (tag Discord).
     - Trường `Vắng mặt (Y)`: Danh sách học sinh chưa có mặt.
     - Thời gian ghi nhận: `2026-09-20 20:30:00`.

---

### 2.2 Tính năng 2: Nút bấm Điểm danh 1-Click (`/mo-diemdanh ca_id:... phut:15`)
- **Lệnh Slash Command**: `/mo-diemdanh [ca_id] [phut]`
  - Tham số: `ca_id` (String, Bắt buộc), `phut` (Integer, Mặc định 15 phút).
- **Quy trình xử lý**:
  1. Bot gửi tin nhắn công khai vào Text Channel lớp học đính kèm một `ActionRowBuilder` chứa Button:
     - Label: `✅ Điểm Danh Ca Học`
     - Style: `ButtonStyle.Success`
     - CustomId: `btn_checkin_${ca_id}_${expiredAtTimestamp}`
  2. Embed thông báo:
     - *"Phiên điểm danh cho Ca học **[ca_id]** đã mở! Vui lòng bấm nút bên dưới để điểm danh trong vòng [phut] phút."*
  3. Xử lý sự kiện tương tác (`interactionCreate` - Button Click):
     - Kiểm tra nếu thời gian hiện tại > `expiredAtTimestamp`: Phản hồi ephemeral: *"❌ Phiên điểm danh này đã kết thúc!"*.
     - Lấy `discord_id = interaction.user.id`, `discord_username = interaction.user.tag`.
     - Gọi Web API:
       - Method: `POST`
       - URL: `${WEB_API_URL}/api/discord/attendance/single`
       - Payload:
         ```json
         {
           "ca_id": "CA_20260920_01",
           "discord_id": "123456789012345678",
           "checkin_time": "2026-09-20 20:32:15",
           "method": "BOT_BUTTON"
         }
         ```
     - Kết quả từ Web API:
       - Nếu thành công: Trả về Ephemeral reply (chỉ học sinh thấy):  
         *"✅ Bạn đã điểm danh thành công lúc **20:32:15**!"*
       - Nếu đã điểm danh trước đó:  
         *"ℹ️ Bạn đã điểm danh ca này rồi lúc **20:30:10**."*
       - Nếu chưa liên kết tài khoản:  
         *"⚠️ Tài khoản Discord của bạn chưa được liên kết với hồ sơ học sinh. Vui lòng liên hệ giảng viên!"*

---

### 2.3 Tính năng 3: Nhận bài vẽ tại kênh `#nop-bai-tap`
- **Sự kiện bắt**: `messageCreate`
- **Điều kiện kích hoạt**:
  1. Tin nhắn được gửi trong kênh cấu hình (`DISCORD_SUBMISSION_CHANNEL_ID` hoặc tên kênh chứa `nop-bai-tap`).
  2. Người gửi không phải là Bot (`!message.author.bot`).
  3. Tin nhắn có đính kèm file ảnh (`message.attachments.some(att => att.contentType?.startsWith('image/'))`).
- **Quy trình xử lý**:
  1. Lấy `discord_id = message.author.id`, `discord_username = message.author.tag`.
  2. Lấy link tin nhắn Discord: `messageUrl = message.url`.
  3. Lấy danh sách link ảnh đính kèm: `imageUrls = message.attachments.map(att => att.url)`.
  4. Lấy nội dung ghi chú/mã bài tập từ text của tin nhắn (nếu có regex tìm task id, hoặc mặc định tìm task bài tập đang mở gần nhất của lớp học viên).
  5. Gọi Web API:
     - Method: `POST`
     - URL: `${WEB_API_URL}/api/discord/homework-submit`
     - Headers: `Authorization: Bearer ${DISCORD_API_SECRET}`
     - Payload:
       ```json
       {
         "discord_id": "123456789012345678",
         "message_url": "https://discord.com/channels/123/456/789",
         "image_urls": ["https://cdn.discordapp.com/attachments/.../art.png"],
         "content": "Bài tập phối màu buổi 3",
         "submitted_at": "2026-09-20 20:35:00"
       }
       ```
  6. Web API tìm học sinh qua `discord_id`, xác định bài tập đang hạn nộp, tạo/cập nhật bản ghi nộp bài với `status: 'DA_NOP'`, `submitted_at: now`, `discord_message_url: message_url`.
  7. Bot thả reaction `🎨` và `✅` vào tin nhắn của học sinh, đồng thời reply lại tin nhắn:
     - *"🎨 Đã nhận bài vẽ của bạn <@123456789012345678> cho bài tập **[Tên bài]**! Trạng thái trên Web Dashboard đã được cập nhật thành **ĐÃ NỘP** ✅."*

---

### 2.4 Tính năng 4: Tự động nhắc Deadline (Auto-Reminder Cron)
- **Cơ chế**: Sử dụng `node-cron` chạy định kỳ mỗi 60 phút (hoặc lúc 09:00 và 20:00 hàng ngày, cấu hình trong crons).
- **Quy trình xử lý**:
  1. Định kỳ kích hoạt cron job `deadline-reminder.js`.
  2. Bot gọi Web API:
     - Method: `GET`
     - URL: `${WEB_API_URL}/api/discord/pending-tasks?hours=24`
     - Headers: `Authorization: Bearer ${DISCORD_API_SECRET}`
  3. API trả về danh sách các bài tập còn hạn trong 24h hoặc 4h, kèm danh sách học sinh chưa nộp (`CHUA_NOP`) có `discord_id`.
  4. Phân loại mức độ khẩn cấp:
     - **Sắp hết hạn trong 24h**: Gửi thông báo nhắc nhở chuẩn.
     - **Khẩn cấp (< 4h)**: Gửi cảnh báo khẩn cấp (màu đỏ).
  5. Bot gửi Embed thông báo đến kênh `DISCORD_REMINDER_CHANNEL_ID`:
     - Tiêu đề: `⏰ NHẮC NHỞ HẠN CHÓT NỘP BÀI TẬP!`
     - Tên bài tập: `[Tên bài tập]` - Hạn nộp: `HH:mm DD/MM/YYYY`
     - Danh sách học sinh chưa nộp: Tag trực tiếp `<@discord_id_1>`, `<@discord_id_2>`, ...
     - Lời dặn: *"Các bạn vui lòng đăng ảnh bài vẽ vào kênh <#kênh_nộp_bài> trước thời hạn để được tính điểm danh và nhận xét chuyên môn nhé!"*

---

## 3. THIẾT KẾ BACKEND API TRÊN NEXT.JS (`src/app/api/discord/`)

Tất cả các endpoint Discord API đều được bảo vệ bằng middleware kiểm tra Header:
`Authorization: Bearer <DISCORD_API_SECRET>`. Nếu không khớp, trả về HTTP 401 Unauthorized.

### 3.1 `POST /api/discord/attendance` (Batch check-in từ voice)
- **Input**:
  ```json
  {
    "ca_id": "string",
    "checkin_time": "string (YYYY-MM-DD HH:mm:ss)",
    "method": "BOT_VOICE",
    "present_discord_ids": ["string"]
  }
  ```
- **Logic xử lý**:
  - Truy vấn danh sách học sinh đã đăng ký `ca_id`.
  - Đối chiếu các học sinh có `discord_id` nằm trong `present_discord_ids` => set `status: 'CO_MAT'`, `checkin_time`, `method: 'BOT'`.
  - Các học sinh còn lại không có mặt => set `status: 'VANG'`.
  - Upsert vào bảng `attendance` (hoặc Sheets/Supabase repository hiện tại).
- **Output**:
  ```json
  {
    "success": true,
    "ca_id": "CA_20260920_01",
    "total": 15,
    "present_count": 12,
    "absent_count": 3,
    "present_students": [{ "name": "Nguyễn Văn A", "discord_id": "..." }],
    "absent_students": [{ "name": "Trần Thị B", "discord_id": "..." }]
  }
  ```

### 3.2 `POST /api/discord/attendance/single` (Check-in qua Button 1-Click)
- **Input**:
  ```json
  {
    "ca_id": "string",
    "discord_id": "string",
    "checkin_time": "string",
    "method": "BOT_BUTTON"
  }
  ```
- **Logic xử lý**:
  - Tìm học sinh theo `discord_id`. Nếu không tìm thấy => return 404 (Chưa liên kết).
  - Kiểm tra xem đã có bản ghi điểm danh cho học sinh ở `ca_id` này chưa.
  - Cập nhật điểm danh với `status: 'CO_MAT'`, `checkin_time`, `method: 'BOT'`.
- **Output**:
  ```json
  {
    "success": true,
    "message": "Điểm danh thành công",
    "student_name": "Nguyễn Văn A",
    "checkin_time": "2026-09-20 20:32:15"
  }
  ```

### 3.3 `POST /api/discord/homework-submit` (Ghi nhận nộp bài tập ảnh)
- **Input**:
  ```json
  {
    "discord_id": "string",
    "message_url": "string",
    "image_urls": ["string"],
    "content": "string",
    "submitted_at": "string"
  }
  ```
- **Logic xử lý**:
  - Tìm học sinh sở hữu `discord_id`.
  - Tìm bài tập (`task`) gần nhất đang mở hoặc đối chiếu theo tiêu đề trong `content`.
  - Tạo hoặc cập nhật bản ghi trong `homework_submissions`:
    - `student_id`: id học sinh
    - `task_id`: id bài tập
    - `status`: `'DA_NOP'`
    - `submission_url`: link ảnh đầu tiên hoặc chuỗi JSON link ảnh
    - `discord_message_url`: `message_url`
    - `submitted_at`: thời điểm gửi
- **Output**:
  ```json
  {
    "success": true,
    "task_title": "Bài vẽ tĩnh vật số 3",
    "student_name": "Nguyễn Văn A"
  }
  ```

### 3.4 `GET /api/discord/pending-tasks` (Lấy deadline cần nhắc nhở)
- **Query Params**: `hours=24`
- **Logic xử lý**:
  - Lấy các tasks có `deadline` trong khoảng `[now, now + hours]`.
  - Lấy danh sách học sinh chưa có submission hoặc `status == 'CHUA_NOP'`.
  - Chỉ lọc những học sinh đã có `discord_id`.
- **Output**:
  ```json
  {
    "tasks": [
      {
        "task_id": "TASK_01",
        "task_title": "Phác thảo dáng người",
        "deadline": "2026-09-21 18:00:00",
        "hours_left": 21.5,
        "pending_students": [
          { "student_id": "HS01", "student_name": "Lê Văn C", "discord_id": "1122334455" }
        ]
      }
    ]
  }
  ```

### 3.5 Mở rộng Dữ liệu Học sinh (Liên kết Discord)
Bổ sung các trường vào Schema học sinh (trong Type Definition & DB/Sheets):
- `discord_id`: string | null (ID Discord dạng số tuyết đối, ví dụ: `"4129849182391283"`)
- `discord_username`: string | null (Username/Tag, ví dụ: `"art_student#1234"` hoặc `"art_student"`)
- Form chỉnh sửa học sinh trên Next.js Dashboard có thêm 2 input để Giảng viên/Admin nhập hoặc cho phép học sinh tự gán.

---

## 4. KẾ HOẠCH BÀN GIAO CHO WORKER & TESTER

### 4.1 Phạm vi công việc của WORKER:
1. Tạo thư mục `discord-bot/` với đầy đủ `package.json`, `.env.example`, và mã nguồn module ES Modules.
2. Cài đặt các Slash Command `/diemdanh-voice` và `/mo-diemdanh` với Discord.js v14.
3. Cài đặt Event Listener `messageCreate` để nhận ảnh bài tập vẽ tại kênh quy định.
4. Cài đặt Cron Job nhắc nhở hạn nộp bài tập.
5. Tạo các API Route Backend trong Next.js tại `src/app/api/discord/*` có xác thực Token bí mật (`DISCORD_API_SECRET`).
6. Thêm script chạy bot vào `package.json` của root dự án.

### 4.2 Kế hoạch Kiểm thử của TESTER:
1. Kiểm tra unit test và mock HTTP call giữa Bot và Web API.
2. Kiểm tra xác thực token API `DISCORD_API_SECRET` (trả về 401 khi sai token).
3. Kiểm tra logic xử lý thời gian điểm danh định dạng `YYYY-MM-DD HH:mm:ss`.
4. Kiểm thử luồng điểm danh Voice và nút bấm 1-Click khi học sinh bấm nhiều lần (chống trùng lặp).
5. Kiểm thử định dạng ảnh nộp bài và phản hồi tin nhắn gắn tag học sinh.
