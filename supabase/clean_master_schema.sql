-- ============================================================================
-- MASTER CLEAN DATABASE SCHEMA FOR STUDENT MANAGEMENT (SUPABASE POSTGRESQL)
-- ============================================================================
-- Schema chuẩn hóa, tối giản, đồng bộ 100% với Webapp Next.js / Cloudflare OpenNext.
-- Loại bỏ hoàn toàn các bảng rườm rà (time_shifts cũ).
-- Bảng classes chứa trực tiếp khung giờ custom (start_time, end_time),
-- thứ học trong tuần (schedule_days) và tùy chọn chạy xuyên suốt (is_recurring).
-- Bảng schedule_slots lưu trực tiếp start_time, end_time, class_id, date, status.
-- ============================================================================

-- 1. BẢNG USERS (Tài khoản người dùng: ADMIN, TEACHER, STUDENT)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. BẢNG TEACHERS (Hồ sơ Giảng viên)
CREATE TABLE IF NOT EXISTS public.teachers (
    id VARCHAR(50) PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    specialty VARCHAR(100) DEFAULT 'Toán',
    hourly_rate NUMERIC(12, 0) DEFAULT 0,
    rate_per_session NUMERIC(12, 0) NOT NULL DEFAULT 250000,
    status VARCHAR(50) NOT NULL DEFAULT 'Đang dạy',
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BẢNG STUDENTS (Hồ sơ Học viên)
CREATE TABLE IF NOT EXISTS public.students (
    id VARCHAR(50) PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    discord_id VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Đang học',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BẢNG CLASSROOMS (Phòng học / Phòng phụ trợ)
CREATE TABLE IF NOT EXISTS public.classrooms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 20,
    facilities TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BẢNG CLASSES (Lớp học - Chứa giờ học custom & chạy xuyên suốt)
CREATE TABLE IF NOT EXISTS public.classes (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher_id VARCHAR(50) REFERENCES public.teachers(id) ON DELETE SET NULL,
    room_id VARCHAR(50) NOT NULL DEFAULT 'P.101',
    start_time VARCHAR(10) NOT NULL DEFAULT '18:30', -- Giờ bắt đầu custom (VD: "18:30")
    end_time VARCHAR(10) NOT NULL DEFAULT '20:30',   -- Giờ kết thúc custom (VD: "20:30")
    schedule_days INT[] NOT NULL DEFAULT '{2,4,6}',  -- Thứ trong tuần [2, 4, 6] (8 là Chủ Nhật)
    is_recurring BOOLEAN NOT NULL DEFAULT true,      -- Chạy xuyên suốt liên tục
    tuition_fee NUMERIC(12, 0) NOT NULL DEFAULT 1500000,
    meeting_link TEXT,                               -- Link phòng học Discord
    student_ids TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'Đang mở',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BẢNG SCHEDULE_SLOTS (Các ca học thực tế diễn ra theo từng ngày)
CREATE TABLE IF NOT EXISTS public.schedule_slots (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id VARCHAR(50) REFERENCES public.teachers(id) ON DELETE SET NULL,
    room_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,                              -- Ngày diễn ra ca học (YYYY-MM-DD)
    start_time VARCHAR(10) NOT NULL,                 -- Giờ thực tế ca học
    end_time VARCHAR(10) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    meeting_link TEXT,
    topic TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Đã lên lịch', -- 'Đã lên lịch', 'Đang học', 'Đã hoàn thành', 'Đã hủy'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. BẢNG ATTENDANCE_RECORDS (Sổ Điểm Danh Học Viên)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id VARCHAR(50) PRIMARY KEY,
    schedule_slot_id VARCHAR(50) REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
    student_id VARCHAR(50) REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CÓ_MẶT', -- 'CÓ_MẶT', 'VẮNG_MẶT', 'ĐI_MUỘN', 'NGHỈ_CÓ_PHÉP'
    note TEXT,
    checkin_time TIMESTAMPTZ,
    method VARCHAR(20) DEFAULT 'MANUAL',          -- 'MANUAL', 'BOT', 'ADMIN_OVERRIDE'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. BẢNG TUITION_INVOICES (Hóa Đơn Thu Học Phí)
CREATE TABLE IF NOT EXISTS public.tuition_invoices (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES public.students(id) ON DELETE CASCADE,
    class_id VARCHAR(50),
    month VARCHAR(10) NOT NULL,                    -- YYYY-MM (VD: '2026-09')
    amount NUMERIC(12, 0) NOT NULL,
    paid_amount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(12, 0) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CHƯA_NỘP',-- 'CHƯA_NỘP', 'CÒN_NỢ', 'ĐÃ_NỘP', 'QUÁ_HẠN'
    due_date DATE,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. BẢNG MANUAL_EXPENSES (Sổ Chi Vận Hành & Lương Giáo Viên)
CREATE TABLE IF NOT EXISTS public.manual_expenses (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 0) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Vận hành', -- 'Mặt bằng', 'Thiết bị', 'Giáo trình', 'Lương GV', 'Vận hành', 'Khác'
    expense_date DATE NOT NULL,
    note TEXT,
    created_by VARCHAR(50) NOT NULL DEFAULT 'ADMIN001',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. BẢNG AUDIT_LOGS (Nhật Ký Kiểm Toán Hệ Thống)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,                   -- 'CREATE', 'UPDATE', 'DELETE', 'CHECKIN', etc.
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    target_resource VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES TỐI ƯU HÓA TRUY VẤN
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.schedule_slots(date);
CREATE INDEX IF NOT EXISTS idx_slots_class_id ON public.schedule_slots(class_id);
CREATE INDEX IF NOT EXISTS idx_slots_teacher_id ON public.schedule_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_att_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_att_slot ON public.attendance_records(schedule_slot_id);
CREATE INDEX IF NOT EXISTS idx_invoices_month ON public.tuition_invoices(month);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.manual_expenses(expense_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - CẤP QUYỀN ĐỒNG BỘ CHO SERVICE ROLE & ANON
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated and service" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow all for authenticated and service" ON public.%I FOR ALL USING (true)', tbl);
    END LOOP;
END $$;

-- ============================================================================
-- SEED DỮ LIỆU MẪU THỰC TẾ & CHẠY XUYÊN SUỐT
-- ============================================================================
-- 1. Admin & Users
INSERT INTO public.users (id, username, password_hash, role, name, email) VALUES
('ADMIN001', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'ADMIN', 'Quản Trị Viên Hệ Thống', 'admin@trungtam.edu.vn'),
('GV001', 'gv001', 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416', 'TEACHER', 'ThS. Nguyễn Văn An', 'gv001@trungtam.edu.vn'),
('GV002', 'gv002', 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416', 'TEACHER', 'TS. Trần Thị Mai', 'gv002@trungtam.edu.vn'),
('GV003', 'gv003', 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416', 'TEACHER', 'ThS. Lê Quốc Tuấn', 'gv003@trungtam.edu.vn'),
('ST001', 'st001', '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'STUDENT', 'Phạm Minh Đức', 'st001@hocvien.edu.vn'),
('ST002', 'st002', '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'STUDENT', 'Hoàng Ngọc Ánh', 'st002@hocvien.edu.vn')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

-- 2. Teachers
INSERT INTO public.teachers (id, name, phone, email, specialty, rate_per_session, status) VALUES
('GV001', 'ThS. Nguyễn Văn An', '0901234567', 'gv001@trungtam.edu.vn', 'Toán Cao Cấp & Tư Duy', 350000, 'Đang dạy'),
('GV002', 'TS. Trần Thị Mai', '0907654321', 'gv002@trungtam.edu.vn', 'IELTS & Tiếng Anh Học Thuật', 400000, 'Đang dạy'),
('GV003', 'ThS. Lê Quốc Tuấn', '0912345678', 'gv003@trungtam.edu.vn', 'Lập trình Fullstack & AI', 450000, 'Đang dạy')
ON CONFLICT (id) DO UPDATE SET specialty = EXCLUDED.specialty, rate_per_session = EXCLUDED.rate_per_session;

-- 3. Students
INSERT INTO public.students (id, name, phone, email, status) VALUES
('ST001', 'Phạm Minh Đức', '0381234567', 'st001@hocvien.edu.vn', 'Đang học'),
('ST002', 'Hoàng Ngọc Ánh', '0398765432', 'st002@hocvien.edu.vn', 'Đang học')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- 4. Classrooms
INSERT INTO public.classrooms (id, name, capacity, facilities, status) VALUES
('P.101', 'Phòng Lý Thuyết 101', 35, ARRAY['Máy chiếu', 'Điều hòa', 'Loa âm trần'], 'Khả dụng'),
('P.201', 'Phòng Lab Máy Tính 201', 30, ARRAY['30 PC Core i7', 'Điều hòa', 'Mạng LAN gigabit'], 'Khả dụng'),
('P.301', 'Phòng Ngoại Ngữ 301', 25, ARRAY['Tai nghe trợ thính', 'Bảng thông minh', 'Điều hòa'], 'Khả dụng')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 5. Classes (Custom start_time, end_time, schedule_days, is_recurring = true)
INSERT INTO public.classes (id, code, name, subject, teacher_id, room_id, start_time, end_time, schedule_days, is_recurring, tuition_fee, meeting_link, student_ids, status) VALUES
('CLS01', 'MATH101', 'Toán Cao Cấp Khóa 1', 'Toán Cao Cấp', 'GV001', 'P.101', '18:30', '20:30', '{2,4,6}', true, 1800000, 'https://discord.com/channels/edu-center/room-cls01', ARRAY['ST001', 'ST002'], 'Đang mở'),
('CLS02', 'ENG201', 'IELTS Master 7.0+', 'Tiếng Anh', 'GV002', 'P.301', '19:00', '21:00', '{3,5,7}', true, 2500000, 'https://discord.com/channels/edu-center/room-cls02', ARRAY['ST001'], 'Đang mở'),
('CLS03', 'PROG301', 'Lập trình Fullstack Web & Cloud', 'Lập trình', 'GV003', 'P.201', '14:00', '16:00', '{7,8}', true, 2800000, 'https://discord.com/channels/edu-center/room-cls03', ARRAY['ST002'], 'Đang mở')
ON CONFLICT (id) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_recurring = EXCLUDED.is_recurring;

-- 6. Schedule Slots mẫu (Khớp đúng giờ custom của lớp)
INSERT INTO public.schedule_slots (id, class_id, teacher_id, room_id, date, start_time, end_time, subject, meeting_link, status) VALUES
('SCH0001', 'CLS01', 'GV001', 'P.101', '2026-09-23', '18:30', '20:30', 'Toán Cao Cấp', 'https://discord.com/channels/edu-center/room-cls01', 'Đã lên lịch'),
('SCH0002', 'CLS02', 'GV002', 'P.301', '2026-09-24', '19:00', '21:00', 'Tiếng Anh', 'https://discord.com/channels/edu-center/room-cls02', 'Đã lên lịch'),
('SCH0003', 'CLS03', 'GV003', 'P.201', '2026-09-26', '14:00', '16:00', 'Lập trình', 'https://discord.com/channels/edu-center/room-cls03', 'Đã lên lịch')
ON CONFLICT (id) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
