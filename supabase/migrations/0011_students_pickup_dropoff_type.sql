-- Add pickup/dropoff type columns to students
alter table if exists public.students
add column if not exists pickup_type text check (pickup_type in ('bus','self')) default 'self',
add column if not exists dropoff_type text check (dropoff_type in ('bus','self')) default 'self';

-- Ensure lat/lng can be null for self cases (already nullable in most schemas)
-- Optionally, future constraints could enforce lat/lng NOT NULL when *_type='bus'

