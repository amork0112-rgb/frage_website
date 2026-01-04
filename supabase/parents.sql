create extension if not exists "pgcrypto";

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz default now()
);

