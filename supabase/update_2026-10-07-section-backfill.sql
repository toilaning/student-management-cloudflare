-- ============================================================================
-- Update 2026-10-07 (bổ sung): Backfill section_id cho ca học & schedule_slots
-- Dan cho SQL Editor (Supabase). An toan chay lai nhieu lan (idempotent).
-- Muc tieu: gan moi buoi hoc schedule_slots (cu) vao mot ca hoc class_sections
-- tuong ung, de ca che "lop nhieu ca + giao vien theo ca" nhat quan voi du lieu cu.
-- ============================================================================

begin;

-- 1) Dam bao cot section_id ton tai (neu ban chay file nay doc lap)
ALTER TABLE public.schedule_slots ADD COLUMN IF NOT EXISTS section_id varchar(50);

-- 2) Dam bao moi lop deu co it nhat 1 ca (lop legacy chua co ca)
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

-- 3) Dong bo class_students -> class_section_students cho ca mac dinh con thieu
INSERT INTO public.class_section_students (section_id, student_id)
SELECT sec.id, cs.student_id
FROM public.class_students cs
JOIN public.class_sections sec
  ON sec.class_id = cs.class_id
 AND sec.id = 'SEC_' || cs.class_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.class_section_students x
    WHERE x.section_id = sec.id AND x.student_id = cs.student_id
)
ON CONFLICT (section_id, student_id) DO NOTHING;

-- 4) Gan section_id cho schedule_slots con NULL.
--    Thu tu uu tien: (a) trung gio thuc, (b) trung ca shift_id, (c) trung giao vien.
WITH ranked AS (
    SELECT
        ss.id AS slot_id,
        sec.id AS section_id,
        ROW_NUMBER() OVER (
            PARTITION BY ss.id
            ORDER BY
                CASE WHEN (
                    sec.start_time IS NOT NULL
                    AND NULLIF(sec.start_time, '') IS NOT NULL
                    AND ss.start_time IS NOT NULL
                    AND NULLIF(sec.start_time, '')::time = ss.start_time
                    AND NULLIF(sec.end_time, '')::time = ss.end_time
                ) THEN 0 ELSE 1 END,
                CASE WHEN sec.shift_id = ss.shift_id THEN 0 ELSE 1 END,
                CASE WHEN sec.teacher_id = ss.teacher_id THEN 0 ELSE 1 END,
                sec.created_at,
                sec.id
        ) AS rn
    FROM public.schedule_slots ss
    JOIN public.class_sections sec ON sec.class_id = ss.class_id
    WHERE ss.section_id IS NULL
      AND sec.is_active
)
UPDATE public.schedule_slots ss
SET section_id = r.section_id
FROM ranked r
WHERE r.rn = 1
  AND ss.id = r.slot_id
  AND ss.section_id IS NULL;

-- 5) Fallback: gan ca mac dinh theo ten 'SEC_' + class_id
UPDATE public.schedule_slots ss
SET section_id = 'SEC_' || ss.class_id
WHERE ss.section_id IS NULL
  AND EXISTS (SELECT 1 FROM public.class_sections s WHERE s.id = 'SEC_' || ss.class_id);

-- 6) Fallback cuoi: gan ca dau tien (theo created_at) cua lop
WITH first_sec AS (
    SELECT DISTINCT ON (class_id) id, class_id
    FROM public.class_sections
    WHERE is_active
    ORDER BY class_id, created_at, id
)
UPDATE public.schedule_slots ss
SET section_id = fs.id
FROM first_sec fs
WHERE ss.section_id IS NULL
  AND fs.class_id = ss.class_id;

-- 7) Chi muc tra cuu
CREATE INDEX IF NOT EXISTS idx_schedule_slots_section_id ON public.schedule_slots(section_id);

commit;

-- Lam PostgREST doc lai schema ngay
notify pgrst, 'reload schema';
