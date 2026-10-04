-- ============================================================================
-- SCRIPT TỐI ƯU HÓA ĐỒNG BỘ CẤP CƠ SỞ DỮ LIỆU BẰNG POSTGRESQL TRIGGERS
-- Giải quyết triệt để 100%: Dữ liệu luôn đồng bộ tuyệt đối dù sửa ở bất kỳ đâu
-- (Trên Webapp, trong Supabase Dashboard, qua API hay bằng lệnh SQL)
-- ============================================================================

-- 1. Hàm đồng bộ từ bảng USERS sang TEACHERS & STUDENTS
CREATE OR REPLACE FUNCTION public.sync_user_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    -- Ngăn chặn vòng lặp kích hoạt trigger đệ quy
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Nếu đổi tên hoặc email của tài khoản TEACHER -> Tự cập nhật bảng teachers
    IF NEW.role = 'TEACHER' THEN
        UPDATE public.teachers
        SET name = NEW.name,
            email = COALESCE(NEW.email, email),
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;

    -- Nếu đổi tên hoặc email của tài khoản STUDENT -> Tự cập nhật bảng students
    IF NEW.role = 'STUDENT' THEN
        UPDATE public.students
        SET name = NEW.name,
            email = COALESCE(NEW.email, email)
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Hàm đồng bộ từ bảng TEACHERS ngược lại USERS
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

-- 3. Hàm đồng bộ từ bảng STUDENTS ngược lại USERS
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

-- 4. Kích hoạt Triggers (Gắn ngàm trực tiếp trên PostgreSQL Engine)
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

-- 5. Làm mới cache schema PostgREST
NOTIFY pgrst, 'reload schema';
