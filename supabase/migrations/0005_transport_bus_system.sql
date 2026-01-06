-- =========================================
-- BUSES
-- =========================================

create table if not exists buses (
  id smallint primary key,
  name text not null,
  capacity integer not null,
  campus text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table buses enable row level security;

create policy buses_read
on buses for select
using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'))
);

create policy buses_admin_write
on buses for all
using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- =========================================
-- BUS ROUTES
-- =========================================

create table if not exists bus_routes (
  id uuid primary key default gen_random_uuid(),
  semester text not null,
  campus text not null,
  bus_id smallint references buses(id),
  route_type text check (route_type in ('pickup','dropoff')),
  estimated_total_time integer,
  is_confirmed boolean default false,
  created_at timestamptz default now()
);

alter table bus_routes enable row level security;

create policy bus_routes_read
on bus_routes for select
using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'))
);

create policy bus_routes_admin_write
on bus_routes for all
using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
