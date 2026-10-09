-- ============================================================================
-- Update 2026-10-09: Hoc sinh chon ca VA chon thu rieng + doi ca nhanh trong ngay
-- Dan cho SQL Editor (Supabase). An toan chay lai nhieu lan.
-- ============================================================================

begin;

-- 1) Thu hoc rieng cua tung hoc sinh trong mot ca.
--    Mang rong '{}' nghia la "theo dung lich cua ca" (hanh vi cu, giu tuong thich).
--    Khi hoc sinh tick bot thu, day se chua cac thu da chon (2..7, 8 = Chu Nhat).
ALTER TABLE public.class_section_students
    ADD COLUMN IF NOT EXISTS schedule_days integer[] NOT NULL DEFAULT '{}';

-- 2) Bang doi ca nhanh trong ngay (chi ung dung cho mot buoi cu the, khong doi ca dai han).
CREATE TABLE IF NOT EXISTS public.student_slot_swaps (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   varchar(50)  NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_slot_id varchar(50)  NOT NULL REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
    to_slot_id   varchar(50)  NOT NULL REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
    swap_date    date         NOT NULL,
    status       varchar(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at   timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT student_slot_swaps_status_check    CHECK (status IN ('ACTIVE', 'CANCELLED')),
    CONSTRAINT student_slot_swaps_distinct_check  CHECK (from_slot_id <> to_slot_id)
);

-- 3) RLS (backend dung service_role, khong can policy)
ALTER TABLE public.student_slot_swaps ENABLE ROW LEVEL SECURITY;

-- 4) Chi muc tra cuu
CREATE INDEX IF NOT EXISTS idx_student_slot_swaps_student  ON public.student_slot_swaps(student_id);
CREATE INDEX IF NOT EXISTS idx_student_slot_swaps_to_slot   ON public.student_slot_swaps(to_slot_id);
CREATE INDEX IF NOT EXISTS idx_student_slot_swaps_from_slot ON public.student_slot_swaps(from_slot_id);

commit;

-- Lam PostgREST doc lai schema ngay
notify pgrst, 'reload schema';
