-- =====================================================
-- 0006_teacher_alerts_view.sql
-- Purpose: Unified alerts view for teachers
-- =====================================================

create or replace view public.teacher_alerts as

/* =====================================================
   1️⃣ 학부모 요청 알림 (portal_requests)
   ===================================================== */
select
  'request'::text        as source,
  pr.id                  as id,
  pr.teacher_id          as teacher_id,
  pr.created_at          as created_at,
  pr.teacher_read        as is_read,
  pr.type                as category,
  to_jsonb(pr)           as payload
from public.portal_requests pr
where pr.teacher_id is not null

union all

/* =====================================================
   2️⃣ 신규생 체크리스트 알림 (new_student_checklists)
   ===================================================== */
select
  'checklist'::text      as source,
  nsc.id                 as id,
  nsc.teacher_id         as teacher_id,
  nsc.checked_at         as created_at,
  nsc.checked            as is_read,
  'new_student'::text    as category,
  to_jsonb(nsc)          as payload
from public.new_student_checklists nsc
where nsc.teacher_id is not null
  and nsc.checked_at is not null;
