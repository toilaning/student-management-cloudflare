# ĐẶC TẢ KỸ THUẬT: TÍNH NĂNG XÓA TÀI KHOẢN NGƯỜI DÙNG (/admin/accounts)

## 1. Bối cảnh & Mục tiêu
Trang Quản trị Tài khoản & Phân quyền (`/admin/accounts`) hiện tại chỉ hỗ trợ:
- Lấy danh sách tài khoản (`GET /api/users`)
- Cập nhật mật khẩu / thông tin (`PUT /api/users`)
- Tạo tài khoản mới (`POST /api/users`)

Chức năng xóa tài khoản (`DELETE`) chưa có ở tầng API route và chưa có nút bấm / modal xác nhận ở tầng giao diện người dùng (UI).
Mục tiêu: Bổ sung tính năng xóa tài khoản an toàn với cơ chế bảo vệ tài khoản quản trị cốt lõi, xác nhận nhiều lớp và ghi nhận Audit Log đầy đủ.

---

## 2. Rà soát hiện trạng mã nguồn
- **Interface Repository (`src/repositories/IRepository.ts`)**:
  - Đã có khai báo: `deleteUser(id: string): Promise<boolean>;`
- **Implementation Repository**:
  - `src/repositories/LocalRepository.ts`: Đã có `deleteUser(id: string)` xóa khỏi `Map<string, User>`.
  - `src/repositories/SupabaseRepository.ts`: Đã có `deleteUser(id: string)` xóa bản ghi trong bảng `users` (`client.from('users').delete().eq('id', id)`), có fallback về `localRepo` khi lỗi.
- **API Route (`src/app/api/users/route.ts`)**:
  - Chưa có hàm `export async function DELETE(request: Request)`.
- **UI Page (`src/app/admin/accounts/page.tsx`)**:
  - Cột thao tác trong bảng mới chỉ có nút "Đổi mật khẩu".
  - Chưa có nút Xóa (`Trash2`) và chưa có Modal xác nhận xóa an toàn.

---

## 3. Nghiệp vụ & Ràng buộc an toàn (Safety Constraints)
1. **Bảo vệ tài khoản Super Admin**:
   - Tuyệt đối cấm xóa tài khoản định danh `ADMIN001` hoặc username `admin` (hoặc role `ADMIN` với id là `ADMIN001`).
   - Cả tầng Backend (API) và Frontend (UI) đều phải chặn.
2. **Không cho phép tự xóa chính mình (Self-deletion prevention)**:
   - Người dùng đang đăng nhập (`actorId` / session hiện tại) không được phép tự xóa tài khoản của mình.
   - Nếu `userId === actorId` -> Trả về lỗi 400 Bad Request: "Không thể tự xóa tài khoản đang đăng nhập của chính bạn".
3. **Kiểm tra tồn tại**:
   - Nếu `userId` không tồn tại trong hệ thống -> Trả về 404 Not Found.
4. **Ghi nhận Audit Log**:
   - Sau khi xóa thành công, bắt buộc ghi log qua `repo.addAuditLog`:
     - `action`: `'DELETE'`
     - `userId`: `actorId` (mặc định `'ADMIN001'` nếu chưa có phiên auth phức tạp)
     - `userName`: `'Quản trị viên'`
     - `userRole`: `'ADMIN'`
     - `targetResource`: `'USER_ACCOUNT'`
     - `targetId`: `userId`
     - `details`: `Xóa tài khoản người dùng [${userId}] (${user.name}) - Vai trò: ${user.role}`

---

## 4. Chi tiết triển khai Backend API (`src/app/api/users/route.ts`)

Bổ sung method `DELETE(request: Request)`:
```typescript
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('id') || searchParams.get('userId');
    let actorId = searchParams.get('actorId') || 'ADMIN001';

    // Trường hợp gửi qua JSON body
    if (!userId && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        userId = body.userId || body.id;
        actorId = body.actorId || actorId;
      } catch (e) {
        // bỏ qua lỗi parse json nếu rỗng
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu thông tin mã tài khoản (userId)' }, { status: 400 });
    }

    // 1. Chặn xóa tài khoản Super Admin mặc định
    if (userId.toUpperCase() === 'ADMIN001' || userId.toLowerCase() === 'admin') {
      return NextResponse.json(
        { error: 'Không thể xóa tài khoản Quản trị viên cấp cao (Super Admin) mặc định của hệ thống!' },
        { status: 403 }
      );
    }

    // 2. Chặn tự xóa chính mình
    if (actorId && userId.toUpperCase() === actorId.toUpperCase()) {
      return NextResponse.json(
        { error: 'Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình!' },
        { status: 400 }
      );
    }

    // 3. Kiểm tra tài khoản tồn tại
    const user = await repo.getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản người dùng cần xóa' }, { status: 404 });
    }

    // 4. Thực hiện xóa trong repo
    const success = await repo.deleteUser(userId);
    if (!success) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản từ cơ sở dữ liệu' }, { status: 500 });
    }

    // 5. Ghi nhận Audit Log
    await repo.addAuditLog({
      action: 'DELETE',
      userId: actorId,
      userName: 'Quản trị viên',
      userRole: 'ADMIN',
      targetResource: 'USER_ACCOUNT',
      targetId: userId,
      details: `Xóa tài khoản người dùng [${userId}] (${user.name}) - Vai trò: ${user.role}`,
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa thành công tài khoản ${user.name} (${userId})!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi hệ thống khi xóa tài khoản' },
      { status: 500 }
    );
  }
}
```

---

## 5. Chi tiết triển khai Frontend UI (`src/app/admin/accounts/page.tsx`)

### 5.1. Icons & State bổ sung
- Import thêm icon: `Trash2` từ `lucide-react`.
- State quản lý modal xác nhận xóa:
  - `deletingUser: User | null` (Lưu user đang được chọn để xóa)
  - `isDeleting: boolean` (Trạng thái loading khi đang gọi API DELETE)
  - `deleteError: string | null` (Thông báo lỗi nếu API trả về lỗi)

### 5.2. Nút bấm thao tác trên từng dòng Table
Tại cột `Thao tác`:
```tsx
<td className="px-4 py-3 text-right">
  <div className="flex items-center justify-end gap-1.5">
    <button
      onClick={() => {
        setEditingUser(u);
        setNewPassword('');
        setConfirmPassword('');
        setModalError(null);
      }}
      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 border border-indigo-100"
    >
      <KeyRound size={12} /> Đổi mật khẩu
    </button>

    {u.id.toUpperCase() !== 'ADMIN001' && u.username.toLowerCase() !== 'admin' ? (
      <button
        onClick={() => {
          setDeletingUser(u);
          setDeleteError(null);
        }}
        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 border border-rose-100"
        title="Xóa tài khoản"
      >
        <Trash2 size={12} /> Xóa
      </button>
    ) : (
      <button
        disabled
        className="px-2.5 py-1.5 bg-slate-100 text-slate-400 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 border border-slate-200 cursor-not-allowed opacity-60"
        title="Không thể xóa tài khoản hệ thống"
      >
        <Trash2 size={12} /> Cố định
      </button>
    )}
  </div>
</td>
```

### 5.3. Modal xác nhận xóa nguy hiểm (Confirmation Dialog)
Khi `deletingUser !== null`, hiển thị modal:
- **Tiêu đề cảnh báo**: "Xác nhận xóa tài khoản vĩnh viễn" (với icon cảnh báo màu đỏ/cam).
- **Nội dung chi tiết**:
  - Thông tin user sắp xóa: Mã ID `deletingUser.id`, Họ tên `deletingUser.name`, Email `deletingUser.email`, Vai trò `deletingUser.role`.
  - Cảnh báo rõ: "Hành động này sẽ xóa vĩnh viễn quyền truy cập của tài khoản này khỏi hệ thống và không thể hoàn tác."
- **Thông báo lỗi** (nếu có `deleteError`).
- **Nút hành động**:
  - Nút "Hủy bỏ": đóng modal (`setDeletingUser(null)`).
  - Nút "Xác nhận xóa": gọi hàm `handleConfirmDelete()` (hiển thị trạng thái đang xóa `isDeleting`).

### 5.4. Hàm xử lý `handleConfirmDelete`
- Gọi `fetch(`/api/users?id=${deletingUser.id}`, { method: 'DELETE' })` hoặc gửi JSON body `{ userId: deletingUser.id }`.
- Nếu thành công:
  - Hiển thị toast/banner `actionMessage`: "Đã xóa tài khoản [ID] thành công!"
  - Đóng modal (`setDeletingUser(null)`).
  - Gọi lại `loadUsers()` để reload danh sách tài khoản ngay lập tức.
- Nếu thất bại:
  - Hiển thị lỗi trong modal `setDeleteError(data.error)`.

---

## 6. Tiêu chí kiểm thử & Nghiệm thu (Acceptance Criteria)
1. **Kiểm tra UI**:
   - Nút "Xóa" hiển thị rõ ràng màu đỏ nhạt bên cạnh nút "Đổi mật khẩu".
   - Tài khoản `ADMIN001` bị disabled nút xóa, hiển thị nhãn "Cố định" hoặc tooltip cảnh báo cấm xóa.
2. **Kiểm tra Modal Xác nhận**:
   - Bấm nút "Xóa" trên 1 user bất kỳ (ví dụ `ST001`, `GV001`) hiển thị Modal cảnh báo với đầy đủ tên, ID.
   - Bấm "Hủy" -> Modal đóng lại, danh sách không đổi.
3. **Kiểm tra API Security**:
   - Gửi request `DELETE /api/users?id=ADMIN001` -> Trả về mã lỗi `403 Forbidden` với message từ chối.
   - Thử gửi xóa tài khoản không tồn tại -> Trả về `404 Not Found`.
4. **Kiểm tra Xóa thành công**:
   - Xóa thử 1 tài khoản (ví dụ tài khoản vừa tạo mới) -> Trả về `200 OK`, danh sách trên UI tự động reload và biến mất dòng tài khoản đó.
   - Kiểm tra Audit Log: có ghi nhận bản ghi hành động `DELETE` trên tài nguyên `USER_ACCOUNT`.

---

## 7. Phân công thực thi
- **Manager**: Đã hoàn thành phân tích, lập đặc tả và lưu file `DELETE_USER_SPEC.md`.
- **Worker (`ag/gemini-3.8-flash-high`)**: Triển khai code vào `src/app/api/users/route.ts` và `src/app/admin/accounts/page.tsx`.
- **Tester (`ag/gemini-3.8-flash-low`)**: Chạy test unit / API test / build kiểm tra không lỗi TypeScript.
