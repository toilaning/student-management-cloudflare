# KẾ HOẠCH THỰC THI & ĐẶC TẢ KỸ THUẬT PHASE 2
## KẾT NỐI HỆ THỐNG QUẢN LÝ ĐÀO TẠO VỚI GOOGLE SHEETS & GOOGLE APPS SCRIPT API

> **Tài liệu đặc tả kiến trúc & Phân rã nhiệm vụ cho WORKER (`code_worker` / `ag/gemini-3.8-flash-high`)**  
> **Người lập:** MANAGER (`ag/gemini-3.8-flash-medium`)  
> **Trạng thái:** Sẵn sàng thực thi (Ready for Execution)  
> **Dự án:** Hệ thống Quản trị Đào tạo & Quản lý Học viên (Student Management)  
> **Đường dẫn dự án:** `/Users/toilaning/projects/student-management`

---

## I. MỤC TIÊU & NGUYÊN TẮC BẤT BIẾN (CORE PRINCIPLES)

1. **Bảo toàn 100% UI/UX Phase 1:**
   - Tuyệt đối không thay đổi bất kỳ thành phần hiển thị, bố cục giao diện, routing, màu sắc hay tương tác người dùng nào trên 3 Portal (Admin, Giảng viên, Học viên) và Quick Role Switcher.
2. **Kiến trúc phân tầng không đổi (Layered Architecture):**
   - Giữ nguyên luồng: `UI Pages/Components -> Services / API Routes -> IRepository`.
   - Các API Routes hiện tại (`/api/*`) và Services (`AuthService`, `ConflictEngine`, `TuitionPayrollService`, `AuditService`) giữ nguyên signature, logic nghiệp vụ.
3. **Triển khai `GoogleAppsScriptRepository` thay thế `LocalRepository`:**
   - Tạo lớp `GoogleAppsScriptRepository implements IRepository`.
   - Cung cấp Factory/Provider cơ chế chuyển đổi linh hoạt qua biến môi trường (`DATA_SOURCE=gas|local`) để thuận tiện regression test và fallback.
4. **Chuẩn hóa dữ liệu trên 16 Google Sheets:**
   - Thiết kế mô hình quan hệ chặt chẽ giữa 16 sheets, khóa chính (PK), khóa ngoại (FK), chuẩn hóa kiểu dữ liệu date/time (ISO 8601), enum và number.
5. **Google Apps Script Backend tiêu chuẩn Enterprise:**
   - Web App xử lý tập trung qua `doGet` (truy vấn nhanh) và `doPost` (thay đổi trạng thái, batching, queries phức tạp).
   - 15 Domain Services độc lập trong backend GAS.
   - Chuẩn response thống nhất: `{ success: true, data: T }` hoặc `{ success: false, error: { code: string, message: string, details?: any } }`.
   - Bảo mật: Server-side validation, **không bao giờ trả về mật khẩu thô** (strip password trước khi response), API Key / Bearer token xác thực giữa Next.js và GAS Web App.
   - Hiệu năng: Tối ưu triệt để bằng Batch Read (`getValues()`), Batch Write (`setValues()`), tận dụng `LockService` chống race condition và `CacheService` cho danh mục ít thay đổi.
6. **Bộ công cụ Migration & Seeding tự động:**
   - Script tự động khởi tạo cấu trúc 16 sheets (header, formatting, freeze row) và migrate trọn vẹn synthetic dataset từ Phase 1 (400 học viên, 20 giáo viên, 30 lớp học, lịch học, điểm danh, công nợ, bảng lương).

---

## II. THIẾT KẾ MÔ HÌNH DỮ LIỆU 16 GOOGLE SHEETS

Toàn bộ dữ liệu được lưu trữ trên một Google Spreadsheet chuyên biệt. Dưới đây là đặc tả chi tiết cấu trúc cột, kiểu dữ liệu, khóa chính/ngoại cho từng Sheet:

### 1. Sheet: `Users` (Quản lý tài khoản & phân quyền)
- **Mục đích:** Lưu trữ thông tin định danh người dùng hệ thống.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (ví dụ: `usr_...`) |
  | `username` | String | Unique | Tên đăng nhập (email hoặc mã định danh) |
  | `passwordHash` | String | - | Chuỗi băm mật khẩu (SHA-256 + Salt) - **Tuyệt đối không expose ra API** |
  | `name` | String | - | Họ và tên hiển thị |
  | `email` | String | - | Email liên hệ |
  | `role` | String | - | `ADMIN` \| `TEACHER` \| `STUDENT` |
  | `avatar` | String | - | URL ảnh đại diện |
  | `createdAt` | String | - | ISO 8601 Timestamp |
  | `updatedAt` | String | - | ISO 8601 Timestamp |

### 2. Sheet: `Students` (Hồ sơ học viên)
- **Mục đích:** Chi tiết hồ sơ cá nhân và học tập của học viên.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | Mã học viên (`HV-...` hoặc UUID) |
  | `userId` | String | **FK** | Tham chiếu đến `Users.id` |
  | `name` | String | - | Họ tên học viên |
  | `email` | String | - | Email |
  | `phone` | String | - | Số điện thoại liên hệ |
  | `dateOfBirth` | String | - | Ngày sinh (YYYY-MM-DD) |
  | `address` | String | - | Địa chỉ cư trú |
  | `guardianName` | String | - | Tên phụ huynh / người bảo hộ |
  | `guardianPhone` | String | - | SĐT phụ huynh |
  | `status` | String | - | `ACTIVE` \| `PAUSED` \| `DROPPED` |
  | `enrolledDate` | String | - | Ngày nhập học (YYYY-MM-DD) |
  | `createdAt` | String | - | ISO 8601 Timestamp |
  | `updatedAt` | String | - | ISO 8601 Timestamp |

### 3. Sheet: `Teachers` (Hồ sơ giảng viên)
- **Mục đích:** Thông tin chuyên môn, học vị và phân hiệu giáo viên.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | Mã giáo viên (`GV-...` hoặc UUID) |
  | `userId` | String | **FK** | Tham chiếu đến `Users.id` |
  | `name` | String | - | Họ tên giảng viên |
  | `email` | String | - | Email |
  | `phone` | String | - | Số điện thoại |
  | `specialty` | String | - | Chuyên ngành giảng dạy (VD: CNTT, Tiếng Anh, Toán) |
  | `degree` | String | - | Học vị (Cử nhân, Thạc sĩ, Tiến sĩ) |
  | `baseSalary` | Number | - | Lương cứng cơ bản (VND) |
  | `hourlyRate` | Number | - | Thù lao mặc định theo giờ (VND/giờ) |
  | `status` | String | - | `ACTIVE` \| `INACTIVE` |
  | `joinedDate` | String | - | Ngày vào làm (YYYY-MM-DD) |
  | `createdAt` | String | - | ISO 8601 Timestamp |
  | `updatedAt` | String | - | ISO 8601 Timestamp |

### 4. Sheet: `TeacherRates` (Định mức thù lao chuyên biệt)
- **Mục đích:** Cấu hình định mức lương theo môn học/lớp học/trình độ cụ thể cho giảng viên.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`rate_...`) |
  | `teacherId` | String | **FK** | Tham chiếu `Teachers.id` |
  | `subjectCode` | String | - | Mã môn học hoặc `*` (áp dụng chung) |
  | `classType` | String | - | `STANDARD` \| `VIP` \| `ONLINE` |
  | `ratePerHour` | Number | - | Mức thù lao thực tế (VND/giờ) |
  | `effectiveFrom` | String | - | Ngày bắt đầu áp dụng (YYYY-MM-DD) |
  | `effectiveTo` | String | - | Ngày hết hạn áp dụng (YYYY-MM-DD hoặc rỗng) |

### 5. Sheet: `TeacherWorkLogs` (Nhật ký công tác giảng dạy)
- **Mục đích:** Ghi nhận số giờ dạy thực tế của giáo viên sau mỗi ca học để tính lương.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`worklog_...`) |
  | `teacherId` | String | **FK** | Tham chiếu `Teachers.id` |
  | `scheduleSlotId` | String | **FK** | Tham chiếu `Schedules.id` |
  | `classId` | String | **FK** | Tham chiếu `Classes.id` |
  | `date` | String | - | Ngày dạy (YYYY-MM-DD) |
  | `durationHours` | Number | - | Số giờ dạy thực tế (VD: 1.5, 2.0) |
  | `appliedRate` | Number | - | Mức thù lao tính cho ca này (VND/giờ) |
  | `totalAmount` | Number | - | Thành tiền = `durationHours * appliedRate` |
  | `status` | String | - | `LOGGED` \| `VERIFIED` \| `LOCKED` (đã chốt lương) |
  | `note` | String | - | Ghi chú hoặc nội dung buổi dạy |

### 6. Sheet: `TeacherPayrollPeriods` (Bảng tính lương theo kỳ)
- **Mục đích:** Lưu trữ bảng lương tổng hợp theo tháng của giảng viên.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`pr_...`) |
  | `teacherId` | String | **FK** | Tham chiếu `Teachers.id` |
  | `month` | String | - | Tháng lương (Định dạng `YYYY-MM`) |
  | `totalHours` | Number | - | Tổng số giờ dạy trong tháng |
  | `teachingSalary`| Number | - | Tiền công dạy học |
  | `baseSalary` | Number | - | Lương cứng |
  | `bonus` | Number | - | Tiền thưởng |
  | `deductions` | Number | - | Các khoản trừ |
  | `finalAmount` | Number | - | Thực lĩnh = Base + Teaching + Bonus - Deductions |
  | `status` | String | - | `DRAFT` \| `CONFIRMED` \| `PAID` |
  | `paidDate` | String | - | Ngày thanh toán (nếu có) |
  | `updatedAt` | String | - | ISO 8601 Timestamp |

### 7. Sheet: `Classes` (Quản lý lớp học)
- **Mục đích:** Danh sách các lớp học, sĩ số, lịch trình và học phí.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | Mã lớp (`LH-...` hoặc UUID) |
  | `code` | String | Unique | Mã định danh lớp |
  | `name` | String | - | Tên lớp học |
  | `subject` | String | - | Môn học |
  | `teacherId` | String | **FK** | Tham chiếu `Teachers.id` |
  | `classroomId` | String | - | Mã phòng học cố định |
  | `startDate` | String | - | Ngày bắt đầu (YYYY-MM-DD) |
  | `endDate` | String | - | Ngày kết thúc (YYYY-MM-DD) |
  | `maxCapacity` | Number | - | Sĩ số tối đa |
  | `fee` | Number | - | Học phí trọn khóa / tháng (VND) |
  | `status` | String | - | `UPCOMING` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED` |
  | `createdAt` | String | - | ISO 8601 Timestamp |

### 8. Sheet: `ClassStudents` (Danh sách học viên theo lớp)
- **Mục đích:** Quan hệ n-n giữa Học viên và Lớp học.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`cs_...`) |
  | `classId` | String | **FK** | Tham chiếu `Classes.id` |
  | `studentId` | String | **FK** | Tham chiếu `Students.id` |
  | `enrolledAt` | String | - | Ngày ghi danh |
  | `status` | String | - | `ACTIVE` \| `DROPPED` \| `COMPLETED` |

### 9. Sheet: `Schedules` (Lịch dạy & Thời khóa biểu ca học)
- **Mục đích:** Chi tiết từng buổi học / ca học cụ thể trên lịch.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | Mã ca học (`SLOT-...` hoặc UUID) |
  | `classId` | String | **FK** | Tham chiếu `Classes.id` |
  | `teacherId` | String | **FK** | Tham chiếu `Teachers.id` |
  | `classroomId` | String | - | Phòng học (VD: `P101`) |
  | `date` | String | - | Ngày học (YYYY-MM-DD) |
  | `startTime` | String | - | Giờ bắt đầu (`HH:mm`) |
  | `endTime` | String | - | Giờ kết thúc (`HH:mm`) |
  | `shift` | String | - | Tên ca (`CA_1`, `CA_2`, `CA_3`, ...) |
  | `status` | String | - | `SCHEDULED` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED` |
  | `note` | String | - | Ghi chú ca học |

### 10. Sheet: `Attendance` (Điểm danh học viên theo ca)
- **Mục đích:** Ghi nhận sự có mặt của học viên trong từng ca học.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`att_...`) |
  | `scheduleSlotId`| String | **FK** | Tham chiếu `Schedules.id` |
  | `studentId` | String | **FK** | Tham chiếu `Students.id` |
  | `classId` | String | **FK** | Tham chiếu `Classes.id` |
  | `status` | String | - | `PRESENT` \| `ABSENT_EXCUSED` \| `ABSENT_UNEXCUSED` \| `LATE` |
  | `note` | String | - | Nhận xét thái độ, bài vở |
  | `markedAt` | String | - | ISO 8601 Timestamp |
  | `markedBy` | String | **FK** | Tham chiếu `Users.id` (Giáo viên / Điểm danh viên) |

### 11. Sheet: `LeaveRequests` (Đơn xin nghỉ phép của học viên & giáo viên)
- **Mục đích:** Quản lý các yêu cầu nghỉ học / nghỉ dạy.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`req_leave_...`) |
  | `applicantId` | String | **FK** | Tham chiếu `Users.id` |
  | `applicantRole`| String | - | `STUDENT` \| `TEACHER` |
  | `scheduleSlotId`| String | **FK** | Tham chiếu `Schedules.id` (nếu xin nghỉ 1 ca) |
  | `startDate` | String | - | Ngày bắt đầu nghỉ |
  | `endDate` | String | - | Ngày kết thúc nghỉ |
  | `reason` | String | - | Lý do xin nghỉ |
  | `status` | String | - | `PENDING` \| `APPROVED` \| `REJECTED` |
  | `reviewedBy` | String | **FK** | Tham chiếu `Users.id` (Admin duyệt) |
  | `reviewNote` | String | - | Ý kiến phê duyệt |
  | `createdAt` | String | - | ISO 8601 Timestamp |

### 12. Sheet: `ScheduleChanges` (Yêu cầu đổi lịch, bù giờ dạy)
- **Mục đích:** Xử lý yêu cầu dời lịch học, đổi ca dạy giữa các giáo viên hoặc xin dạy bù.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`req_chg_...`) |
  | `requesterId` | String | **FK** | Tham chiếu `Users.id` |
  | `scheduleSlotId`| String | **FK** | Ca học cần thay đổi |
  | `targetDate` | String | - | Ngày mới đề xuất |
  | `targetStartTime`| String | - | Giờ bắt đầu mới đề xuất |
  | `targetEndTime`| String | - | Giờ kết thúc mới đề xuất |
  | `targetRoomId`| String | - | Phòng học mới đề xuất |
  | `targetTeacherId`| String | **FK** | Giáo viên dạy thay (nếu có) |
  | `reason` | String | - | Lý do dời / đổi ca |
  | `status` | String | - | `PENDING` \| `APPROVED` \| `REJECTED` |
  | `reviewedBy` | String | **FK** | Admin duyệt |
  | `createdAt` | String | - | ISO 8601 Timestamp |

### 13. Sheet: `Tuitions` (Hóa đơn công nợ học phí)
- **Mục đích:** Theo dõi học phí phát sinh theo học viên và khóa học.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | Mã hóa đơn (`HD-...` hoặc UUID) |
  | `studentId` | String | **FK** | Tham chiếu `Students.id` |
  | `classId` | String | **FK** | Tham chiếu `Classes.id` |
  | `title` | String | - | Tiêu đề hóa đơn (VD: Học phí Web React K10) |
  | `amount` | Number | - | Tổng số tiền phải nộp (VND) |
  | `paidAmount` | Number | - | Số tiền đã thanh toán (VND) |
  | `remainingAmount`| Number | - | Số tiền còn nợ (`amount - paidAmount`) |
  | `dueDate` | String | - | Hạn nộp (YYYY-MM-DD) |
  | `status` | String | - | `UNPAID` \| `PARTIAL` \| `PAID` \| `OVERDUE` |
  | `createdAt` | String | - | ISO 8601 Timestamp |
  | `updatedAt` | String | - | ISO 8601 Timestamp |

### 14. Sheet: `Payments` (Lịch sử giao dịch đóng tiền)
- **Mục đích:** Ghi nhận từng lần nộp học phí của học viên.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | Mã phiếu thu (`PT-...` hoặc UUID) |
  | `tuitionId` | String | **FK** | Tham chiếu `Tuitions.id` |
  | `studentId` | String | **FK** | Tham chiếu `Students.id` |
  | `amount` | Number | - | Số tiền đóng lần này |
  | `method` | String | - | `CASH` \| `BANK_TRANSFER` \| `CARD` \| `ONLINE` |
  | `referenceCode`| String | - | Mã giao dịch ngân hàng / hóa đơn đỏ |
  | `collectedBy` | String | **FK** | Tham chiếu `Users.id` (Kế toán / Thu ngân) |
  | `paymentDate`| String | - | Ngày giờ giao dịch (ISO 8601) |
  | `note` | String | - | Ghi chú thu tiền |

### 15. Sheet: `Notifications` (Thông báo người dùng)
- **Mục đích:** Thông báo hệ thống, nhắc nhở lịch học, phê duyệt đơn từ.
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`notif_...`) |
  | `userId` | String | **FK** | Tham chiếu `Users.id` (người nhận, hoặc rỗng nếu gửi broadcast) |
  | `role` | String | - | Vai trò nhận (`ALL` \| `ADMIN` \| `TEACHER` \| `STUDENT`) |
  | `title` | String | - | Tiêu đề thông báo |
  | `message` | String | - | Nội dung chi tiết |
  | `type` | String | - | `INFO` \| `WARNING` \| `SUCCESS` \| `DANGER` |
  | `isRead` | Boolean | - | `TRUE` \| `FALSE` |
  | `link` | String | - | Đường dẫn điều hướng nhanh (nếu có) |
  | `createdAt` | String | - | ISO 8601 Timestamp |

### 16. Sheet: `AuditLogs` (Nhật ký kiểm toán hệ thống)
- **Mục đích:** Ghi lại mọi hành động can thiệp dữ liệu quan trọng (chấm công, sửa điểm, đổi lịch, thu tiền).
- **Cột:**
  | Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc / Mô Tả |
  | :--- | :--- | :--- | :--- |
  | `id` | String | **PK** | UUID (`log_...`) |
  | `userId` | String | **FK** | Tham chiếu `Users.id` |
  | `userName` | String | - | Tên người thực hiện |
  | `action` | String | - | Mã hành động (VD: `CREATE_CLASS`, `UPDATE_ATTENDANCE`, `COLLECT_FEE`) |
  | `entity` | String | - | Tên bảng/thực thể chịu tác động |
  | `entityId` | String | - | ID bản ghi chịu tác động |
  | `details` | String | - | Dữ liệu JSON tóm tắt chi tiết thay đổi |
  | `ipAddress` | String | - | Địa chỉ IP (hoặc client user-agent) |
  | `timestamp` | String | - | ISO 8601 Timestamp |

---

## III. THIẾT KẾ GOOGLE APPS SCRIPT BACKEND (GAS WEB APP)

### 1. Chuẩn Hóa Giao Thức & Định Dạng API
Backend Google Apps Script chạy dưới dạng **Web App** (Deploy as Web App, Execute as Me, Who has access: Anyone with link hoặc Bearer API Key).

- **Authentication / API Key Guard:**
  Mọi request từ Next.js gửi kèm header hoặc payload: `apiKey: GAS_API_KEY` (khớp với `PropertiesService.getScriptProperties().getProperty('API_KEY')`).
- **Phản hồi thành công:**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
- **Phản hồi thất bại:**
  ```json
  {
    "success": false,
    "error": {
      "code": "ENTITY_NOT_FOUND",
      "message": "Không tìm thấy học viên với mã HV-001",
      "details": null
    }
  }
  ```

### 2. Router & Dispatcher Trung Tâm (`Code.gs`)
Apps Script tiếp nhận 2 hàm entry-point:
- `doGet(e)`: Phục vụ Health Check (`?action=ping`), hoặc các truy vấn đọc nhanh nếu có query params.
- `doPost(e)`: Entry-point chính cho toàn bộ nghiệp vụ ứng dụng.
  - Payload format:
    ```json
    {
      "apiKey": "SECRET_KEY_HERE",
      "service": "UserService",
      "action": "getUserById",
      "params": { "id": "usr_001" }
    }
    ```
  - Xử lý:
    1. Kiểm tra xác thực `apiKey`.
    2. Route đến đúng Service tương ứng trong 15 Services.
    3. Thực thi nghiệp vụ kèm Server-Side Validation.
    4. Trả về `ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)`.

### 3. Cấu Trúc 15 GAS Services Độc Lập
1. **`UserService`**: `getUserById`, `getUserByUsername`, `getAllUsers`, `createUser`, `updateUser`, `deleteUser`. **Đặc biệt: Loại bỏ trường `passwordHash` ra khỏi toàn bộ response API!**
2. **`StudentService`**: `getStudentById`, `getAllStudents`, `createStudent`, `updateStudent`, `deleteStudent`.
3. **`TeacherService`**: `getTeacherById`, `getAllTeachers`, `createTeacher`, `updateTeacher`, `deleteTeacher`.
4. **`TeacherRateService`**: `getRatesByTeacherId`, `saveTeacherRate`, `deleteTeacherRate`.
5. **`TeacherWorkLogService`**: `getLogsByTeacherId`, `logWorkHours`, `batchVerifyWorkLogs`.
6. **`TeacherPayrollPeriodService`**: `getAllPayrollRecords`, `getPayrollByTeacherId`, `savePayrollRecord`, `updatePayrollRecord`.
7. **`ClassService`**: `getAllClasses`, `getClassById`, `getClassesByTeacherId`, `getClassesByStudentId`, `createClass`, `updateClass`.
8. **`ClassStudentService`**: `enrollStudent`, `dropStudent`, `getStudentsInClass`.
9. **`ScheduleService`**: `getAllScheduleSlots`, `getScheduleSlotById`, `getSlotsByTeacherId`, `getSlotsByClassId`, `getSlotsByStudentId`, `createScheduleSlot`, `updateScheduleSlot`.
10. **`AttendanceService`**: `getAttendanceBySlotId`, `getAttendanceByStudentId`, `getAttendanceByClassId`, `saveAttendanceRecord`, `saveAttendanceBatch`.
11. **`LeaveRequestService`**: `getAllRequests`, `getRequestById`, `getRequestsByStudentId`, `getRequestsByTeacherId`, `createRequest`, `updateRequest`.
12. **`ScheduleChangeService`**: `createScheduleChangeRequest`, `reviewScheduleChangeRequest`.
13. **`TuitionService`**: `getAllTuitionInvoices`, `getTuitionInvoicesByStudentId`, `getTuitionInvoiceById`, `updateTuitionInvoice`, `createTuitionInvoice`.
14. **`PaymentService`**: `recordPayment`, `getPaymentsByTuitionId`.
15. **`NotificationService` & `AuditLogService`**: `getNotifications`, `addNotification`, `markAsRead`, `markAllAsRead`, `getAllAuditLogs`, `addAuditLog`.

### 4. Kỹ Thuật Tối Ưu Hiệu Năng & Concurrency Trên Google Sheets
- **Batch Data Access:** Tuyệt đối không gọi `getRange(row, col).getValue()` trong vòng lặp `for`. Luôn dùng:
  ```javascript
  const values = sheet.getDataRange().getValues(); // 1 lần duy nhất
  ```
  Và khi ghi dữ liệu nhiều dòng (ví dụ điểm danh ca học 30 học viên, seed data), dùng `sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsData)`.
- **LockService chống xung đột ghi:**
  Mọi thao tác tạo mới / cập nhật liên quan đến ghi danh học viên, xếp lịch hoặc chấm công phải bọc trong `LockService.getScriptLock()`:
  ```javascript
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Đợi tối đa 10s
    // Thao tác đọc + ghi
  } finally {
    lock.releaseLock();
  }
  ```
- **Caching với CacheService:**
  Lưu trữ danh mục môn học, danh sách phòng học, danh sách giáo viên đang hoạt động vào `CacheService.getScriptCache()` với TTL 5-10 phút để phản hồi tức thì cho Next.js.

---

## IV. THIẾT KẾ NEXT.JS CLIENT: `GoogleAppsScriptRepository`

### 1. Vị trí và Cấu hình
- **File:** `src/repositories/GoogleAppsScriptRepository.ts`
- **Giao diện:** Implement chuẩn `IRepository` từ `src/repositories/IRepository.ts`.
- **Biến môi trường (`.env.local` / `.env`):**
  ```env
  DATA_SOURCE=gas # gas | local
  GAS_WEB_APP_URL="https://script.google.com/macros/s/AKfycbx.../exec"
  GAS_API_KEY="hoc-vien-nextjs-secret-token-2026"
  ```

### 2. Client-Side HTTP Client & Resilience
Viết hàm gọi tập trung:
```typescript
async function callGAS<T>(service: string, action: string, params: any = {}): Promise<T> {
  const url = process.env.GAS_WEB_APP_URL;
  const apiKey = process.env.GAS_API_KEY;

  if (!url) {
    throw new Error('GAS_WEB_APP_URL chưa được cấu hình');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      service,
      action,
      params,
    }),
    cache: 'no-store', // Đảm bảo dữ liệu thời gian thực
  });

  if (!res.ok) {
    throw new Error(`Lỗi kết nối Google Apps Script HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(`[GAS API Error] ${json.error?.code}: ${json.error?.message}`);
  }

  return json.data as T;
}
```

### 3. Factory Pattern Cung Cấp Repository
Tạo module `src/repositories/index.ts`:
```typescript
import { IRepository } from './IRepository';
import { LocalRepository } from './LocalRepository';
import { GoogleAppsScriptRepository } from './GoogleAppsScriptRepository';

export function getRepository(): IRepository {
  if (process.env.DATA_SOURCE === 'gas') {
    return GoogleAppsScriptRepository.getInstance();
  }
  return LocalRepository.getInstance();
}

export const repo = getRepository();
```
Toàn bộ các API Route trong `src/app/api/**/route.ts` sẽ chuyển đổi import từ `import { localRepo } from '@/repositories/LocalRepository'` sang `import { repo } from '@/repositories'`. Điều này đảm bảo:
- Nếu cần chạy offline / unit test: set `DATA_SOURCE=local`.
- Chạy hệ thống thật với Google Sheets: set `DATA_SOURCE=gas`.
- Zero code regression trên UI components và service layer!

---

## V. MIGRATION & SEEDING SCRIPT

Hệ thống cung cấp 2 giải pháp Seeding linh hoạt:
1. **Google Apps Script Migration Engine (`SetupAndSeed.gs`):**
   - Chạy trực tiếp từ giao diện Google Apps Script Editor hoặc gọi qua trigger `action: "seedDatabase"`.
   - Tạo tự động toàn bộ 16 Sheet với định dạng Header đẹp, cố định dòng 1 (`setFrozenRows(1)`), tự động format độ rộng cột.
2. **Node.js Migration Script (`scripts/migrate-to-gas.ts`):**
   - Đọc dữ liệu synthetic từ `src/repositories/seeds/seedData.ts` (Phase 1).
   - Biến đổi thành payload tương thích và gửi batch POST lên Web App endpoint để điền vào 16 Sheet:
     - **400 Học viên** (Họ tên, SĐT, ngày sinh, trạng thái).
     - **20 Giảng viên** (Học vị, chuyên môn, lương cơ bản, thù lao giờ).
     - **30 Lớp học** (Sĩ số, môn học, lịch trình).
     - **Lịch học (Schedules) & Dữ liệu Điểm danh (Attendance)**.
     - **Công nợ học phí (Tuitions) & Nhật ký thu tiền (Payments)**.
     - **Bảng tính lương giảng viên (Payroll)**.
     - **Đơn từ xin nghỉ & Thay đổi lịch học (Requests)**.
     - **Thông báo & Nhật ký kiểm toán (Notifications, AuditLogs)**.

---

## VI. BẢNG PHÂN RÃ NHIỆM VỤ DÀNH CHO WORKER (`code_worker`)

Để đảm bảo quy trình thực thi chính xác, an toàn và có thể kiểm thử từng bước, nhiệm vụ được phân rã thành 5 Tasks cụ thể:

```
[TASK 1: Mã nguồn Google Apps Script - Core Router & Sheets Initialization]
                             │
                             ▼
[TASK 2: Triển khai 15 Domain Services trong Google Apps Script]
                             │
                             ▼
[TASK 3: Kịch bản Seeding & Migration Data (400 SV, 20 GV, 30 Lớp...)]
                             │
                             ▼
[TASK 4: Next.js Client - GoogleAppsScriptRepository & Factory Pattern]
                             │
                             ▼
[TASK 5: Tích hợp, Kiểm thử Hồi quy & Nghiệm thu toàn diện]
```

### Chi Tiết Từng Task:

#### **TASK 1: Thiết Kế Toàn Bộ Source Code Google Apps Script (Backend Core)**
- **Mục tiêu:** Tạo thư mục `gas-backend/` chứa mã nguồn Google Apps Script sẵn sàng deploy.
- **Chi tiết thực hiện:**
  1. Tạo `gas-backend/Code.gs`: Xử lý `doGet`, `doPost`, xác thực API Key, router điều phối 15 Services, cấu trúc lỗi chuẩn.
  2. Tạo `gas-backend/Database.gs`: Các hàm tiện ích thao tác Sheets (`getSheet`, `readAllRows`, `insertRow`, `updateRow`, `batchInsertRows`, `batchUpdateRows`, `buildHeaderMap`).
  3. Tạo `gas-backend/Setup.gs`: Hàm `initializeSheets()` tự động tạo 16 Sheets, tạo Header chuẩn, đóng băng dòng 1, tô màu nhận diện Header.
- **Tiêu chí hoàn thành:** Khởi tạo được cấu trúc 16 sheets rỗng với đầy đủ tên cột chuẩn như mục II.

#### **TASK 2: Triển Khai Chi Tiết 15 Services Trên Google Apps Script**
- **Mục tiêu:** Hoàn thiện toàn bộ logic nghiệp vụ xử lý dữ liệu cho 16 Sheets trong `gas-backend/`.
- **Chi tiết thực hiện:**
  - `UserService.gs`: Đọc/ghi Users, bảo mật mật khẩu, tìm theo username.
  - `StudentService.gs`: CRUD học viên.
  - `TeacherService.gs`: CRUD giảng viên & quản lý thù lao.
  - `ClassService.gs`: Quản lý lớp học, tra cứu theo giảng viên/học viên.
  - `ScheduleService.gs`: Tra cứu lịch ca học, phòng học, phát hiện xung đột cơ bản.
  - `AttendanceService.gs`: Ghi nhận điểm danh, hỗ trợ lưu hàng loạt (`saveAttendanceBatch`).
  - `FinanceService.gs`: Quản lý `Tuitions`, `Payments`, tính toán công nợ và `PayrollRecords`.
  - `RequestService.gs`: Xử lý `LeaveRequests` và `ScheduleChanges`.
  - `NotificationAndAuditService.gs`: Ghi nhận thông báo và audit log.
- **Tiêu chí hoàn thành:** Toàn bộ 15 services phản hồi đúng định dạng `{ success: true, data }` hoặc `{ success: false, error }`.

#### **TASK 3: Viết Script Seeding & Migration (Đẩy Dữ Liệu Synthetic Sang Google Sheets)**
- **Mục tiêu:** Nạp toàn bộ dữ liệu mẫu Phase 1 vào Google Sheets thông qua API hoặc script tự động.
- **Chi tiết thực hiện:**
  1. Tạo `scripts/seed-gas.ts` hoặc script chạy bằng `npx tsx scripts/seed-gas.ts`.
  2. Sử dụng dữ liệu từ `src/repositories/seeds/seedData.ts`.
  3. Đẩy tuần tự theo luồng liên kết khóa ngoại:
     `Users -> Students & Teachers -> Classes -> ClassStudents -> Schedules -> Attendance -> Tuitions -> PayrollRecords -> Requests -> Notifications -> AuditLogs`.
  4. Đảm bảo đúng khối lượng: 400 học viên, 20 giáo viên, 30 lớp học, đầy đủ lịch học và tài chính.
- **Tiêu chí hoàn thành:** Cả 16 Sheets đều được lấp đầy dữ liệu chuẩn xác, không bị lỗi gãy quan hệ khóa ngoại.

#### **TASK 4: Xây Dựng `GoogleAppsScriptRepository` & Repository Provider Trên Next.js**
- **Mục tiêu:** Tích hợp client Next.js với backend Google Sheets mà không phá vỡ UI/UX hiện hữu.
- **Chi tiết thực hiện:**
  1. Tạo `src/repositories/GoogleAppsScriptRepository.ts` hiện thực hóa toàn bộ interface `IRepository`.
  2. Tạo `src/repositories/index.ts` xuất `repo` dựa theo cấu hình `DATA_SOURCE`.
  3. Cập nhật các API route (`src/app/api/**/route.ts`) để sử dụng `repo` từ index thay vì trỏ cứng `LocalRepository`.
  4. Cấu hình file `.env.example` và `.env.local` chứa mẫu URL và API Key.
- **Tiêu chí hoàn thành:** Next.js build pass (`npm run build`), TypeScript không có lỗi kiểu.

#### **TASK 5: Kiểm Thử Tích Hợp & Kiểm Thử Hồi Quy (Regression Testing)**
- **Mục tiêu:** Đảm bảo toàn bộ 3 Portals hoạt động trơn tru 100% với dữ liệu từ Google Sheets.
- **Chi tiết thực hiện:**
  1. Chạy toàn bộ test suites hiện có (`npm test`).
  2. Kiểm tra Portal Admin: Danh sách học viên, danh sách giảng viên, quản lý lớp học, bảng lương, báo cáo học phí.
  3. Kiểm tra Portal Giảng viên: Xem lịch dạy, điểm danh ca học, gửi đơn xin nghỉ/đổi ca, xem bảng lương cá nhân.
  4. Kiểm tra Portal Học viên: Xem thời khóa biểu, tra cứu công nợ học phí, gửi yêu cầu nghỉ học.
  5. Kiểm tra tính năng Quick Role Switcher chuyển đổi mượt mà giữa các vai trò.
- **Tiêu chí hoàn thành:** Toàn bộ test suites pass 100%, UI không lỗi giật lag, thao tác ghi nhận cập nhật ngay lập tức.

---

## VII. HƯỚNG DẪN BÀN GIAO & TRIỂN KHAI CHO NGƯỜI DÙNG

1. **Cách thiết lập Google Spreadsheet:**
   - Tạo 1 Spreadsheet mới trên Google Drive cá nhân.
   - Mở Extensions -> Apps Script.
   - Copy toàn bộ file trong thư mục `gas-backend/` vào Apps Script project.
   - Chạy hàm `initializeSheets()` để tự động dựng cấu trúc 16 sheet.
   - Cài đặt Script Properties: `API_KEY = hoc-vien-nextjs-secret-token-2026`.
   - Chọn Deploy -> New deployment -> Web app -> Execute as: `Me`, Who has access: `Anyone`.
   - Lấy URL Web App dán vào `.env.local` của ứng dụng Next.js.
2. **Cách chạy Seeding dữ liệu:**
   - Chạy lệnh: `npm run seed:gas` (hoặc gọi qua API resetData).
   - Hệ thống tự động nạp 400 học viên, 20 giáo viên và toàn bộ kịch bản mẫu.

---
*Bản đặc tả được phê duyệt và ban hành bởi MANAGER (`ag/gemini-3.8-flash-medium`). Sẵn sàng bàn giao cho WORKER triển khai.*
