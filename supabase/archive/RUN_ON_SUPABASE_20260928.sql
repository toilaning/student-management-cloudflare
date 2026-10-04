-- ============================================================================
-- SUPABASE RUN SCRIPT — Ngày 2026-09-28
-- Dọn Discord + bổ sung session_count cho tuition_invoices (IDEMPOTENT — chạy lại an toàn)
-- ----------------------------------------------------------------------------
-- CÁCH CHẠY: Mở Supabase Dashboard -> SQL Editor -> New query
--             Dán toàn bộ nội dung file này -> Run (hoặc chạy từng khối 1)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHẦN 1. TUITION_INVOICES: bổ sung cột session_count (Số buổi) + used_sessions
-- ============================================================================
ALTER TABLE IF EXISTS public.tuition_invoices
    ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS used_sessions INTEGER DEFAULT 0;

-- ============================================================================
-- PHẦN 2. STUDENTS: xóa cột Discord (nếu còn ở DB đời cũ)
-- ============================================================================
ALTER TABLE IF EXISTS public.students
    DROP COLUMN IF EXISTS discord_id,
    DROP COLUMN IF EXISTS discord_username;

-- ============================================================================
-- PHẦN 3. CLASSES: xóa biến thể cột Discord cũ (nếu còn)
-- ============================================================================
ALTER TABLE IF EXISTS public.classes
    DROP COLUMN IF EXISTS discord_channel_id,
    DROP COLUMN IF EXISTS discord_id;

-- ============================================================================
-- PHẦN 4. Index Discord cũ (nếu còn)
-- ============================================================================
DROP INDEX IF EXISTS public.idx_students_discord;
DROP INDEX IF EXISTS public.idx_students_discord_id;

-- ============================================================================
-- PHẦN 5. DỮ LIỆU SEED: thay link Discord cũ -> link phòng học online
--          (Chỉ chạy nếu DB hiện đang chứa link discord; an toàn bỏ qua nếu không)
-- ============================================================================
UPDATE public.classes
   SET meeting_link = REPLACE(meeting_link, 'https://discord.com/channels/', 'https://meet.google.com/')
 WHERE meeting_link ILIKE '%discord.com%';

UPDATE public.schedule_slots
   SET meeting_link = REPLACE(meeting_link, 'https://discord.com/channels/', 'https://meet.google.com/')
 WHERE meeting_link ILIKE '%discord.com%';

COMMIT;

-- ============================================================================
-- PHẦN 6. KIỂM TRA (chạy sau COMMIT, không cần transaction)
-- ============================================================================
-- 6.1 Kiểm tra cột discord đã xóa khỏi students
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'students'
   AND column_name ILIKE '%discord%';
-- (kết quả: KHÔNG có dòng nào = thành công)

-- 6.2 Kiểm tra session_count + used_sessions đã có trong tuition_invoices
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'tuition_invoices'
   AND column_name IN ('session_count', 'used_sessions');
-- (kết quả: có 2 dòng session_count + used_sessions = thành công)

-- 6.3 Kiểm tra số link discord còn sót trong dữ liệu (mong đợi = 0)
SELECT
  (SELECT COUNT(*) FROM public.classes        WHERE meeting_link ILIKE '%discord.com%') AS classes_discord,
  (SELECT COUNT(*) FROM public.schedule_slots WHERE meeting_link ILIKE '%discord.com%') AS slots_discord;
-- (kết quả: 0 | 0 = thành công)