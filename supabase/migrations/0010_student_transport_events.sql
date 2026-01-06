-- student_transport_events: 이동 이벤트 단위로 차량 배치 확장
create table if not exists public.student_transport_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  route_type text not null check (route_type in ('pickup','dropoff')),
  event_time time not null,
  lat double precision not null,
  lng double precision not null,
  reason text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_student_transport_events_date_active
  on public.student_transport_events(date, is_active);

create index if not exists idx_student_transport_events_student
  on public.student_transport_events(student_id);
