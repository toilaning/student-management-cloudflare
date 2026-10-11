-- ============================================================================
-- Update 2026-10-11: Bo phong hoc vat ly (room/classrooms) va he thong email
-- Dan cho SQL Editor (Supabase). An toan chay lai nhieu lan (idempotent).
--
-- 1. Bo cot room_id khoi classes / schedule_slots / class_sections.
-- 2. Xoa bang classrooms (phong hoc vat ly) — trung tam van hanh 100% online.
-- 3. Bo cot email khoi users / teachers / students.
-- 4. Dang ky lai trigger dong bo ten giua users va ho so (khong con email).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Go trigger dong bo cu (dang tham chieu toi cot email)
-- ----------------------------------------------------------------------------
drop trigger if exists trg_sync_user_to_profiles on public.users;
drop trigger if exists trg_sync_teacher_to_user on public.teachers;
drop trigger if exists trg_sync_student_to_user on public.students;

-- ----------------------------------------------------------------------------
-- 2. Bo cot room_id (CASCADE tu dong xoa FK + index tren cot do)
-- ----------------------------------------------------------------------------
alter table public.classes        drop column if exists room_id cascade;
alter table public.schedule_slots drop column if exists room_id cascade;
alter table public.class_sections drop column if exists room_id cascade;

-- ----------------------------------------------------------------------------
-- 3. Xoa bang classrooms (phong hoc vat ly)
-- ----------------------------------------------------------------------------
drop table if exists public.classrooms cascade;

-- ----------------------------------------------------------------------------
-- 4. Bo cot email khoi users / teachers / students
-- ----------------------------------------------------------------------------
drop index if exists uq_users_email;
alter table public.users    drop column if exists email cascade;
alter table public.teachers drop column if exists email cascade;
alter table public.students drop column if exists email cascade;

-- ----------------------------------------------------------------------------
-- 5. Dang ky lai ham dong bo ten (khong con email)
-- ----------------------------------------------------------------------------
create or replace function public.sync_user_to_profiles()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if pg_trigger_depth() > 1 then
        return new;
    end if;

    if new.role = 'TEACHER' then
        update public.teachers
           set name = new.name,
               updated_at = now()
         where id = new.id;
    end if;

    if new.role = 'STUDENT' then
        update public.students
           set name = new.name
         where id = new.id;
    end if;

    return new;
end;
$$;

create or replace function public.sync_profile_to_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if pg_trigger_depth() > 1 then
        return new;
    end if;

    update public.users
       set name = new.name,
           updated_at = now()
     where id = new.id;

    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Tao lai trigger dong bo ten (chi kich hoat khi doi name)
-- ----------------------------------------------------------------------------
drop trigger if exists trg_sync_user_to_profiles on public.users;
create trigger trg_sync_user_to_profiles
    after update of name on public.users
    for each row execute function public.sync_user_to_profiles();

drop trigger if exists trg_sync_teacher_to_user on public.teachers;
create trigger trg_sync_teacher_to_user
    after update of name on public.teachers
    for each row execute function public.sync_profile_to_user();

drop trigger if exists trg_sync_student_to_user on public.students;
create trigger trg_sync_student_to_user
    after update of name on public.students
    for each row execute function public.sync_profile_to_user();

commit;

-- Lam PostgREST doc lai schema ngay
notify pgrst, 'reload schema';
