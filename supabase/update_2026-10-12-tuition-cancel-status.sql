-- ============================================================================
-- Update 2026-10-12: Ho tro huy goi hoc phi (Huy mem) tu Portal Hoc sinh
-- Dan cho SQL Editor (Supabase). An toan chay lai nhieu lan (idempotent).
--
-- - Cho phep trang thai 'Đã hủy' trong cot tuition_invoices.status.
-- - (Khong tao bang moi, khong doi cot; chi noi rong CHECK constraint cu.)
-- ============================================================================

begin;

alter table public.tuition_invoices
    drop constraint if exists tuition_invoices_status_check;

alter table public.tuition_invoices
    add constraint tuition_invoices_status_check
    check (status in ('Đã nộp', 'Còn nợ', 'Quá hạn', 'Miễn giảm', 'Đã hủy', 'DA_NOP', 'CON_NO'));

commit;

-- Lam PostgREST doc lai schema ngay
notify pgrst, 'reload schema';
