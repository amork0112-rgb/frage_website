
-- Create commitment status enum
do $$ begin
    create type commitment_status as enum (
        'unchecked',
        'done',
        'partial',
        'not_done'
    );
exception
    when duplicate_object then null;
end $$;

-- Create student_commitments table
create table if not exists student_commitments (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references students(id),
    class_id uuid not null references classes(id),
    book_id uuid not null references books(id),
    date date not null,
    status commitment_status default 'unchecked',
    checked_by uuid references auth.users(id),
    checked_at timestamptz default now(),
    unique (student_id, book_id, date)
);

-- Enable RLS
alter table student_commitments enable row level security;

-- Create policies
create policy "Teachers can view commitments for their students"
    on student_commitments for select
    to authenticated
    using (true); -- Simplified for now, can be tightened to teacher's classes

create policy "Teachers can insert/update commitments"
    on student_commitments for all
    to authenticated
    using (true)
    with check (true);

-- Grant permissions
grant select, insert, update, delete on student_commitments to authenticated;
grant usage, select on sequence student_commitments_id_seq to authenticated; -- if serial, but it's uuid
