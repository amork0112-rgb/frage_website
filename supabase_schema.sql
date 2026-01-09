-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text check (role in ('admin', 'parent')) default 'parent',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Create posts table
create table posts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  category text not null,
  author_id uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on posts
alter table posts enable row level security;

-- Create post_revisions table for edit history
create table post_revisions (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  title_snapshot text,
  content_snapshot text,
  changed_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on post_revisions
alter table post_revisions enable row level security;

-- RLS Policies

-- Profiles: Users can read their own profile, Admins can read all
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Posts: Authenticated users can read, Only Admins can insert/update/delete
create policy "Authenticated users can view posts" on posts
  for select
  to authenticated
  using (true);

create policy "Admins can insert posts" on posts
  for insert
  to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "Admins can update posts" on posts
  for update
  to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "Admins can delete posts" on posts
  for delete
  to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

-- Post Revisions: Only Admins can view and create revisions
create policy "Admins can view revisions" on post_revisions
  for select
  to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

create policy "Admins can insert revisions" on post_revisions
  for insert
  to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ));

-- Trigger to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'parent');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Allow draft inserts into new_students
create policy "new_students_draft_insert" on new_students
  for insert
  to authenticated
  with check (status = 'draft');

create policy "new_students_draft_insert_public" on new_students
  for insert
  to anon
  with check (status = 'draft');
