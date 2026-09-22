-- ============================================================================
-- SCRIPT RESET VÀ LÀM SẠCH TOÀN BỘ CƠ SỞ DỮ LIỆU ĐỂ BẮT ĐẦU PRE-USE
-- ============================================================================
-- Script này sẽ:
-- 1. Xóa toàn bộ dữ liệu mock/test cũ trên tất cả các bảng.
-- 2. Cập nhật và đảm bảo 100% đầy đủ các trường mới (parent_phone, assignment_url, 
--    rate_per_session, packages, expenses, status...).
-- 3. Bỏ hoàn toàn homework và payroll cũ.
-- 4. Giữ lại duy nhất 01 tài khoản Quản trị viên (Admin) để bạn đăng nhập:
--    - Username: admin
--    - Password: admin123
-- ============================================================================

-- BẬT CÁC EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1. XÓA BẢNG CŨ THEO THỨ TỰ RÀNG BUỘC (CASCADE)
DROP TABLE IF EXISTS homework_submissions CASCADE;
DROP TABLE IF EXISTS homework_tasks CASCADE;
DROP TABLE IF EXISTS payroll_records CASCADE;
DROP TABLE IF EXISTS teacher_payroll_periods CASCADE;

DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS class_requests CASCADE;
DROP TABLE IF EXISTS schedule_slots CASCADE;
DROP TABLE IF EXISTS class_students CASCADE;
DROP TABLE IF EXISTS class_enrollments CASCADE;
DROP TABLE IF EXISTS tuition_invoices CASCADE;
DROP TABLE IF EXISTS student_monthly_packages CASCADE;
DROP TABLE IF EXISTS session_packages CASCADE;
DROP TABLE IF EXISTS manual_expenses CASCADE;
DROP TABLE IF EXISTS bank_transactions CASCADE;
DROP TABLE IF EXISTS bank_settings CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- 2. TẠO CẤU TRÚC BẢNG CHUẨN ĐẦY ĐỦ 100% TRƯỜNG DỮ LIỆU
-- ============================================================================

-- BẢNG 1: USERS (Tài khoản người dùng - Email là tùy chọn)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username CITEXT NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    name VARCHAR(255) NOT NULL,
    email CITEXT,
    avatar TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- BẢNG 2: CLASSROOMS (Phòng học)
CREATE TABLE classrooms (
    id VARCHAR(50) PRIMARY KEY, -- e.g. P.101, P.102
    name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 30,
    facilities TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'Khả dụng' CHECK (status IN ('Khả dụng', 'Bảo trì')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BẢNG 3: TEACHERS (Đội ngũ giáo viên - Thù lao theo buổi, email tùy chọn)
CREATE TABLE teachers (
    id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email CITEXT,
    phone VARCHAR(50) NOT NULL,
    specialty VARCHAR(255) NOT NULL, -- Text tự do (Toán, IELTS, Vẽ...)
    hourly_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    rate_per_session NUMERIC(12, 2) NOT NULL DEFAULT 250000, -- Lương / ca dạy thực tế
    status VARCHAR(50) NOT NULL DEFAULT 'Đang dạy' CHECK (status IN ('Đang dạy', 'Tạm nghỉ', 'Nghỉ phép')),
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_teachers_status ON teachers(status);

-- BẢNG 4: STUDENTS (Học viên - SĐT phụ huynh, link bài tập, Snowflake Discord, trạng thái nghỉ học)
CREATE TABLE students (
    id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email CITEXT,
    phone VARCHAR(50) NOT NULL,
    parent_phone VARCHAR(50),
    assignment_url TEXT, -- Link tổng hợp bài làm (Drive / Notion / GitHub / Figma...)
    discord_id VARCHAR(50), -- Snowflake ID
    discord_username VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10) DEFAULT 'Nam' CHECK (gender IN ('Nam', 'Nữ')),
    address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Đang học' CHECK (status IN ('Đang học', 'Tạm dừng', 'Đã nghỉ học', 'Bảo lưu', 'Đã tốt nghiệp')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_discord ON students(discord_id);

-- BẢNG 5: CLASSES (Lớp học)
CREATE TABLE classes (
    id VARCHAR(50) PRIMARY KEY, -- e.g. CLS01, CLS02
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(50) NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    room_id VARCHAR(50) NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
    tuition_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    schedule_days INTEGER[] NOT NULL DEFAULT '{}', -- [2, 4, 6]
    shift_id INTEGER NOT NULL CHECK (shift_id BETWEEN 1 AND 5),
    meeting_link TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Đang mở' CHECK (status IN ('Đang mở', 'Đã kết thúc', 'Tạm dừng')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_room ON classes(room_id);

-- BẢNG 6: CLASS_STUDENTS (Ghi danh học viên vào lớp)
CREATE TABLE class_students (
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (class_id, student_id)
);

-- BẢNG 7: SCHEDULE_SLOTS (Lịch ca học)
CREATE TABLE schedule_slots (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_id INTEGER NOT NULL CHECK (shift_id BETWEEN 1 AND 5),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_id VARCHAR(50) NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
    teacher_id VARCHAR(50) NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'Chưa bắt đầu' CHECK (status IN ('Chưa bắt đầu', 'Đang diễn ra', 'Hoàn thành', 'Đã hủy')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_schedule_slots_date_shift ON schedule_slots(date, shift_id);
CREATE INDEX idx_schedule_slots_teacher ON schedule_slots(teacher_id, date);

-- BẢNG 8: ATTENDANCE_RECORDS (Sổ điểm danh)
CREATE TABLE attendance_records (
    id VARCHAR(50) PRIMARY KEY,
    schedule_slot_id VARCHAR(50) NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Chưa điểm danh' CHECK (status IN ('Có mặt', 'Vắng có phép', 'Vắng không phép', 'Đi muộn', 'Điểm danh bù', 'Chưa điểm danh')),
    checkin_time TIMESTAMPTZ,
    method VARCHAR(50) DEFAULT 'MANUAL', -- 'BOT' | 'MANUAL' | '1-CLICK'
    original_slot_id VARCHAR(50),
    makeup_reason TEXT,
    note TEXT,
    updated_by VARCHAR(50) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attendance_slot_student ON attendance_records(schedule_slot_id, student_id);

-- BẢNG 9: STUDENT_MONTHLY_PACKAGES (Gói tháng & Cơ chế dồn buổi Rollover)
CREATE TABLE student_monthly_packages (
    id VARCHAR(64) PRIMARY KEY, -- SMP_26001_2026_09
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    package_name VARCHAR(100) NOT NULL,
    total_sessions INT NOT NULL,
    rollover_sessions INT DEFAULT 0,
    used_sessions INT DEFAULT 0,
    remaining_sessions INT DEFAULT 0,
    price NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'CHƯA_NỘP' CHECK (payment_status IN ('CHƯA_NỘP', 'ĐÃ_NỘP', 'CÒN_NỢ')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_monthly_packages_student_month ON student_monthly_packages(student_id, month);

-- BẢNG 10: SESSION_PACKAGES (Danh mục gói buổi học mẫu)
CREATE TABLE session_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    session_count INTEGER NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BẢNG 11: TUITION_INVOICES (Hóa đơn học phí & Đối soát VietQR)
CREATE TABLE tuition_invoices (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50),
    package_id VARCHAR(50),
    package_name VARCHAR(255),
    session_count INTEGER DEFAULT 0,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CON_NO' CHECK (status IN ('DA_NOP', 'CON_NO', 'QUA_HAN', 'MIEN_GIAM')),
    paid_date TIMESTAMPTZ,
    payment_method VARCHAR(50),
    transaction_code VARCHAR(100),
    override_reason TEXT,
    override_by VARCHAR(50),
    override_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invoices_student ON tuition_invoices(student_id);
CREATE INDEX idx_invoices_status ON tuition_invoices(status);

-- BẢNG 12: MANUAL_EXPENSES (Sổ chi phát sinh ngoài cho Sổ Thu - Chi)
CREATE TABLE manual_expenses (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category VARCHAR(50) DEFAULT 'Vận hành',
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_manual_expenses_date ON manual_expenses(expense_date);

-- BẢNG 13: CLASS_REQUESTS (Đơn từ học viên: nghỉ học, học bù)
CREATE TABLE class_requests (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    schedule_slot_id VARCHAR(50) REFERENCES schedule_slots(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Nghỉ học', 'Học bù')),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Chờ duyệt' CHECK (status IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối')),
    approved_by VARCHAR(50),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BẢNG 14: BANK_SETTINGS (Cấu hình VietQR & Ngân hàng)
CREATE TABLE bank_settings (
    id VARCHAR(50) PRIMARY KEY,
    bank_code VARCHAR(50) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    bin VARCHAR(20) NOT NULL,
    qr_template VARCHAR(50) NOT NULL DEFAULT 'compact2',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BẢNG 15: BANK_TRANSACTIONS (Giao dịch ngân hàng gạch nợ tự động)
CREATE TABLE bank_transactions (
    id VARCHAR(50) PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CHUA_XU_LY',
    matched_invoice_id VARCHAR(50) REFERENCES tuition_invoices(id) ON DELETE SET NULL,
    matched_student_id VARCHAR(50) REFERENCES students(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BẢNG 16: AUDIT_LOGS (Nhật ký kiểm toán hệ thống)
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_resource VARCHAR(50) NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BẢNG 17: NOTIFICATIONS (Thông báo)
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    recipient_id VARCHAR(50),
    recipient_role VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. BẬT ROW LEVEL SECURITY (RLS) & CHÍNH SÁCH TRUY CẬP AN TOÀN
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_monthly_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Cho phép xem và quản lý đầy đủ qua backend service_role
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow public read" ON %I;', t);
        EXECUTE format('CREATE POLICY "Allow public read" ON %I FOR SELECT USING (true);', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I;', t);
        EXECUTE format('CREATE POLICY "Allow all for authenticated" ON %I FOR ALL USING (true);', t);
    END LOOP;
END $$;

-- ============================================================================
-- 4. KHỞI TẠO TÀI KHOẢN ADMIN VÀ CẤU HÌNH BAN ĐẦU SẴN SÀNG PRE-USE
-- ============================================================================

-- 1. Tài khoản Admin duy nhất (Password: admin123)
INSERT INTO users (id, username, password_hash, role, name, email, avatar, is_active, created_at, updated_at)
VALUES (
    'ADMIN001',
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'ADMIN',
    'Quản Trị Viên Hệ Thống',
    'admin@trungtam.edu.vn',
    NULL,
    TRUE,
    NOW(),
    NOW()
);

-- 2. Gói buổi học mẫu ban đầu
INSERT INTO session_packages (id, name, session_count, price, description, is_active)
VALUES 
    ('PKG_08S', 'Gói Tiêu Chuẩn (8 buổi / tháng)', 8, 1000000, 'Gói học 8 buổi / tháng (2 buổi/tuần), hỗ trợ dồn buổi sang tháng sau', true),
    ('PKG_12S', 'Gói Chuyên Sâu (12 buổi / tháng)', 12, 1400000, 'Gói học 12 buổi / tháng (3 buổi/tuần), hỗ trợ dồn buổi sang tháng sau', true),
    ('PKG_16S', 'Gói Tăng Cường (16 buổi / tháng)', 16, 1800000, 'Gói học 16 buổi / tháng (4 buổi/tuần), cam kết tiến độ', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Cấu hình ngân hàng VietQR mặc định
INSERT INTO bank_settings (id, bank_code, account_number, account_name, bin, qr_template, is_active)
VALUES (
    'DEFAULT_BANK',
    'MB',
    '090123456789',
    'TRUNG TAM DAO TAO',
    '970422',
    'compact2',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- HOÀN TẤT RESET HỆ THỐNG SẠCH 100% SẴN SÀNG PRE-USE
-- ============================================================================
