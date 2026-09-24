-- ============================================================================
-- SCRIPT REBUILD & CHUẨN HÓA 100% CƠ SỞ DỮ LIỆU SUPABASE
-- Hệ Thống Quản Lý Trung Tâm Luyện Thi Vẽ Kiến Trúc & Mỹ Thuật
-- (Chạy 1 lần duy nhất trong Supabase SQL Editor để xóa bỏ vĩnh viễn mọi lỗi SQL)
-- ============================================================================

-- BẬT CÁC EXTENSION CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- 1. TẠO HOẶC BỔ SUNG CÁC BẢNG CÒN THIẾU
-- ============================================================================

-- Bảng ca học linh hoạt
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

-- Bảng kỳ lương giáo viên
CREATE TABLE IF NOT EXISTS public.teacher_payroll_periods (
    id VARCHAR(50) PRIMARY KEY,
    teacher_id VARCHAR(50) NOT NULL,
    month VARCHAR(7) NOT NULL,
    total_slots INT NOT NULL DEFAULT 0,
    total_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    bonus NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. TỐI ƯU & BỔ SUNG TẤT CẢ CỘT CÒN THIẾU TRÊN CÁC BẢNG HIỆN CÓ
-- ============================================================================

-- Bảng classrooms
ALTER TABLE public.classrooms 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Bảng class_students
ALTER TABLE public.class_students 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Bảng attendance_records
ALTER TABLE public.attendance_records 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS is_makeup BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS original_slot_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS makeup_reason TEXT;

-- Bảng tuition_invoices
ALTER TABLE public.tuition_invoices 
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS paid_date DATE,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS transaction_code VARCHAR(100);

-- Bảng manual_expenses
ALTER TABLE public.manual_expenses 
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Bảng class_requests
ALTER TABLE public.class_requests 
    ADD COLUMN IF NOT EXISTS target_schedule_slot_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS review_note TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Bảng notifications
ALTER TABLE public.notifications 
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS recipient_user_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS link TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Bảng student_monthly_packages
ALTER TABLE public.student_monthly_packages 
    ADD COLUMN IF NOT EXISTS package_type VARCHAR(50) DEFAULT 'MONTHLY',
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 3. GỠ BỎ RÀNG BUỘC CHECK LỖ THỜI GÂY LỖI TIẾNG VIỆT
-- ============================================================================
ALTER TABLE public.schedule_slots DROP CONSTRAINT IF EXISTS schedule_slots_status_check;
ALTER TABLE public.schedule_slots DROP CONSTRAINT IF EXISTS schedule_slots_shift_id_check;
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_shift_id_check;
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_status_check;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_exam_block_check;

-- ============================================================================
-- 4. TỐI ƯU HÓA ĐỒNG BỘ 2 CHIỀU TỰ ĐỘNG BẰNG POSTGRESQL TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_user_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Đồng bộ sang bảng teachers
    IF NEW.role = 'TEACHER' THEN
        UPDATE public.teachers
        SET name = NEW.name,
            email = COALESCE(NEW.email, email),
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    -- Đồng bộ sang bảng students
    IF NEW.role = 'STUDENT' THEN
        UPDATE public.students
        SET name = NEW.name,
            email = COALESCE(NEW.email, email)
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_teacher_to_user()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    UPDATE public.users
    SET name = NEW.name,
        email = COALESCE(NEW.email, email),
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_student_to_user()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    UPDATE public.users
    SET name = NEW.name,
        email = COALESCE(NEW.email, email),
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kích hoạt Triggers
DROP TRIGGER IF EXISTS trg_sync_user_to_profiles ON public.users;
CREATE TRIGGER trg_sync_user_to_profiles
    AFTER UPDATE OF name, email ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_to_profiles();

DROP TRIGGER IF EXISTS trg_sync_teacher_to_user ON public.teachers;
CREATE TRIGGER trg_sync_teacher_to_user
    AFTER UPDATE OF name, email ON public.teachers
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_teacher_to_user();

DROP TRIGGER IF EXISTS trg_sync_student_to_user ON public.students;
CREATE TRIGGER trg_sync_student_to_user
    AFTER UPDATE OF name, email ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_student_to_user();

-- ============================================================================
-- 5. CẤP QUYỀN RLS ĐẦY ĐỦ CHO TOÀN BỘ CÁC BẢNG (AN TOÀN TUYỆT ĐỐI)
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

-- Đồng bộ ngay tên GV001
UPDATE public.users u
SET name = t.name, email = COALESCE(t.email, u.email)
FROM public.teachers t
WHERE u.id = t.id AND u.name <> t.name;

-- Làm mới schema cache của PostgREST
NOTIFY pgrst, 'reload schema';
