-- ======================================
-- 0009_enrollment_functions.sql
-- Purpose: Enrollment workflow functions
-- ======================================

create or replace function public.create_draft_student(
  p_parent_id uuid,
  p_parent_name text,
  p_phone text,
  p_campus text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_new_student_id uuid;
begin
  insert into public.new_students (
    student_name,
    parent_name,
    phone,
    campus,
    status,
    parent_id,
    created_at
  )
  values (
    null,
    p_parent_name,
    p_phone,
    p_campus,
    'draft',
    p_parent_id,
    now()
  )
  returning id into v_new_student_id;

  return v_new_student_id;
end;
$$;


create or replace function public.draft_to_waiting(
  p_new_student_id uuid,
  p_student_name text
)
returns void
language plpgsql
security definer
as $$
begin
  update public.new_students
  set student_name = p_student_name,
      status = 'waiting'
  where id = p_new_student_id
    and status = 'draft';
end;
$$;


create or replace function public.approve_enrollment(
  p_new_student_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.students (
    student_name,
    parent_id,
    campus,
    status,
    created_at
  )
  select
    ns.student_name,
    ns.parent_id,
    ns.campus,
    '재원',
    now()
  from public.new_students ns
  where ns.id = p_new_student_id
    and ns.status = 'waiting';

  update public.new_students
  set status = 'enrolled'
  where id = p_new_student_id
    and status = 'waiting';
end;
$$;
