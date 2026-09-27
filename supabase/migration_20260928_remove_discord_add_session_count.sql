-- Migration: Remove discord columns and add session_count to tuition_invoices
-- Date: 2026-09-28

-- 1. Bổ sung cột session_count vào bảng tuition_invoices nếu chưa có
ALTER TABLE IF EXISTS public.tuition_invoices 
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0;

-- 2. Xóa các cột liên quan đến Discord trong bảng students
ALTER TABLE IF EXISTS public.students 
DROP COLUMN IF EXISTS discord_id,
DROP COLUMN IF EXISTS discord_username;

-- 3. Xóa các biến thể cột discord cũ trong bảng classes nếu còn tồn tại ở DB đời cũ
ALTER TABLE IF EXISTS public.classes 
DROP COLUMN IF EXISTS discord_channel_id,
DROP COLUMN IF EXISTS discord_id;

-- 4. Xóa index liên quan đến discord nếu còn tồn tại
DROP INDEX IF EXISTS public.idx_students_discord;
DROP INDEX IF EXISTS public.idx_students_discord_id;
