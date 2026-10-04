# TÀI LIỆU ĐẶC TẢ KỸ THUẬT & KẾ HOẠCH KHẮC PHỤC LỖI BẢO MẬT XÁC THỰC (AUTH FIX SPEC)

- **Mức độ nghiêm trọng**: CRITICAL (Lỗ hổng xác thực - Authentication Bypass)
- **Role chuẩn bị**: MANAGER (`ag/gemini-3.8-flash-medium`)
- **Đối tượng bàn giao**: WORKER (`code_worker` / `ag/gemini-3.8-flash-high`)
- **Dự án**: `/Users/toilaning/projects/student-management` (macOS host)

---

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

Qua rà soát toàn bộ luồng đăng nhập và xác thực của hệ thống:

1. **Frontend `src/app/login/page.tsx` hoàn toàn bỏ qua mật khẩu**:
   - Trong hàm `handleSubmit(e)`:
     ```typescript
     const cleanUsername = username.trim().toUpperCase();
     const user = availableUsers.find(u => u.username.toUpperCase() === cleanUsername || u.id.toUpperCase() === cleanUsername);
     if (!user) {
       setError('Tài khoản không tồn tại. Bạn có thể dùng các tài khoản mẫu bên dưới.');
       return;
     }
     setCurrentUser(user); // ĐĂNG NHẬP THÀNH CÔNG MÀ KHÔNG HỀ ĐỐI SOÁT PASSWORD!
     ```
   - Biến `password` được nhập từ form nhưng **không được gửi đi kiểm tra, không so khớp hash, không gọi API xác thực**. Bất kỳ mật khẩu nào (kể cả để trống hoặc gõ bừa) đều được cho qua nếu `username` trùng khớp.
   - Nút `1-Click Quick Login` tự tạo đối tượng User giả lập hoặc gán trực tiếp user vào `setCurrentUser` mà không qua xác thực chuẩn.

2. **Thiếu Endpoint xác thực độc lập `/api/auth/login`**:
   - Hiện tại chưa có route API chuyên trách cho Authentication (`/api/auth/login`).
   - Frontend lấy danh sách `availableUsers` qua `GET /api/users` (API này expose danh sách người dùng nhưng không cho phép đối soát mật khẩu an toàn vì lý do bảo mật không được trả `passwordHash` ra client).

3. **Backend GAS & Repository**:
   - Trong `gas-backend/Services.gs`, hàm `sanitizeUser` đã xoá trường `passwordHash` trước khi trả về qua `UserService.getUserByUsername` và `getAllUsers`. Do đó Client không thể tự so khớp hash (và về mặt an toàn tuyệt đối không được so khớp hash ở client).
   - Đã có sẵn class `AuthService.ts` (`src/services/AuthService.ts`) với hàm `authenticate(username, passwordPlain)` sử dụng SHA-256 (`createHash('sha256')`), nhưng **chưa hề được đấu nối vào API route đăng nhập nào**.
   - Trong `GoogleAppsScriptRepository.ts`, phương thức `getUserByUsername` trả về user bị sanitize (mất `passwordHash`), nên nếu chạy qua GAS backend thì cần có method xác thực phía server hoặc lấy user có kèm credential để verify.

---

## 2. GIẢI PHÁP KỸ THUẬT & KIẾN TRÚC

### 2.1. Xây dựng Endpoint `/api/auth/login` (Server-side Authentication)
- **Phương thức**: `POST`
- **Request Body**:
  ```json
  {
    "username": "ADMIN001", // hoặc "admin"
    "password": "plain_password"
  }
  ```
- **Xử lý**:
  1. Validate `username` và `password` không được rỗng.
  2. Chuẩn hóa `username` (hỗ trợ cả username thường và mã định danh ID viết hoa như `admin`, `ADMIN001`, `GV001`, `ST001`).
  3. Lấy thông tin user kèm `passwordHash` từ repository (thông qua `repo.getUserByUsername` hoặc `repo.getUserById`).
  4. Sử dụng `AuthService` băm `password` bằng SHA-256 và so khớp với `user.passwordHash`.
  5. Nếu user không tồn tại, bị khóa (`isActive === false`), hoặc mật khẩu không khớp:
     - **Trả về HTTP 401 Unauthorized**:
       ```json
       {
         "success": false,
         "error": "Tên đăng nhập hoặc mật khẩu không chính xác"
       }
       ```
     - Tuyệt đối không để lộ việc sai tên đăng nhập hay sai mật khẩu để chống brute-force / user enumeration.
  6. Nếu xác thực thành công:
     - Ghi Audit Log hành động `LOGIN`.
     - Trả về thông tin user đã làm sạch (loại bỏ `passwordHash`):
       ```json
       {
         "success": true,
         "user": {
           "id": "...",
           "username": "...",
           "name": "...",
           "role": "...",
           "email": "...",
           "isActive": true
         },
         "message": "Đăng nhập thành công"
       }
       ```

### 2.2. Nâng cấp `src/app/login/page.tsx`
- Thay thế toàn bộ logic `handleSubmit` client-side bằng `fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })`.
- Hiển thị loading state trong lúc gửi request xác thực.
- Xử lý mã lỗi `401` và các lỗi khác, hiển thị banner thông báo lỗi màu đỏ rõ ràng: `"Tên đăng nhập hoặc mật khẩu không chính xác"`.
- Chặn form submit khi chưa nhập mật khẩu (`required`).
- Xử lý Quick Login:
  - Nếu giữ lại nút Quick Login (cho môi trường Demo / Development), nút này phải điền tự động cặp `username` / `password` tương ứng vào ô input và gọi submit qua API xác thực thật (hoặc gửi payload đăng nhập với mật khẩu mặc định của role đó: ví dụ `admin` / `admin123`, `gv001` / `teacher123`, `st001` / `student123`). Không được mock bypass trực tiếp vào context.

### 2.3. Hỗ trợ cho cả `LocalRepository` và `GoogleAppsScriptRepository` / `gas-backend`
- Đảm bảo `repo.getUserByUsername(username)` hoặc method xác thực lấy được `passwordHash` khi cần xác thực.
- Trong `gas-backend/Services.gs` và `Code.gs`:
  - Thêm action `authenticate(username, passwordHash)` trong `UserService` hoặc `AuthService` trên GAS backend để hỗ trợ xác thực trực tiếp trên Google Sheets database khi bật chế độ GAS.

---

## 3. CHECKLIST YÊU CẦU BÀN GIAO CHO WORKER

- [ ] **Task 1**: Tạo file `src/app/api/auth/login/route.ts` xử lý xác thực `username` + `password` qua `AuthService` và `repo`.
- [ ] **Task 2**: Đảm bảo repository (`LocalRepository` và `GoogleAppsScriptRepository`) cung cấp đúng `passwordHash` để verify (hoặc phương thức `verifyCredentials`).
- [ ] **Task 3**: Cập nhật `src/app/login/page.tsx` gọi API `/api/auth/login`, xử lý lỗi 401, hiển thị banner lỗi chính xác khi nhập mật khẩu sai.
- [ ] **Task 4**: Sửa đổi nút Quick Login 1-click thành cơ chế autofill credentials hợp lệ thay vì bypass auth.
- [ ] **Task 5**: Viết unit test / integration test kiểm thử xác thực:
  - Test case 1: Đăng nhập sai mật khẩu -> nhận 401 Unauthorized, không login được.
  - Test case 2: Đăng nhập đúng mật khẩu (`admin`/`admin123`) -> nhận 200 OK, trả về user profile không chứa passwordHash.
  - Test case 3: Tài khoản không tồn tại -> nhận 401 Unauthorized.
  - Test case 4: Tài khoản bị vô hiệu hóa (`isActive = false`) -> nhận 401/403.
