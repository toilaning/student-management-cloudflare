-- ============================================================================
-- Update 2026-10-07: Co che ca hoc + quan ly hoc sinh theo ca + don tu + hoc phi
-- Dan cho SQL Editor (Supabase). An toan chay lai nhieu lan.
-- ============================================================================

begin;

-- 1) Bo ma lop (code) - danh dinh lop bay gio la id
ALTER TABLE public.classes ALTER COLUMN code DROP NOT NULL;
DROP INDEX IF EXISTS uq_classes_code;

-- 2) Bang ca hoc (mot lop co nhieu ca)
CREATE TABLE IF NOT EXISTS public.class_sections (
    id            varchar(50)  PRIMARY KEY,
    class_id      varchar(50)  NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    name          varchar(255) NOT NULL,
    shift_id      integer,
    start_time    varchar(10),
    end_time      varchar(10),
    schedule_days integer[]    NOT NULL DEFAULT '{}',
    teacher_id    varchar(50)  REFERENCES public.teachers(id) ON DELETE SET NULL,
    room_id       varchar(50)  REFERENCES public.classrooms(id) ON DELETE SET NULL,
    is_active     boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT class_sections_shift_id_check CHECK (shift_id IS NULL OR shift_id > 0)
);

-- 3) Hoc sinh thuoc ca nao
CREATE TABLE IF NOT EXISTS public.class_section_students (
    section_id  varchar(50) NOT NULL REFERENCES public.class_sections(id) ON DELETE CASCADE,
    student_id  varchar(50) NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (section_id, student_id)
);

-- 4) Cau hinh ung dung (ngan hang, banner...)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key        varchar(255) PRIMARY KEY,
    value      jsonb        NOT NULL,
    updated_at timestamptz  NOT NULL DEFAULT now()
);

-- 5) Lich hoc (schedule_slots) gan vao ca cu the
ALTER TABLE public.schedule_slots ADD COLUMN IF NOT EXISTS section_id varchar(50);

-- 6) Hoa don hoc phi: them ten goi + gia goi da chon
ALTER TABLE public.tuition_invoices ADD COLUMN IF NOT EXISTS package_name  varchar(255);
ALTER TABLE public.tuition_invoices ADD COLUMN IF NOT EXISTS package_price numeric(12,2);

-- 7) Mo rong check kieu don tu: them DOI_CA (doi ca trong cung lop)
ALTER TABLE public.class_requests DROP CONSTRAINT IF EXISTS class_requests_type_check;
ALTER TABLE public.class_requests ADD CONSTRAINT class_requests_type_check CHECK (type IN ('XIN_NGHI','DOI_LICH','DOI_CA'));

-- 8) RLS theo dung pattern setup.sql: bat RLS, khong policy (backend dung service_role)
ALTER TABLE public.class_sections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_section_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings           ENABLE ROW LEVEL SECURITY;

-- 9) Backfill: moi lop hien co -> 1 ca mac dinh; hoc sinh -> ca mac dinh; lich -> ca mac dinh
INSERT INTO public.class_sections
    (id, class_id, name, shift_id, start_time, end_time, schedule_days, teacher_id, room_id, is_active)
SELECT
    'SEC_' || c.id,
    c.id,
    COALESCE(ts.name, 'Ca hoc'),
    c.shift_id,
    COALESCE(c.start_time, ts.start_time, '18:30'),
    COALESCE(c.end_time,   ts.end_time,   '20:30'),
    c.schedule_days,
    c.teacher_id,
    c.room_id,
    true
FROM public.classes c
LEFT JOIN public.time_shifts ts ON ts.id = c.shift_id
WHERE NOT EXISTS (SELECT 1 FROM public.class_sections s WHERE s.class_id = c.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.class_section_students (section_id, student_id)
SELECT 'SEC_' || cs.class_id, cs.student_id
FROM public.class_students cs
WHERE EXISTS (SELECT 1 FROM public.class_sections s WHERE s.id = 'SEC_' || cs.class_id)
ON CONFLICT (section_id, student_id) DO NOTHING;

UPDATE public.schedule_slots ss
SET section_id = 'SEC_' || ss.class_id
WHERE ss.section_id IS NULL;

-- 10) Chi muc tra cuu
CREATE INDEX IF NOT EXISTS idx_class_sections_class_id            ON public.class_sections(class_id);
CREATE INDEX IF NOT EXISTS idx_class_section_students_section_id ON public.class_section_students(section_id);
CREATE INDEX IF NOT EXISTS idx_class_section_students_student_id ON public.class_section_students(student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_section_id          ON public.schedule_slots(section_id);

commit;

-- Lam PostgREST doc lai schema ngay
notify pgrst, 'reload schema';
