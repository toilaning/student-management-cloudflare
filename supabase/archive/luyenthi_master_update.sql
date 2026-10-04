-- ============================================================================
-- SCRIPT CẬP NHẬT DATABASE SUPABASE THEO ĐẶC TẢ MR. THUYẾT (LUYỆN THI VẼ 2026)
-- (Copy toàn bộ mã này dán vào Supabase Dashboard -> SQL Editor và bấm RUN)
-- ============================================================================

-- 1. Bổ sung các cột chuyên sâu cho bảng STUDENTS
ALTER TABLE public.students 
    ADD COLUMN IF NOT EXISTS home_town VARCHAR(255),
    ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50) DEFAULT 'Lớp 12',
    ADD COLUMN IF NOT EXISTS target_university VARCHAR(100) DEFAULT 'HAU',
    ADD COLUMN IF NOT EXISTS custom_university VARCHAR(255),
    ADD COLUMN IF NOT EXISTS exam_block VARCHAR(20) DEFAULT 'KHOI_V',
    ADD COLUMN IF NOT EXISTS study_goal TEXT,
    ADD COLUMN IF NOT EXISTS facebook_url TEXT,
    ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS other_notes TEXT,
    ADD COLUMN IF NOT EXISTS registered_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS total_sessions_in_month INT DEFAULT 12,
    ADD COLUMN IF NOT EXISTS attended_sessions_in_month INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS absent_sessions_in_month INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remaining_sessions INT DEFAULT 12;

-- 2. Bỏ các ràng buộc check cũ để cho phép các trạng thái và khối thi tự do
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_exam_block_check;

-- 3. Tạo Indexes tối ưu hóa tìm kiếm theo Trường ĐH, Khối thi, và Trạng thái
CREATE INDEX IF NOT EXISTS idx_students_target_uni ON public.students(target_university);
CREATE INDEX IF NOT EXISTS idx_students_exam_block ON public.students(exam_block);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_remaining ON public.students(remaining_sessions);

-- 4. Bổ sung cột ghi nhận điểm danh và số buổi học bù cho bảng ATTENDANCE_RECORDS
ALTER TABLE public.attendance_records
    ADD COLUMN IF NOT EXISTS is_makeup BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS original_slot_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS makeup_reason TEXT;

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

-- 6. Làm mới schema cache của Supabase PostgREST ngay lập tức
NOTIFY pgrst, 'reload schema';
