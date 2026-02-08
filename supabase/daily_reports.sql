-- Create daily_reports table
create table if not exists daily_reports (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students(id) on delete cascade not null,
  class_id uuid references classes(id) on delete cascade not null,
  date date not null,
  send_status text check (send_status in ('not_sent', 'sent', 'failed')) default 'not_sent' not null,
  sent_at timestamptz,
  created_at timestamptz default now(),
  unique(student_id, class_id, date)
);

-- Add index for performance
create index if not exists idx_daily_reports_query on daily_reports(class_id, date);
