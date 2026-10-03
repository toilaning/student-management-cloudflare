-- ============================================================================
-- CHUAN HOA SCHEMA SUPABASE — Student Management
-- Idempotent: chay lai nhieu lan khong loi, an toan tren DB dang co du lieu.
-- Dong bo cot/constraint giua DB va code (src/repositories/SupabaseRepository.ts,
-- src/types/*.ts). Chay tren Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USERS / TEACHERS / STUDENTS: email khong bat buoc
-- Code cho phep tao tai khoan khong co email (mapUserToDb ghi null).
-- ----------------------------------------------------------------------------
ALTER TABLE users   ALTER COLUMN email DROP NOT NULL;
ALTER TABLE teachers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE students ALTER COLUMN email DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. STUDENTS: bo sung cot ho so luyen thi + thong ke buoi hoc
-- ----------------------------------------------------------------------------
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS parent_phone             VARCHAR(50),
    ADD COLUMN IF NOT EXISTS assignment_url           TEXT,
    ADD COLUMN IF NOT EXISTS home_town                VARCHAR(255),
    ADD COLUMN IF NOT EXISTS grade_level              VARCHAR(50),
    ADD COLUMN IF NOT EXISTS target_university        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS custom_university        VARCHAR(255),
    ADD COLUMN IF NOT EXISTS exam_block               VARCHAR(20),
    ADD COLUMN IF NOT EXISTS study_goal               VARCHAR(255),
    ADD COLUMN IF NOT EXISTS facebook_url             TEXT,
    ADD COLUMN IF NOT EXISTS other_notes              TEXT,
    ADD COLUMN IF NOT EXISTS registered_date          DATE,
    ADD COLUMN IF NOT EXISTS total_sessions_in_month  INTEGER DEFAULT 12,
    ADD COLUMN IF NOT EXISTS attended_sessions_in_month INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS absent_sessions_in_month INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remaining_sessions       INTEGER DEFAULT 12;

-- Trang thai hoc sinh: 5 gia tri dung trong src/types/student.ts
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;
ALTER TABLE students
    ADD CONSTRAINT students_status_check
    CHECK (status IN ('Đang học', 'Tạm dừng', 'Đã nghỉ học', 'Bảo lưu', 'Đã tốt nghiệp'));

-- ----------------------------------------------------------------------------
-- 3. CLASSES: gio bat dau/ket thuc + lop dinh ky
-- Code doc/ghi start_time, end_time, is_recurring (mapClassToDb).
-- ----------------------------------------------------------------------------
ALTER TABLE classes
    ADD COLUMN IF NOT EXISTS start_time  VARCHAR(10) DEFAULT '18:30',
    ADD COLUMN IF NOT EXISTS end_time    VARCHAR(10) DEFAULT '20:30',
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT TRUE;

-- ----------------------------------------------------------------------------
-- 4. ATTENDANCE_RECORDS: cot diem danh bu + nguon ghi nhan
-- ----------------------------------------------------------------------------
ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS original_slot_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS makeup_reason    TEXT,
    ADD COLUMN IF NOT EXISTS method           VARCHAR(30) DEFAULT 'MANUAL';

ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('Có mặt', 'Vắng có phép', 'Vắng không phép', 'Đi muộn', 'Điểm danh bù'));

-- ----------------------------------------------------------------------------
-- 5. TUITION_INVOICES: mua theo goi buoi hoc
-- ----------------------------------------------------------------------------
ALTER TABLE tuition_invoices
    ADD COLUMN IF NOT EXISTS package_id    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS used_sessions INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS note          TEXT;

-- Trang thai hoa don: bo sung 'Miễn giảm' va ma webhook thanh toan
ALTER TABLE tuition_invoices DROP CONSTRAINT IF EXISTS tuition_invoices_status_check;
ALTER TABLE tuition_invoices
    ADD CONSTRAINT tuition_invoices_status_check
    CHECK (status IN ('Đã nộp', 'Còn nợ', 'Quá hạn', 'Miễn giảm', 'DA_NOP', 'CON_NO'));

-- Phuong thuc thanh toan (cho phep NULL)
ALTER TABLE tuition_invoices DROP CONSTRAINT IF EXISTS tuition_invoices_payment_method_check;
ALTER TABLE tuition_invoices
    ADD CONSTRAINT tuition_invoices_payment_method_check
    CHECK (payment_method IS NULL OR payment_method IN ('Chuyển khoản QR', 'Tiền mặt', 'Thẻ ngân hàng'));

-- ----------------------------------------------------------------------------
-- 6. SESSION_PACKAGES: goi combo (so tien = so buoi)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    session_count INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_packages_active ON session_packages(is_active);

INSERT INTO session_packages (id, name, session_count, price, description, is_active) VALUES
    ('PKG10', 'Gói Cơ Bản (10 Buổi)', 10, 1000000, 'Khóa trải nghiệm nền tảng, làm quen lộ trình học.', TRUE),
    ('PKG20', 'Gói Nâng Cao (20 Buổi)', 20, 1800000, 'Tiết kiệm hơn, kèm bài tập dự án và cố vấn 1-1.', TRUE),
    ('PKG30', 'Gói Chuyên Sâu (30 Buổi)', 30, 2500000, 'Lộ trình dài, bám sát mục tiêu đầu ra.', TRUE),
    ('PKG50', 'Gói Master VIP (50 Buổi)', 50, 3900000, 'Gói dài hạn cho chương trình cao cấp.', FALSE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    session_count = EXCLUDED.session_count,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 7. TIME_SHIFTS: danh muc 5 ca co dinh
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    duration_hours NUMERIC(4, 1) NOT NULL DEFAULT 2.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO time_shifts (id, name, start_time, end_time, duration_hours, is_active, sort_order) VALUES
    (1, 'Ca 1 (08:00 - 10:00)', '08:00', '10:00', 2.0, TRUE, 1),
    (2, 'Ca 2 (10:15 - 12:15)', '10:15', '12:15', 2.0, TRUE, 2),
    (3, 'Ca 3 (13:30 - 15:30)', '13:30', '15:30', 2.0, TRUE, 3),
    (4, 'Ca 4 (15:45 - 17:45)', '15:45', '17:45', 2.0, TRUE, 4),
    (5, 'Ca 5 (18:30 - 20:30)', '18:30', '20:30', 2.0, TRUE, 5)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    duration_hours = EXCLUDED.duration_hours,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

SELECT setval('time_shifts_id_seq', GREATEST((SELECT MAX(id) FROM time_shifts), 5));

-- ----------------------------------------------------------------------------
-- 8. SCHEMA_SLOTS: cot cham cong giao vien theo ca (neu chua co)
-- ----------------------------------------------------------------------------
ALTER TABLE schedule_slots
    ADD COLUMN IF NOT EXISTS checkin_time   VARCHAR(10),
    ADD COLUMN IF NOT EXISTS checkout_time  VARCHAR(10),
    ADD COLUMN IF NOT EXISTS checkin_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS checkin_method VARCHAR(30),
    ADD COLUMN IF NOT EXISTS checkin_note   TEXT;

-- ----------------------------------------------------------------------------
-- 9. DONG BO USERS <-> TEACHERS/STUDENTS bang trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF NEW.role = 'TEACHER' THEN
        UPDATE public.teachers
        SET name = NEW.name, email = COALESCE(NEW.email, email), updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    IF NEW.role = 'STUDENT' THEN
        UPDATE public.students
        SET name = NEW.name, email = COALESCE(NEW.email, email)
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
    SET name = NEW.name, email = COALESCE(NEW.email, email), updated_at = NOW()
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
    SET name = NEW.name, email = COALESCE(NEW.email, email), updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_user_to_profiles ON public.users;
CREATE TRIGGER trg_sync_user_to_profiles
    AFTER UPDATE OF name, email ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_profiles();

DROP TRIGGER IF EXISTS trg_sync_teacher_to_user ON public.teachers;
CREATE TRIGGER trg_sync_teacher_to_user
    AFTER UPDATE OF name, email ON public.teachers
    FOR EACH ROW EXECUTE FUNCTION public.sync_teacher_to_user();

DROP TRIGGER IF EXISTS trg_sync_student_to_user ON public.students;
CREATE TRIGGER trg_sync_student_to_user
    AFTER UPDATE OF name, email ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.sync_student_to_user();

-- ----------------------------------------------------------------------------
-- 10. TAT RLS (server-side service role)
-- ----------------------------------------------------------------------------
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
ALTER TABLE session_packages DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_shifts DISABLE ROW LEVEL SECURITY;

-- Lam moi cache schema PostgREST
NOTIFY pgrst, 'reload schema';
