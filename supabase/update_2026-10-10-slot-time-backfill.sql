-- ============================================================================
-- Update 2026-10-10: Dong bo gio that cua schedule_slots theo ca (class_sections)
-- Dan cho SQL Editor (Supabase). An toan chay lai nhieu lan (idempotent).
--
-- Van de: sau khi sua gio cua ca, cac buoi hoc (schedule_slots) cu van giu
--         gio mac dininh cu (vd 08:00-10:00) thay vi gio that cua ca
--         (vd 14:00-17:00). Dieu nay lam nut "Doi ca trong ngay" o Portal
--         hoc sinh bi disable nham la "Ca da ket thuc".
--
-- Cach sua: lay start_time/end_time cua class_sections (nguon su that) ghi de
--           len schedule_slots theo section_id. Chi ap dung cho buoi tu hom nay
--           ve sau va chua bi huy, giu nguyen lich su buoi da hoan thanh.
-- ============================================================================

begin;

-- Dong bo gio tuong lai theo ca. Giu nguyen lich su da hoan thanh.
update public.schedule_slots ss
set
    start_time = sec.start_time,
    end_time   = sec.end_time,
    updated_at = now()
from public.class_sections sec
where sec.id = ss.section_id
  and sec.start_time is not null
  and sec.end_time   is not null
  and nullif(sec.start_time, '') is not null
  and nullif(sec.end_time,   '') is not null
  and ss.date >= current_date
  and ss.status not in ('Đã hủy')
  and (
        ss.start_time is distinct from sec.start_time
        or ss.end_time is distinct from sec.end_time
      );

commit;

-- Lam PostgREST doc lai schema ngay
notify pgrst, 'reload schema';
