-- migration: Chấm công giáo viên theo ca (check-in / check-out)
-- Thêm cột chấm công vào schedule_slots để giáo viên tự chấm công ca dạy của mình.
-- up
begin;

ALTER TABLE IF EXISTS public.schedule_slots
  ADD COLUMN IF NOT EXISTS checkin_time   VARCHAR(10),
  ADD COLUMN IF NOT EXISTS checkout_time  VARCHAR(10),
  ADD COLUMN IF NOT EXISTS checkin_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS checkin_method VARCHAR(30),
  ADD COLUMN IF NOT EXISTS checkin_note   TEXT;

ALTER TABLE IF EXISTS public.schedule_slots
  DROP CONSTRAINT IF EXISTS schedule_slots_checkin_status_check;

ALTER TABLE IF EXISTS public.schedule_slots
  ADD CONSTRAINT schedule_slots_checkin_status_check
  CHECK (checkin_status IS NULL OR checkin_status IN ('Chưa chấm công', 'Đúng giờ', 'Đi muộn'));

ALTER TABLE IF EXISTS public.schedule_slots
  DROP CONSTRAINT IF EXISTS schedule_slots_checkin_method_check;

ALTER TABLE IF EXISTS public.schedule_slots
  ADD CONSTRAINT schedule_slots_checkin_method_check
  CHECK (checkin_method IS NULL OR checkin_method IN ('TEACHER_SELF', 'ADMIN', 'SYSTEM'));

CREATE INDEX IF NOT EXISTS idx_schedule_slots_checkin_status ON schedule_slots(checkin_status);

commit;

-- down (chạy thủ công khi cần rollback)
-- begin;
-- ALTER TABLE IF EXISTS public.schedule_slots
--   DROP COLUMN IF EXISTS checkin_time,
--   DROP COLUMN IF EXISTS checkout_time,
--   DROP COLUMN IF EXISTS checkin_status,
--   DROP COLUMN IF EXISTS checkin_method,
--   DROP COLUMN IF EXISTS checkin_note;
-- commit;
