-- 1. Enum Types (Optional, can be skipped if you prefer text checks)
-- CREATE TYPE notice_type_enum AS ENUM ('academic', 'learning');
-- CREATE TYPE notice_scope_enum AS ENUM ('global', 'campus', 'class');
-- CREATE TYPE creator_role_enum AS ENUM ('admin', 'teacher');

-- 2. Extend 'posts' table
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS notice_type text CHECK (notice_type IN ('academic', 'learning')),
  ADD COLUMN IF NOT EXISTS scope text CHECK (scope IN ('global', 'campus', 'class')) DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS class_id uuid,
  ADD COLUMN IF NOT EXISTS creator_role text CHECK (creator_role IN ('admin', 'teacher')),
  ADD COLUMN IF NOT EXISTS campus text,
  ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_posts_scope_class ON posts(scope, class_id);
CREATE INDEX IF NOT EXISTS idx_posts_notice_type ON posts(notice_type);
CREATE INDEX IF NOT EXISTS idx_posts_category_archived ON posts(category, is_archived);

-- 4. RLS Policies
-- Remove existing broad policy
DROP POLICY IF EXISTS "Authenticated users can view posts" ON posts;

-- Admin: Full Access
CREATE POLICY "Admins can do everything"
  ON posts
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Teacher: View (Own posts OR Class notices for their classes)
CREATE POLICY "Teachers can view relevant notices"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    author_id = auth.uid()
    OR (
      scope = 'class' 
      AND class_id IN (
        SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
      )
    )
  );

-- Teacher: Insert (Learning notices only, Class scope only, Must be their class)
CREATE POLICY "Teachers can insert learning notices"
  ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    creator_role = 'teacher'
    AND notice_type = 'learning'
    AND scope = 'class'
    AND class_id IN (
      SELECT class_id FROM teacher_classes WHERE teacher_id = auth.uid()
    )
    AND author_id = auth.uid()
  );

-- Teacher: Update/Delete (Own posts only)
CREATE POLICY "Teachers can update own posts"
  ON posts FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Teachers can delete own posts"
  ON posts FOR DELETE USING (author_id = auth.uid());

-- Parent/Student: View (Global + Campus + Class)
CREATE POLICY "Parents can view filtered notices"
  ON posts
  FOR SELECT
  TO authenticated
  USING (
    category = 'notice'
    AND is_archived = false
    AND (
      scope = 'global'
      OR (
        scope = 'campus' 
        AND campus IN (SELECT campus FROM students WHERE parent_auth_user_id = auth.uid())
      )
      OR (
        scope = 'class' 
        AND class_id IN (SELECT class_id FROM students WHERE parent_auth_user_id = auth.uid())
      )
    )
  );
