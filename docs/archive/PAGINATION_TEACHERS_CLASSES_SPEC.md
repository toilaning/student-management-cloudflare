# KẾ HOẠCH & ĐẶC TẢ TÍCH HỢP PHÂN TRANG (PAGINATION) CHO MỤC GIÁO VIÊN VÀ QUẢN LÝ LỚP HỌC

- **Người lập:** MANAGER (`ag/gemini-3.8-flash-medium`)
- **Đối tượng bàn giao:** WORKER (`code_worker` / `ag/gemini-3.8-flash-high`)
- **Dự án:** `/Users/toilaning/projects/student-management`
- **Component dùng chung:** `src/components/common/PaginationControls.tsx`

---

## 1. Bối cảnh & Hiện trạng
- Trang **Quản lý học viên** (`src/app/admin/students/page.tsx`) đã được tích hợp component `PaginationControls` với phân trang đầy đủ.
- Hai trang **Quản lý giảng viên** (`src/app/admin/teachers/page.tsx`) và **Quản lý lớp học** (`src/app/admin/classes/page.tsx`) hiện đang render toàn bộ danh sách `filtered` trên một trang duy nhất dạng grid card (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- Khi số lượng giảng viên và lớp học tăng lên (ví dụ: 30 lớp học, hàng chục giảng viên), giao diện bị kéo dài, thiếu công cụ giới hạn hiển thị và không đồng bộ trải nghiệm người dùng với trang Học viên.

---

## 2. Chi tiết kỹ thuật & Hướng dẫn thực thi cho WORKER

### A. Trang Quản lý Đội ngũ Giảng viên (`src/app/admin/teachers/page.tsx`)

#### 1. Import
- Import component phân trang:
  ```tsx
  import { PaginationControls } from '@/components/common/PaginationControls';
  ```

#### 2. Quản lý State
- Thêm các state phân trang:
  ```tsx
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // Grid 3 cột (12 items/trang phù hợp layout md:grid-cols-2 lg:grid-cols-3)
  ```
- *Lưu ý về pageSizeOptions:* `[6, 12, 24, 48]` hoặc `[10, 25, 50]`. Khuyến nghị dùng `[9, 12, 24, 48]` hoặc `[10, 20, 50]` để chia đều theo hàng 3 card. Mặc định 12 là tối ưu nhất cho lưới 3 cột.

#### 3. Xử lý Logic Phân trang & Reset trang
- Khi `searchTerm` thay đổi hoặc khi xóa/thêm thành công giảng viên, reset `currentPage` về 1:
  ```tsx
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  ```
- Tính toán danh sách hiển thị và tổng số trang:
  ```tsx
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedTeachers = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  ```
- Đảm bảo nếu sau khi xóa giảng viên hoặc lọc mà `currentPage > totalPages` thì điều chỉnh lại trang hợp lệ:
  ```tsx
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  ```

#### 4. Giao diện (Render)
- Thay `filtered.map(tc => ...)` bằng `paginatedTeachers.map(tc => ...)`.
- Nếu `filtered.length === 0`, hiển thị empty state phù hợp hoặc dựa vào `PaginationControls` xử lý.
- Đặt `PaginationControls` ngay dưới khối lưới card `div.grid` và bọc trong khung container bo góc/card sạch sẽ:
  ```tsx
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mt-6">
    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={filtered.length}
      itemLabel="giảng viên"
      onPageChange={setCurrentPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setCurrentPage(1);
      }}
      pageSizeOptions={[6, 12, 24, 48]}
    />
  </div>
  ```

---

### B. Trang Quản lý Lớp học & Phân công (`src/app/admin/classes/page.tsx`)

#### 1. Import
- Import component phân trang:
  ```tsx
  import { PaginationControls } from '@/components/common/PaginationControls';
  ```

#### 2. Quản lý State
- Thêm các state phân trang:
  ```tsx
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // Mặc định 12 lớp/trang cho layout grid 3 cột
  ```

#### 3. Xử lý Logic Phân trang & Reset trang
- Reset `currentPage = 1` khi `searchTerm` thay đổi:
  ```tsx
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  ```
- Tính toán danh sách lớp hiển thị:
  ```tsx
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedClasses = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  ```
- Kiểm tra biên trang:
  ```tsx
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  ```

#### 4. Giao diện (Render)
- Thay `filtered.map(cls => ...)` bằng `paginatedClasses.map(cls => ...)`.
- Đặt `PaginationControls` ở phía dưới lưới danh sách lớp học:
  ```tsx
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs mt-6">
    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={filtered.length}
      itemLabel="lớp học"
      onPageChange={setCurrentPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setCurrentPage(1);
      }}
      pageSizeOptions={[6, 12, 24, 48]}
    />
  </div>
  ```

---

## 3. Tiêu chí Nghiệm thu (Definition of Done)
1. **Trực quan:** Cả 2 trang Giảng viên (`/admin/teachers`) và Lớp học (`/admin/classes`) hiển thị thanh phân trang đẹp mắt, đồng bộ phong cách với trang Học viên (`/admin/students`).
2. **Chức năng:**
   - Chuyển trang (Next, Prev, First, Last, chọn số trang cụ thể) mượt mà, đúng dữ liệu cắt lát (`slice`).
   - Đổi `pageSize` cập nhật ngay số lượng hiển thị và tự động quay về trang 1.
   - Nhập từ khóa tìm kiếm (`searchTerm`) tự động reset trang hiện tại về 1 để tránh lỗi hiển thị trang trống vô cớ.
   - Không gây lỗi runtime hoặc layout break ở các kích thước màn hình responsive (mobile, tablet, desktop).
3. **Kiểm thử & Build:**
   - Chạy lệnh `npm run build` hoặc `npm run lint` trên host để đảm bảo TypeScript check sạch 100%, không bị lỗi type hay cú pháp.

---

## 4. Kế hoạch bàn giao
- **Bước tiếp theo:** Chuyển giao ngay cho WORKER (`code_worker` / `ag/gemini-3.8-flash-high`) tiến hành chỉnh sửa code trên 2 file.
- **Sau khi WORKER hoàn thành:** Chuyển sang TESTER (`ag/gemini-3.8-flash-low`) để kiểm tra build và chức năng trước khi trình báo người dùng.
