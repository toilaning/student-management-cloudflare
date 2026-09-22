-- ============================================================================
-- SCRIPT ĐỒNG BỘ TOÀN DIỆN & LÀM SẠCH 100% CƠ SỞ DỮ LIỆU SUPABASE
-- (Dán và bấm RUN trong Supabase Dashboard -> SQL Editor)
-- ============================================================================

-- 1. Bỏ toàn bộ check constraint cũ làm chặn trạng thái tiếng Việt
ALTER TABLE public.schedule_slots DROP CONSTRAINT IF EXISTS schedule_slots_status_check;
ALTER TABLE public.schedule_slots DROP CONSTRAINT IF EXISTS schedule_slots_shift_id_check;
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_shift_id_check;
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_status_check;

-- 2. Thêm các cột mới phục vụ giờ học custom & chạy xuyên suốt
ALTER TABLE public.classes 
    ADD COLUMN IF NOT EXISTS start_time VARCHAR(10) DEFAULT '18:30',
    ADD COLUMN IF NOT EXISTS end_time VARCHAR(10) DEFAULT '20:30',
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS meeting_link TEXT,
    ADD COLUMN IF NOT EXISTS student_ids TEXT[] DEFAULT '{}';

ALTER TABLE public.schedule_slots 
    ADD COLUMN IF NOT EXISTS start_time VARCHAR(10) DEFAULT '18:30',
    ADD COLUMN IF NOT EXISTS end_time VARCHAR(10) DEFAULT '20:30',
    ADD COLUMN IF NOT EXISTS subject VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS meeting_link TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.classrooms 
    ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Khả dụng',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Cho phép room_id và tuition_fee là optional
ALTER TABLE public.classes ALTER COLUMN room_id DROP NOT NULL;
ALTER TABLE public.classes ALTER COLUMN tuition_fee DROP NOT NULL;
ALTER TABLE public.schedule_slots ALTER COLUMN room_id DROP NOT NULL;

-- 4. Tạo bảng time_shifts nếu cần
CREATE TABLE IF NOT EXISTS public.time_shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_hours NUMERIC(4, 1) NOT NULL DEFAULT 3.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Cấp quyền đầy đủ (Row Level Security) cho Service Role và Anon
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated and service" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow all for authenticated and service" ON public.%I FOR ALL USING (true);', tbl);
    END LOOP;
END $$;

-- 6. Seed tài khoản, giảng viên, phòng và lớp mẫu
INSERT INTO public.users (id, username, password_hash, role, name, email) VALUES
('ADMIN001', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'ADMIN', 'Quản Trị Viên Hệ Thống', 'admin@trungtam.edu.vn'),
('GV001', 'gv001', 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416', 'TEACHER', 'ThS. Nguyễn Văn An', 'gv001@trungtam.edu.vn'),
('GV002', 'gv002', 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416', 'TEACHER', 'TS. Trần Thị Mai', 'gv002@trungtam.edu.vn'),
('GV003', 'gv003', 'cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416', 'TEACHER', 'ThS. Lê Quốc Tuấn', 'gv003@trungtam.edu.vn'),
('ST001', 'st001', '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'STUDENT', 'Phạm Minh Đức', 'st001@hocvien.edu.vn'),
('ST002', 'st002', '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'STUDENT', 'Hoàng Ngọc Ánh', 'st002@hocvien.edu.vn')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

INSERT INTO public.teachers (id, name, phone, email, specialty, rate_per_session, status) VALUES
('GV001', 'ThS. Nguyễn Văn An', '0901234567', 'gv001@trungtam.edu.vn', 'Toán Cao Cấp', 350000, 'Đang dạy'),
('GV002', 'TS. Trần Thị Mai', '0907654321', 'gv002@trungtam.edu.vn', 'Tiếng Anh', 400000, 'Đang dạy'),
('GV003', 'ThS. Lê Quốc Tuấn', '0912345678', 'gv003@trungtam.edu.vn', 'Lập trình', 450000, 'Đang dạy')
ON CONFLICT (id) DO UPDATE SET specialty = EXCLUDED.specialty, rate_per_session = EXCLUDED.rate_per_session;

INSERT INTO public.students (id, name, phone, email, status) VALUES
('ST001', 'Phạm Minh Đức', '0381234567', 'st001@hocvien.edu.vn', 'Đang học'),
('ST002', 'Hoàng Ngọc Ánh', '0398765432', 'st002@hocvien.edu.vn', 'Đang học')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.classrooms (id, name, capacity, facilities, status) VALUES
('P.101', 'Phòng 101', 30, ARRAY['Máy chiếu', 'Điều hòa'], 'Khả dụng'),
('P.201', 'Phòng Lab 201', 25, ARRAY['Máy tính', 'Điều hòa'], 'Khả dụng'),
('P.301', 'Phòng 301', 20, ARRAY['Bảng thông minh'], 'Khả dụng')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.classes (id, code, name, subject, teacher_id, room_id, start_time, end_time, schedule_days, is_recurring, tuition_fee, meeting_link, status) VALUES
('CLS01', 'MATH101', 'Toán Cao Cấp Khóa 1', 'Toán Cao Cấp', 'GV001', 'P.101', '18:30', '20:30', '{2,4,6}', true, 1800000, 'https://discord.com/channels/edu-center/room-cls01', 'Đang mở'),
('CLS02', 'ENG201', 'IELTS Master 7.0+', 'Tiếng Anh', 'GV002', 'P.301', '19:00', '21:00', '{3,5,7}', true, 2500000, 'https://discord.com/channels/edu-center/room-cls02', 'Đang mở')
ON CONFLICT (id) DO UPDATE 
SET start_time = EXCLUDED.start_time, 
    end_time = EXCLUDED.end_time, 
    is_recurring = EXCLUDED.is_recurring,
    meeting_link = EXCLUDED.meeting_link;

INSERT INTO public.schedule_slots (id, class_id, teacher_id, room_id, date, start_time, end_time, subject, meeting_link, status) VALUES
('SCH0001', 'CLS01', 'GV001', 'P.101', CURRENT_DATE, '18:30', '20:30', 'Toán Cao Cấp', 'https://discord.com/channels/edu-center/room-cls01', 'Đã lên lịch'),
('SCH0002', 'CLS02', 'GV002', 'P.301', CURRENT_DATE, '19:00', '21:00', 'Tiếng Anh', 'https://discord.com/channels/edu-center/room-cls02', 'Đang học'),
('SCH0003', 'CLS01', 'GV001', 'P.101', CURRENT_DATE + INTERVAL '2 day', '18:30', '20:30', 'Toán Cao Cấp', 'https://discord.com/channels/edu-center/room-cls01', 'Đã lên lịch')
ON CONFLICT (id) DO UPDATE 
SET start_time = EXCLUDED.start_time, 
    end_time = EXCLUDED.end_time,
    date = EXCLUDED.date;

-- 7. Làm mới schema cache của PostgREST
NOTIFY pgrst, 'reload schema';
