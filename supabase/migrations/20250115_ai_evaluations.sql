
-- Create table for AI video evaluations
create table if not exists ai_video_evaluations (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references portal_video_submissions(id) on delete cascade,
  assignment_id uuid references video_assignments(id),
  student_id uuid references students(id),
  scores jsonb, -- {fluency: 3, ...}
  average float,
  pronunciation_flags jsonb, -- [{word: "...", time: ...}]
  teacher_feedback_draft jsonb, -- {overall_message: "...", ...}
  parent_report_message text,
  needs_teacher_review boolean default true,
  ai_confidence float,
  teacher_override boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add index for performance
create index if not exists idx_ai_video_evaluations_submission on ai_video_evaluations(submission_id);
