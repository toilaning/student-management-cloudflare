-- ============================================================================
-- SCRIPT TỐI ƯU & CHUẨN HÓA DATABASE SUPABASE — VẬN HÀNH KHÔNG LỖI
-- Hệ thống: Student Management (Next.js 14 + Cloudflare Workers + Supabase)
-- Ngày: 2026-09-28
-- ----------------------------------------------------------------------------
-- CÁCH CHẠY:
--   1. Mở Supabase Dashboard -> SQL Editor -> New query
--   2. Dán TOÀN BỘ nội dung file này -> bấm RUN
--   3. Script HOÀN TOÀN IDEMPOTENT (chạy lại nhiều lần không gây lỗi):
--      dùng CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
--      ON CONFLICT DO NOTHING/UPDATE.
-- ----------------------------------------------------------------------------
-- SỬA CÁC LỖI DRIFT (lệch cột) giữa DB và code (src/repositories/SupabaseRepository.ts):
--   ✅ tuition_invoices        : thêm cột `note` (code ghi `note`, DB đang có `notes`)
--   ✅ teacher_payroll_periods : thêm total_hours, hourly_rate, gross_salary,
--                                deduction, paid_date (code đọc/ghi các cột này)
--   ✅ time_shifts             : seed đầy đủ 5 ca (DB đang rỗng -> app fallback cứng)
--   ⚠️ classes.student_ids     : cột "chết" (code chỉ dùng bảng join class_students),
--                                tùy chọn DROP ở cuối file (được comment, tự quyết)
-- ============================================================================

-- 0. Extension cần thiết
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- 1. BẢNG TIME_SHIFTS (đảm bảo tồn tại + seed đủ 5 ca)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.time_shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_hours NUMERIC(4, 1) NOT NULL DEFAULT 2.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed 5 ca (id cố định 1..5 khớp TIME_SHIFTS trong src/types/schedule.ts)
INSERT INTO public.time_shifts (id, name, start_time, end_time, duration_hours, is_active, sort_order) VALUES
    (1, 'Ca 1 (08:00 - 10:00)', '08:00', '10:00', 2.0, true, 1),
    (2, 'Ca 2 (10:15 - 12:15)', '10:15', '12:15', 2.0, true, 2),
    (3, 'Ca 3 (13:30 - 15:30)', '13:30', '15:30', 2.0, true, 3),
    (4, 'Ca 4 (15:45 - 17:45)', '15:45', '17:45', 2.0, true, 4),
    (5, 'Ca 5 (18:30 - 20:30)', '18:30', '20:30', 2.0, true, 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    duration_hours = EXCLUDED.duration_hours,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;
-- Đồng bộ sequence để tránh trùng id khi thêm ca mới sau này
SELECT setval('time_shifts_id_seq', GREATEST((SELECT MAX(id) FROM time_shifts), 5));

-- ============================================================================
-- 2. TUITION_INVOICES — thêm cột `note` khớp code (mapper ghi `note` số ít)
-- ============================================================================
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS note TEXT;               -- code đọc/ghi `note` (singular)
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS session_count INT DEFAULT 0;   -- Số buổi trong gói
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS used_sessions INT DEFAULT 0;   -- Số buổi đã dùng
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS transaction_code VARCHAR(100);
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS package_id VARCHAR(50);
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.tuition_invoices
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 3b. SỬA DRIFT KIỂU CỘT attendance_records.checkin_time
-- ----------------------------------------------------------------------------
-- Drift giữa schema.sql (VARCHAR) và clean_master_schema.sql (TIMESTAMPTZ).
-- Code ứng dụng ghi checkin_time dạng chuỗi giờ "HH:mm:ss" (VD: "08:00:05"),
-- nên cột PHẢI là VARCHAR, không phải TIMESTAMPTZ (nếu không điểm danh sẽ lỗi).
-- ============================================================================
ALTER TABLE public.attendance_records
    ALTER COLUMN checkin_time TYPE VARCHAR(20)
    USING CASE
        WHEN checkin_time IS NULL THEN NULL
        WHEN checkin_time::text ~ '^[0-9]{2}:[0-9]{2}' THEN checkin_time::text
        ELSE to_char(checkin_time, 'HH24:MI:SS')
    END;

-- ============================================================================
-- 3. TEACHER_PAYROLL_PERIODS — thêm cột khớp code (mapper mapPayrollRecordToDb)
-- ============================================================================ALTER TABLE public.teacher_payroll_periods
    ADD COLUMN IF NOT EXISTS total_hours NUMERIC(6, 1) DEFAULT 0;   -- Tổng giờ dạy
ALTER TABLE public.teacher_payroll_periods
    ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(15, 2) DEFAULT 0;  -- Đơn giá/giờ
ALTER TABLE public.teacher_payroll_periods
    ADD COLUMN IF NOT EXISTS gross_salary NUMERIC(15, 2) DEFAULT 0; -- Lương gộp
ALTER TABLE public.teacher_payroll_periods
    ADD COLUMN IF NOT EXISTS deduction NUMERIC(15, 2) DEFAULT 0;    -- Giảm trừ (số ít)
ALTER TABLE public.teacher_payroll_periods
    ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE public.teacher_payroll_periods
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.teacher_payroll_periods
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Đồng bộ dữ liệu cũ (nếu có) từ cột `deductions`/`total_salary` sang cột chuẩn
-- `deduction`/`gross_salary` mà code thực sự dùng, tránh mất dữ liệu đã chốt lương.
UPDATE public.teacher_payroll_periods
SET deduction = COALESCE(deductions, 0)
WHERE deduction IS NULL OR deduction = 0;
UPDATE public.teacher_payroll_periods
SET gross_salary = COALESCE(total_salary, 0)
WHERE gross_salary IS NULL OR gross_salary = 0;

-- ============================================================================
-- 4. BẢNG CÒN THIẾU (nếu chưa tạo) — đảm bảo tất cả bảng code tham chiếu tồn tại
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.class_requests (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES public.students(id) ON DELETE CASCADE,
    class_id VARCHAR(50),
    schedule_slot_id VARCHAR(50),
    type VARCHAR(50) NOT NULL DEFAULT 'XIN_NGHI',
    reason TEXT,
    target_schedule_slot_id VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    reviewed_by VARCHAR(50),
    review_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_monthly_packages (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES public.students(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    package_type VARCHAR(50) DEFAULT 'MONTHLY',
    total_sessions INT DEFAULT 0,
    used_sessions INT DEFAULT 0,
    remaining_sessions INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    session_count INT NOT NULL DEFAULT 0,
    price NUMERIC(12, 0) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manual_expenses (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 0) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Vận hành',
    expense_date DATE NOT NULL,
    note TEXT,
    created_by VARCHAR(50) NOT NULL DEFAULT 'ADMIN001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id VARCHAR(50) PRIMARY KEY,
    recipient_role VARCHAR(20),
    recipient_user_id VARCHAR(50),
    type VARCHAR(50) DEFAULT 'INFO',
    title VARCHAR(255),
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. GỠ CÁC RÀNG BUỘC CHECK LỖ THỜI GÂY LỖI TIẾNG VIỆT
-- ============================================================================
ALTER TABLE public.schedule_slots DROP CONSTRAINT IF EXISTS schedule_slots_status_check;
ALTER TABLE public.schedule_slots DROP CONSTRAINT IF EXISTS schedule_slots_shift_id_check;
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_shift_id_check;
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_status_check;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_exam_block_check;
-- class_requests: constraint cũ chặn trạng thái/loại tiếng Việt mà code gửi
ALTER TABLE public.class_requests DROP CONSTRAINT IF EXISTS class_requests_status_check;
ALTER TABLE public.class_requests DROP CONSTRAINT IF EXISTS class_requests_type_check;

-- ============================================================================
-- 6. INDEX TỐI ƯU HÓA TRUY VẤN (đảm bảo không thiếu)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.schedule_slots(date);
CREATE INDEX IF NOT EXISTS idx_slots_class_id ON public.schedule_slots(class_id);
CREATE INDEX IF NOT EXISTS idx_slots_teacher_id ON public.schedule_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_att_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_att_slot ON public.attendance_records(schedule_slot_id);
CREATE INDEX IF NOT EXISTS idx_invoices_month ON public.tuition_invoices(month);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.tuition_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_payroll_teacher ON public.teacher_payroll_periods(teacher_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.manual_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_students_target_uni ON public.students(target_university);
CREATE INDEX IF NOT EXISTS idx_students_exam_block ON public.students(exam_block);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_remaining ON public.students(remaining_sessions);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) — cấp quyền đầy đủ cho toàn bộ bảng
-- ============================================================================
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

-- Làm mới schema cache của PostgREST ngay lập tức
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 8. (TÙY CHỌN) DỌN CỘT "CHẾT"
-- ----------------------------------------------------------------------------
-- Bảng classes có cột `student_ids TEXT[]` KHÔNG được code đọc/ghi (code chỉ dùng
-- bảng join class_students). Giữ lại gây hiểu nhầm "2 nguồn dữ liệu".
-- Bỏ comment 2 dòng dưới nếu CHẮC CHẮN muốn xóa cột này (đã backup trước):
-- ============================================================================
-- ALTER TABLE public.classes DROP COLUMN IF EXISTS student_ids;

-- ============================================================================
-- KẾT THÚC — Sau khi chạy xong kiểm tra:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('tuition_invoices','teacher_payroll_periods')
--   ORDER BY table_name, ordinal_position;
-- ============================================================================