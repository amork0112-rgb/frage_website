-- Create atomic reservation function
create or replace function public.reserve_consultation(
  p_student_id uuid,
  p_date date,
  p_time text
)
returns void
language plpgsql
security definer
as $$
declare
  v_slot_id uuid;
begin
  -- Increase current atomically if slot open and has capacity, capture slot id
  update public.consultation_slots
    set current = current + 1
  where date = p_date
    and time = p_time
    and is_open = true
    and current < max
  returning id into v_slot_id;

  if v_slot_id is null then
    raise exception 'slot full or closed';
  end if;

  -- Upsert reservation for the student
  insert into public.student_reservations(student_id, slot_id)
  values (p_student_id, v_slot_id)
  on conflict (student_id) do update
    set slot_id = excluded.slot_id;
end;
$$;

