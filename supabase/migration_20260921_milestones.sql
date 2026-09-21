-- =====================================================================
-- MIGRATION: 2026-09-21 - MILESTONES 1, 2, 3 UPDATE
-- =====================================================================

-- 1. XÓA BỎ HOÀN TOÀN BÀI TẬP (HOMEWORK REMOVAL)
DROP TABLE IF EXISTS homework_submissions CASCADE;
DROP TABLE IF EXISTS homework_tasks CASCADE;

-- 2. CẬP NHẬT STUDENTS: Bổ sung discord_id và discord_username
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS discord_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS discord_username VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_students_discord_id ON students(discord_id);

-- 3. CẬP NHẬT TUITION_INVOICES: Bổ sung package_id, package_name, session_count, override_reason, override_by, override_at
ALTER TABLE tuition_invoices
ADD COLUMN IF NOT EXISTS package_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS package_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS override_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS override_at TIMESTAMPTZ;

-- 4. TẠO BẢNG SESSION_PACKAGES (QUẢN LÝ GÓI BUỔI HỌC)
CREATE TABLE IF NOT EXISTS session_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    session_count INTEGER NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed các gói mặc định nếu chưa có
INSERT INTO session_packages (id, name, session_count, price, description, is_active)
VALUES 
    ('PKG_10S', 'Gói Cơ Bản (10 buổi)', 10, 1000000, 'Gói học tiêu chuẩn 10 ca học linh hoạt', true),
    ('PKG_20S', 'Gói Tiết Kiệm (20 buổi)', 20, 1800000, 'Gói học tiết kiệm giảm 10% học phí', true),
    ('PKG_30S', 'Gói Chuyên Sâu (30 buổi)', 30, 2500000, 'Gói học toàn diện cam kết chuẩn đầu ra', true)
ON CONFLICT (id) DO NOTHING;

-- 5. BẬT RLS CHO SESSION_PACKAGES
ALTER TABLE session_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on session_packages" 
ON session_packages FOR SELECT USING (true);

CREATE POLICY "Allow authenticated manage on session_packages" 
ON session_packages FOR ALL USING (auth.role() = 'authenticated');
