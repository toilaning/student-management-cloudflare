-- Allow teacher_id to be NULL when unlinking deleted teachers
ALTER TABLE public.classes ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.schedule_slots ALTER COLUMN teacher_id DROP NOT NULL;
