-- ============================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR STUDENT MANAGEMENT SYSTEM
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username CITEXT NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    name VARCHAR(255) NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    avatar TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 2. CLASSROOMS TABLE
CREATE TABLE IF NOT EXISTS classrooms (
    id VARCHAR(50) PRIMARY KEY, -- e.g. P.101, P.102
    name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 30,
    facilities TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'Khả dụng' CHECK (status IN ('Khả dụng', 'Bảo trì')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email CITEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    specialty VARCHAR(255) NOT NULL,
    hourly_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Đang dạy' CHECK (status IN ('Đang dạy', 'Nghỉ phép')),
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

-- 4. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email CITEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Nam', 'Nữ')),
    address TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Đang học' CHECK (status IN ('Đang học', 'Bảo lưu', 'Đã tốt nghiệp')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- 5. CLASSES TABLE
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(50) PRIMARY KEY, -- e.g. CLS01, CLS02
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g. MATH101, ENG201
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(50) NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    room_id VARCHAR(50) NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
    tuition_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    schedule_days INTEGER[] NOT NULL DEFAULT '{}', -- e.g. [2, 4, 6]
    shift_id INTEGER NOT NULL CHECK (shift_id BETWEEN 1 AND 5),
    meeting_link TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Đang mở' CHECK (status IN ('Đang mở', 'Sắp khai giảng', 'Đã kết thúc')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_room_id ON classes(room_id);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);

-- 6. CLASS_STUDENTS (RELATION N-N)
CREATE TABLE IF NOT EXISTS class_students (
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);

-- 7. SCHEDULE_SLOTS TABLE
CREATE TABLE IF NOT EXISTS schedule_slots (
    id VARCHAR(50) PRIMARY KEY, -- e.g. SCH0001
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id VARCHAR(50) NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    room_id VARCHAR(50) NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    shift_id INTEGER NOT NULL CHECK (shift_id BETWEEN 1 AND 5),
    start_time VARCHAR(10) NOT NULL, -- e.g. "08:00"
    end_time VARCHAR(10) NOT NULL,   -- e.g. "10:00"
    subject VARCHAR(255) NOT NULL,
    topic TEXT,
    meeting_link TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Đã lên lịch' CHECK (status IN ('Đã lên lịch', 'Đã hoàn thành', 'Đã hủy', 'Đổi lịch')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_slots_class_id ON schedule_slots(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_teacher_id ON schedule_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_room_id ON schedule_slots(room_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_date ON schedule_slots(date);

-- 8. ATTENDANCE_RECORDS TABLE
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(50) PRIMARY KEY, -- e.g. ATT00001
    schedule_slot_id VARCHAR(50) NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Có mặt', 'Vắng có phép', 'Vắng không phép', 'Đi muộn')),
    checkin_time VARCHAR(20),
    note TEXT,
    updated_by VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_slot_student UNIQUE (schedule_slot_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_slot_id ON attendance_records(schedule_slot_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);

-- 9. CLASS_REQUESTS TABLE
CREATE TABLE IF NOT EXISTS class_requests (
    id VARCHAR(50) PRIMARY KEY, -- e.g. REQ001
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    schedule_slot_id VARCHAR(50) NOT NULL REFERENCES schedule_slots(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('XIN_NGHI', 'DOI_LICH')),
    reason TEXT NOT NULL,
    target_schedule_slot_id VARCHAR(50) REFERENCES schedule_slots(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CHỜ_DUYỆT' CHECK (status IN ('CHỜ_DUYỆT', 'ĐÃ_DUYỆT', 'TỪ_CHỐI')),
    reviewed_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_class_requests_student_id ON class_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_class_requests_class_id ON class_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_class_requests_status ON class_requests(status);

-- 10. TUITION_INVOICES TABLE
CREATE TABLE IF NOT EXISTS tuition_invoices (
    id VARCHAR(50) PRIMARY KEY, -- e.g. TUI0001
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Đã nộp', 'Còn nợ', 'Quá hạn')),
    paid_date DATE,
    payment_method VARCHAR(50) CHECK (payment_method IN ('Chuyển khoản QR', 'Tiền mặt', 'Thẻ ngân hàng')),
    transaction_code VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoices_student_id ON tuition_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_class_id ON tuition_invoices(class_id);
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_status ON tuition_invoices(status);

-- 11. TEACHER_PAYROLL_PERIODS (PAYROLL RECORDS) TABLE
CREATE TABLE IF NOT EXISTS teacher_payroll_periods (
    id VARCHAR(50) PRIMARY KEY, -- e.g. PAY001
    teacher_id VARCHAR(50) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    month VARCHAR(10) NOT NULL, -- e.g. "2026-09"
    total_slots INTEGER NOT NULL DEFAULT 0,
    total_hours NUMERIC(8, 2) NOT NULL DEFAULT 0,
    hourly_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    gross_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deduction NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Tạm tính' CHECK (status IN ('Đã chốt', 'Đã thanh toán', 'Tạm tính')),
    paid_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_teacher_payroll_month UNIQUE (teacher_id, month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_teacher_id ON teacher_payroll_periods(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON teacher_payroll_periods(month);

-- 12. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY, -- e.g. AUD0001
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_resource VARCHAR(50) NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'NOTIF_' || uuid_generate_v4(),
    recipient_role VARCHAR(20) CHECK (recipient_role IN ('ALL', 'ADMIN', 'TEACHER', 'STUDENT')),
    recipient_user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'SCHEDULE', 'PAYMENT', 'REQUEST')),
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);


-- 14. HOMEWORK_TASKS TABLE
CREATE TABLE IF NOT EXISTS homework_tasks (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homework_tasks_class_id ON homework_tasks(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_tasks_deadline ON homework_tasks(deadline);

-- 15. HOMEWORK_SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS homework_submissions (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL REFERENCES homework_tasks(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'DA_NOP' CHECK (status IN ('CHUA_NOP', 'DA_NOP', 'TRE_HAN')),
    discord_message_url TEXT,
    note TEXT,
    CONSTRAINT uq_task_student UNIQUE (task_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_homework_submissions_task_id ON homework_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id ON homework_submissions(student_id);

ALTER TABLE homework_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions DISABLE ROW LEVEL SECURITY;

-- Disable Row Level Security (RLS) for server-side service role access or enable full service-role bypass
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_students DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payroll_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

