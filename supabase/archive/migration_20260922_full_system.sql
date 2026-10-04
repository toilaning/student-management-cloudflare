-- =====================================================================
-- MIGRATION: 2026-09-22 - TOÀN BỘ HỆ THỐNG MỚI (PHASE 1 - 5)
-- =====================================================================

-- 1. CẬP NHẬT BẢNG STUDENTS
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS assignment_url TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Đang học';

ALTER TABLE students ALTER COLUMN email DROP NOT NULL;

-- 2. CẬP NHẬT BẢNG TEACHERS
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS rate_per_session NUMERIC(12, 2) DEFAULT 250000;

ALTER TABLE teachers ALTER COLUMN email DROP NOT NULL;

-- 3. BẢNG GÓI HỌC PHÍ THEO THÁNG & CƠ CHẾ DỒN BUỔI (ROLLOVER)
CREATE TABLE IF NOT EXISTS student_monthly_packages (
    id VARCHAR(64) PRIMARY KEY, -- SMP_ST001_2026_09
    student_id VARCHAR(32) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    package_name VARCHAR(100) NOT NULL,
    total_sessions INT NOT NULL, -- Số buổi đăng ký trong tháng
    rollover_sessions INT DEFAULT 0, -- Số buổi dư dồn từ tháng trước sang
    used_sessions INT DEFAULT 0, -- Số buổi đã học trong tháng
    remaining_sessions INT DEFAULT 0, -- (total + rollover - used)
    price NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'CHƯA_NỘP', -- 'ĐÃ_NỘP', 'CÒN_NỢ'
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_monthly_packages_student ON student_monthly_packages(student_id);
CREATE INDEX IF NOT EXISTS idx_student_monthly_packages_month ON student_monthly_packages(month);

-- 4. BẢNG SỔ CHI NHẬP TAY (MANUAL EXPENSES CHO THU - CHI)
CREATE TABLE IF NOT EXISTS manual_expenses (
    id VARCHAR(64) PRIMARY KEY, -- EXP_1710000000
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category VARCHAR(50) DEFAULT 'Vận hành', -- 'Mặt bằng', 'Thiết bị', 'Giáo trình', 'Khác'
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_expenses_date ON manual_expenses(expense_date);

-- 5. BẬT RLS CHO CÁC BẢNG MỚI
ALTER TABLE student_monthly_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on student_monthly_packages" 
ON student_monthly_packages FOR SELECT USING (true);

CREATE POLICY "Allow authenticated manage on student_monthly_packages" 
ON student_monthly_packages FOR ALL USING (true);

CREATE POLICY "Allow public read on manual_expenses" 
ON manual_expenses FOR SELECT USING (true);

CREATE POLICY "Allow authenticated manage on manual_expenses" 
ON manual_expenses FOR ALL USING (true);
