-- Add assignment_key column to video related tables
ALTER TABLE portal_video_submissions ADD COLUMN IF NOT EXISTS assignment_key text;
ALTER TABLE portal_video_feedback ADD COLUMN IF NOT EXISTS assignment_key text;
ALTER TABLE ai_video_evaluations ADD COLUMN IF NOT EXISTS assignment_key text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pvs_assignment_key ON portal_video_submissions(assignment_key);
CREATE INDEX IF NOT EXISTS idx_pvf_assignment_key ON portal_video_feedback(assignment_key);
CREATE INDEX IF NOT EXISTS idx_ave_assignment_key ON ai_video_evaluations(assignment_key);

-- Make assignment_id nullable since we are moving to assignment_key
ALTER TABLE portal_video_submissions ALTER COLUMN assignment_id DROP NOT NULL;
ALTER TABLE portal_video_feedback ALTER COLUMN assignment_id DROP NOT NULL;
ALTER TABLE ai_video_evaluations ALTER COLUMN assignment_id DROP NOT NULL;
