# ĐẶC TẢ KỸ THUẬT & KẾ HOẠCH TRIỂN KHAI: TỰ ĐỘNG GẠCH NỢ NGÂN HÀNG, TRANG HƯỚNG DẪN ADMIN & E2E HEALTH CHECK

**Tài liệu:** PAYMENT_AND_ADMIN_GUIDES_SPEC.md  
**Dự án:** Hệ thống Quản lý Đào tạo & Điểm danh Trung tâm (EduLocal)  
**Vai trò lập kế hoạch:** MANAGER (`ag/gemini-3.8-flash-medium`)  
**Đối tượng thực thi:** WORKER (`ag/gemini-3.8-flash-high`) -> TESTER (`ag/gemini-3.8-flash-low`)  
**Ngày lập:** 21/09/2026  
**Trạng thái:** Sẵn sàng thực thi (Ready for Implementation)

---

## 1. TỔNG QUAN YÊU CẦU & MỤC TIÊU

Hệ thống cần bổ sung 3 phân hệ cốt lõi nhằm hoàn thiện chu trình vận hành tự động và hỗ trợ người quản trị:
1. **Module Tự động hóa Thanh toán & Gạch nợ Ngân hàng (Bank Auto Reconciliation):** Tích hợp chuẩn VietQR và xử lý Webhook biến động số dư (SePay/Casso/Bank Open API) để gạch nợ học phí theo thời gian thực khi sinh viên chuyển khoản kèm cú pháp quy ước (Mã SV hoặc Mã Hóa đơn). Kèm bộ giả lập Webhook Simulator để kiểm thử trực quan trên giao diện Admin.
2. **Trang Hướng dẫn Tích hợp & Vận hành (`/admin/guides`):** Bổ sung menu điều hướng và giao diện trực quan hướng dẫn Admin:
   - Cấu hình Ngân hàng & thiết lập Webhook gạch nợ.
   - Khởi tạo, cấp quyền, cấu hình biến môi trường và hướng dẫn vận hành Discord Bot (6 lệnh Slash & kênh nộp bài tập).
3. **Kế hoạch Kiểm thử Toàn diện (E2E Health Check):** Rà soát toàn bộ các phân hệ chính (Auth, Điểm danh, Bài tập & Deadline, Discord API, Webhook Ngân hàng), mở rộng bộ test tự động từ 58 tests lên trên 65+ tests đạt 100% tỷ lệ pass.

---

## 2. PHÂN HỆ 1: LIÊN KẾT NGÂN HÀNG & TỰ ĐỘNG GẠCH NỢ (BANK AUTO RECONCILIATION)

### 2.1. Phân tích giải pháp kết nối Ngân hàng tại Việt Nam
- **Chuẩn VietQR (NAPAS 247):** Tạo mã QR động hoặc tĩnh chứa thông tin thụ hưởng (`bankBin`, `accountNumber`, `amount`, `description`).
  - Định dạng link sinh ảnh VietQR nhanh: `https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>`
- **Giải pháp Webhook biến động số dư:**
  - Sử dụng cổng trung gian Gateway chuyên dụng tại VN như **SePay** hoặc **Casso**:
    - Ngân hàng kích hoạt thông báo biến động qua App/SMS -> SePay/Casso bắt tín hiệu -> Bắn Webhook HTTP POST về server trường học trong vòng 1-3 giây.
    - Không yêu cầu giấy phép trung gian thanh toán phức tạp, chi phí tối ưu, độ trễ cực thấp.
  - Hỗ trợ cấu hình `BANK_WEBHOOK_API_KEY` (hoặc SePay Bearer Token) trong Header `Authorization: Apikey <API_KEY>` để xác thực request hợp lệ.

### 2.2. Luồng nghiệp vụ Tự động Gạch nợ (Auto Reconciliation Pipeline)
1. **Sinh mã chuyển khoản & Cú pháp quy ước:**
   - Khi học sinh mở trang Học phí hoặc Admin xuất hóa đơn, hệ thống cung cấp mã QR và cú pháp chuyển khoản chuẩn:
     - Dạng 1 (Theo Hóa đơn): `INV <Mã_Hóa_Đơn>` hoặc `TUI <Mã_Hóa_Đơn>` (Ví dụ: `INV TUI001` hoặc `TUI001`).
     - Dạng 2 (Theo Học viên): `ST <Mã_Học_Viên>` (Ví dụ: `ST001`).
2. **Tiếp nhận Webhook (`POST /api/payment/webhook`):**
   - **Endpoint:** `POST /api/payment/webhook`
   - **Xác thực bảo mật:**
     - Kiểm tra header `Authorization` hoặc `x-api-key` khớp với `BANK_WEBHOOK_API_KEY` trong settings/environment (nếu có cấu hình).
   - **Payload chuẩn hóa (Chuẩn SePay / Casso tương thích):**
     ```json
     {
       "id": 123456,
       "gateway": "Vietcombank",
       "transactionDate": "2026-09-21 08:30:00",
       "accountNumber": "9876543210",
       "code": null,
       "content": "ST001 chuyen tien hoc phi TUI001",
       "transferType": "in",
       "transferAmount": 1500000,
       "accumulated": 50000000,
       "subAccount": null,
       "referenceCode": "MBVCB.123456789",
       "description": "ST001 chuyen tien hoc phi TUI001"
     }
     ```
3. **Cơ chế Đối soát & Gạch nợ:**
   - Bước 1: Trích xuất chuỗi nội dung (`content` hoặc `description`).
   - Bước 2: Regex nhận diện Mã hóa đơn (`TUI[0-9]+` hoặc `INV[0-9]+`) hoặc Mã sinh viên (`ST[0-9]+`).
   - Bước 3: 
     - *Trường hợp tìm thấy Mã Hóa đơn:* Tìm kiếm `TuitionInvoice` theo ID.
       - Cập nhật `paidAmount = paidAmount + transferAmount`.
       - Cập nhật `remainingAmount = max(0, amount - paidAmount)`.
       - Cập nhật `status = remainingAmount === 0 ? 'Đã nộp' : 'Còn nợ'`.
       - Cập nhật `transactionCode = referenceCode || id`.
       - Cập nhật `paymentMethod = 'Chuyển khoản QR'`.
       - Cập nhật `paidDate = YYYY-MM-DD`.
     - *Trường hợp chỉ có Mã Sinh viên:*
       - Lấy danh sách hóa đơn còn nợ của sinh viên, sắp xếp theo hóa đơn cũ nhất (FIFO).
       - Khấu trừ lần lượt số tiền chuyển vào từng hóa đơn cho đến khi hết số tiền nhận được.
   - Bước 4: **Ghi Audit Log:**
     - Action: `GẠCH_NỢ_TỰ_ĐỘNG`
     - PerformedBy: `SYSTEM_BANK_WEBHOOK`
     - Details: Ghi nhận số tiền nhận, mã giao dịch, các hóa đơn đã được gạch nợ.

### 2.3. Công cụ Giả lập Webhook (Bank Webhook Simulator / Test Trigger)
- **Vị trí UI:** Được nhúng trực tiếp trong trang Quản lý Công nợ (`/admin/tuition`) hoặc một tab/modal riêng "Giả lập Ngân hàng (Webhook Tester)".
- **Các trường input giả lập:**
  - Hóa đơn mục tiêu (Dropdown chọn từ danh sách hóa đơn còn nợ) hoặc Nhập tự do Mã SV / Mã Hóa đơn.
  - Số tiền chuyển (VNĐ) - Tự động điền số tiền còn nợ của hóa đơn.
  - Ngân hàng chuyển (MBBank, Vietcombank, Techcombank, VPBank, ACB).
  - Cú pháp nội dung chuyển khoản (tự sinh gợi ý `ST001 nop hoc phi TUI001`).
  - Mã tham chiếu giao dịch (Auto-generate mã random).
- **Hành động:** Nút "Bắn Webhook Test (Trigger Webhook)" -> Gửi request nội bộ `POST /api/payment/webhook` -> Hiển thị kết quả toast thông báo gạch nợ thành công + reload danh sách hóa đơn tức thì.

---

## 3. PHÂN HỆ 2: TRANG HƯỚNG DẪN TRÊN ADMIN PANEL (`/admin/guides`)

### 3.1. Cấu hình Điều hướng (Navigation)
- Sửa `src/components/common/Sidebar.tsx`:
  - Import icon `HelpCircle` (hoặc `BookOpenCheck`) từ `lucide-react`.
  - Thêm mục vào mảng `adminNav`:
    ```typescript
    { label: 'Hướng dẫn tích hợp', href: '/admin/guides', icon: HelpCircle }
    ```

### 3.2. Cấu trúc Trang `/admin/guides`
Tạo file `src/app/admin/guides/page.tsx` với giao diện trực quan chia làm 2 tab hoặc 2 Section lớn:

#### Section 1: Hướng dẫn cấu hình & liên kết Ngân hàng
1. **Thông tin tài khoản VietQR:**
   - Hướng dẫn nhập thông tin ngân hàng trung tâm: Mã ngân hàng (BIN/Tên rút gọn như VCB, MB, TCB), Số tài khoản, Tên chủ tài khoản in hoa không dấu.
   - Hướng dẫn sinh mã QR chuẩn VietQR động theo từng học viên / hóa đơn.
2. **Cấu hình Webhook Tự động gạch nợ (SePay / Casso / Napas):**
   - Hướng dẫn đăng ký tài khoản tại dịch vụ đối tác (SePay.vn hoặc Casso.vn).
   - Thiết lập Webhook URL trên portal của đối tác trỏ về:
     `https://<ten-mien-trung-tam>/api/payment/webhook`
   - Cấu hình API Key (Bearer Token) để bảo vệ endpoint.
   - Bảng quy tắc cú pháp nội dung chuyển khoản chuẩn cho học sinh:
     - `ST001` (Gạch nợ tự động theo thứ tự hóa đơn tồn đọng).
     - `TUI001` (Gạch nợ chính xác hóa đơn TUI001).

#### Section 2: Hướng dẫn Cài đặt & Sử dụng Discord Bot
1. **Bước 1: Khởi tạo Bot trên Discord Developer Portal:**
   - Truy cập `https://discord.com/developers/applications` -> Create Application.
   - Mục **Bot**: Tạo Bot User, kích hoạt 3 Privileged Gateway Intents:
     * `Presence Intent`
     * `Server Members Intent`
     * `Message Content Intent`
2. **Bước 2: Tạo link OAuth2 mời Bot vào Server lớp học:**
   - Vào tab **OAuth2** -> **URL Generator**.
   - Chọn Scopes: `bot`, `applications.commands`.
   - Chọn Bot Permissions: `Administrator` hoặc tối thiểu (`Manage Channels`, `Send Messages`, `Read Message History`, `Connect`, `Mute Members`).
3. **Bước 3: Cấu hình biến môi trường (`discord-bot/.env`):**
   - Hướng dẫn copy `.env.example` thành `.env` với các biến:
     ```env
     DISCORD_BOT_TOKEN=MTIz...
     DISCORD_CLIENT_ID=123456789...
     DISCORD_GUILD_ID=987654321...
     BACKEND_API_URL=http://localhost:3000/api
     ```
4. **Bước 4: Khởi chạy Bot & Bảng Hướng dẫn 6 Lệnh Slash:**
   - Lệnh chạy bot: `npm run bot:start` (hoặc `npm run bot:dev`).
   - Bảng hướng dẫn chi tiết 6 lệnh Slash Commands:
     | Lệnh Slash | Mục đích | Quyền thực hiện | Hướng dẫn sử dụng |
     | :--- | :--- | :--- | :--- |
     | `/mo-diemdanh` | Mở phiên điểm danh lớp | Giảng viên, Admin | Chọn lớp & ca học, bot mở phiên điểm danh kèm đếm ngược |
     | `/diemdanh-voice`| Điểm danh tự động qua Voice Channel | Giảng viên, Admin | Bot quét các thành viên đang có mặt trong kênh thoại phòng học |
     | `/vao-hoc` | Học sinh check-in vào lớp | Học sinh | Bấm nút hoặc gõ lệnh để check-in ca học hiện tại |
     | `/lop-hoc` | Tra cứu thông tin lớp học | Tất cả | Hiển thị sĩ số, giáo viên, lịch học và link tài liệu |
     | `/dinh-huong` | Hướng dẫn tân sinh viên / Quy chế | Tất cả | Cung cấp link portal, nội quy điểm danh, quy định nộp học phí |
     | `/huong-dan` | Danh mục trợ giúp lệnh bot | Tất cả | Hiển thị hướng dẫn đầy đủ các tính năng bot |
   - **Quy trình nộp bài tập tại kênh `#nop-bai-tap`:**
     - Học sinh gửi link bài tập (GitHub/Google Drive/Figma) kèm mã bài tập (ví dụ: `HW001`) tại channel `#nop-bai-tap`.
     - Discord Bot tự động lắng nghe, parse cú pháp, gọi API `POST /api/homework/submit` và gửi tin nhắn phản hồi xác nhận nộp bài thành công kèm thời gian nộp.

---

## 4. PHÂN HỆ 3: KẾ HOẠCH KIỂM THỬ TOÀN DIỆN (E2E HEALTH CHECK)

### 4.1. Danh mục các phân hệ cần xác minh (Verification Matrix)
1. **Phân hệ Auth & Phân quyền RBAC:**
   - Đăng nhập hợp lệ cho Admin (`admin@edulocal.vn`), Teacher (`teacher@edulocal.vn`), Student (`student@edulocal.vn`).
   - Ngăn chặn truy cập trái phép chéo giữa các vai trò.
2. **Phân hệ Điểm danh & Điểm danh bù:**
   - Điểm danh ca học thông thường, ghi nhận phương thức (`QR`, `MANUAL`, `DISCORD_VOICE`).
   - Điểm danh bù: lưu trữ `originalSlotId`, `makeupReason`, cập nhật trạng thái hợp lệ.
3. **Phân hệ Giao bài tập & Deadline Dashboard:**
   - Tạo bài tập mới, giao theo lớp, tính toán trạng thái hạn chót (`Đang mở`, `Sắp hết hạn`, `Đã đóng`).
   - Học sinh nộp bài tập, giáo viên chấm điểm và nhận xét.
4. **Phân hệ Tích hợp Discord Bot:**
   - Các endpoints API phục vụ bot: lấy danh sách học viên, ca học hôm nay, điểm danh voice, nộp bài tập.
5. **Phân hệ Tự động Gạch nợ Ngân hàng (Mới):**
   - Webhook `POST /api/payment/webhook` xử lý chuẩn xác cho cả cú pháp theo Mã Hóa đơn và Mã SV.
   - Đối chiếu số tiền, cập nhật trạng thái hóa đơn sang `Đã nộp`, giảm công nợ học sinh.
   - Ghi Audit Log tự động.

### 4.2. Kế hoạch mở rộng Bộ Test Tự Động (Target: 65+ tests, hiện tại: 58 tests)
Tạo file test mới: `tests/payment-webhook-and-guides.test.ts` bổ sung tối thiểu 8-10 tests kiểm tra chuyên sâu:
1. `Test 1`: Kiểm tra API `POST /api/payment/webhook` từ chối nếu không đúng định dạng dữ liệu.
2. `Test 2`: Gạch nợ chính xác hóa đơn qua cú pháp Mã Hóa đơn (`TUI001`).
3. `Test 3`: Gạch nợ tự động theo Mã Sinh viên (`ST001`) với cơ chế phân bổ vào hóa đơn chưa nộp cũ nhất.
4. `Test 4`: Xử lý thanh toán một phần (Partial Payment) - cập nhật số tiền còn lại và giữ trạng thái `Còn nợ`.
5. `Test 5`: Xử lý thanh toán đủ (Full Payment) - cập nhật trạng thái `Đã nộp` và lưu mã giao dịch ngân hàng.
6. `Test 6`: Kiểm tra tự động ghi nhận Audit Log với action `GẠCH_NỢ_TỰ_ĐỘNG` khi webhook thực thi.
7. `Test 7`: Kiểm tra dữ liệu hướng dẫn ngân hàng & Discord Bot tại route `/admin/guides` đảm bảo đầy đủ 6 lệnh slash và quy chế nộp bài.
8. `Test 8`: Kiểm tra tính toàn vẹn của menu điều hướng Admin Sidebar bao gồm item `/admin/guides`.

---

## 5. PHÂN RÃ NHIỆM VỤ CHI TIẾT CHO WORKER (`ag/gemini-3.8-flash-high`)

### Task 1: Xây dựng Backend Webhook gạch nợ ngân hàng
- **File cần tạo:** `src/app/api/payment/webhook/route.ts`
- **Nhiệm vụ:**
  - Tiếp nhận POST request, parse payload (tương thích SePay / Casso).
  - Trích xuất mã hóa đơn hoặc mã học viên từ `content`/`description`.
  - Gọi Repository để tìm hóa đơn và cập nhật `paidAmount`, `remainingAmount`, `status = 'Đã nộp'`.
  - Ghi bản ghi Audit Log qua `AuditRepository`.
  - Trả về JSON `{ success: true, message: 'Reconciled successfully', invoiceId: '...' }`.

### Task 2: Xây dựng Bộ giả lập Webhook (Bank Webhook Simulator) trên UI Admin
- **File cập nhật/tạo:** `src/components/admin/BankWebhookSimulator.tsx` và tích hợp vào `src/app/admin/tuition/page.tsx`.
- **Nhiệm vụ:**
  - Form chọn hóa đơn còn nợ, tự động điền số tiền cần thanh toán.
  - Tự động tạo mã giao dịch mẫu và nội dung chuyển khoản.
  - Nút "Kích hoạt Webhook Test" gọi trực tiếp đến `/api/payment/webhook`.
  - Hiển thị Toast thông báo và tự động reload dữ liệu bảng công nợ.

### Task 3: Xây dựng Trang Hướng dẫn `/admin/guides` & Cập nhật Sidebar
- **File cần tạo:** `src/app/admin/guides/page.tsx`
- **File cập nhật:** `src/components/common/Sidebar.tsx`
- **Nhiệm vụ:**
  - Thêm icon `HelpCircle` và route `/admin/guides` vào Sidebar Admin.
  - Xây dựng trang Hướng dẫn chuyên nghiệp với đầy đủ 2 phần: Cấu hình Ngân hàng/Webhook và Hướng dẫn Discord Bot (bao gồm bảng 6 lệnh slash và hướng dẫn nộp bài tập kênh `#nop-bai-tap`).

### Task 4: Viết Test Suite và Chạy E2E Verification
- **File cần tạo:** `tests/payment-webhook-and-guides.test.ts`
- **Nhiệm vụ:**
  - Viết đầy đủ 8-10 tests kiểm tra logic gạch nợ, xử lý chuỗi cú pháp, audit log, và route guides.
  - Chạy `npm test` xác nhận vượt qua toàn bộ 65+ tests (0 failure).

---

## 6. LƯU Ý KỸ THUẬT & AN TOÀN HỆ THỐNG
- **Tuyệt đối tuân thủ:** KHÔNG TẠO HOẶC GÓI FILE ZIP trong toàn bộ quá trình.
- **Tính tương thích Repository:** Sử dụng `getRepository()` để đảm bảo hỗ trợ cả LocalRepository, GoogleAppsScriptRepository và SupabaseRepository.
- **Bảo toàn dữ liệu:** Mọi cập nhật trạng thái tài chính phải đảm bảo tính nhất quán (Remaining Amount không âm, cập nhật `paidDate` theo chuẩn ISO YYYY-MM-DD).
