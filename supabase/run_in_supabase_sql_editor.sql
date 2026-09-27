-- ============================================================================
-- SCRIPT ĐỒNG BỘ HOÀN HẢO CHO SUPABASE SQL EDITOR (CHẠY 1 LẦN LÀ CHUẨN 100%)
-- ============================================================================
-- Khắc phục lỗi: Bảng cũ đã tồn tại nên "CREATE TABLE IF NOT EXISTS" không thêm cột mới.
-- Script này tự động bổ sung toàn bộ các cột cần thiết (start_time, end_time, is_recurring,
-- subject, meeting_link) và reload schema cache của Supabase.
-- ============================================================================

-- 1. Bổ sung các cột mới vào bảng CLASSES nếu chưa có
ALTER TABLE public.classes 
    ADD COLUMN IF NOT EXISTS start_time VARCHAR(10) DEFAULT '18:30',
    ADD COLUMN IF NOT EXISTS end_time VARCHAR(10) DEFAULT '20:30',
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS meeting_link TEXT,
    ADD COLUMN IF NOT EXISTS student_ids TEXT[] DEFAULT '{}';

-- 2. Bổ sung các cột mới vào bảng SCHEDULE_SLOTS nếu chưa có
ALTER TABLE public.schedule_slots 
    ADD COLUMN IF NOT EXISTS start_time VARCHAR(10) DEFAULT '18:30',
    ADD COLUMN IF NOT EXISTS end_time VARCHAR(10) DEFAULT '20:30',
    ADD COLUMN IF NOT EXISTS subject VARCHAR(255) DEFAULT '',
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS meeting_link TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Bổ sung cột vào bảng CLASSROOMS nếu chưa có
ALTER TABLE public.classrooms 
    ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Khả dụng',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Bỏ ràng buộc NOT NULL của room_id và tuition_fee trong classes (vì lớp Online không bắt buộc phòng phụ & học phí)
ALTER TABLE public.classes ALTER COLUMN room_id DROP NOT NULL;
ALTER TABLE public.classes ALTER COLUMN tuition_fee DROP NOT NULL;

-- 5. Bỏ ràng buộc shift_id BETWEEN 1 AND 5 (cho phép tùy biến ca hoặc lớp chạy giờ tự do)
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_shift_id_check;
ALTER TABLE public.schedule_slots DROP CONSTRAINT IF EXISTS schedule_slots_shift_id_check;

-- 6. Cấp quyền đầy đủ (Row Level Security) cho service role & anon
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

-- 7. Seed dữ liệu lớp học mẫu chuẩn xác (chạy xuyên suốt, giờ custom)
INSERT INTO public.classes (id, code, name, subject, teacher_id, room_id, start_time, end_time, schedule_days, is_recurring, tuition_fee, meeting_link, status) VALUES
('CLS01', 'MATH101', 'Toán Cao Cấp Khóa 1', 'Toán Cao Cấp', 'ADMIN001', 'P.101', '18:30', '20:30', '{2,4,6}', true, 1800000, 'https://meet.google.com/edu-room-cls01', 'Đang mở'),
('CLS02', 'ENG201', 'IELTS Master 7.0+', 'Tiếng Anh', 'ADMIN001', 'P.101', '19:00', '21:00', '{3,5,7}', true, 2500000, 'https://meet.google.com/edu-room-cls02', 'Đang mở')
ON CONFLICT (id) DO UPDATE 
SET start_time = EXCLUDED.start_time, 
    end_time = EXCLUDED.end_time, 
    is_recurring = EXCLUDED.is_recurring,
    meeting_link = EXCLUDED.meeting_link;

-- 8. Seed ca học mẫu hôm nay và ngày tới
INSERT INTO public.schedule_slots (id, class_id, teacher_id, room_id, date, start_time, end_time, subject, meeting_link, status) VALUES
('SCH0001', 'CLS01', 'ADMIN001', 'P.101', CURRENT_DATE, '18:30', '20:30', 'Toán Cao Cấp', 'https://meet.google.com/edu-room-cls01', 'Đã lên lịch'),
('SCH0002', 'CLS02', 'ADMIN001', 'P.101', CURRENT_DATE + INTERVAL '1 day', '19:00', '21:00', 'Tiếng Anh', 'https://meet.google.com/edu-room-cls02', 'Đã lên lịch')
ON CONFLICT (id) DO UPDATE 
SET start_time = EXCLUDED.start_time, 
    end_time = EXCLUDED.end_time,
    date = EXCLUDED.date;

-- 9. Làm mới schema cache của Supabase PostgREST
NOTIFY pgrst, 'reload schema';
