-- ============================================================
-- STAGE 9 REPAIR: Fix student_topic_stats view (SQL syntax fix)
-- and create class_student_stats view that was not reached
-- ============================================================

-- Fix student_topic_stats view (broken LATERAL alias in previous run)
CREATE OR REPLACE VIEW public.student_topic_stats AS
SELECT
  ta.student_id,
  COALESCE(
    tq.question_snapshot->>'topic_name',
    tq.question_snapshot->>'topic',
    'Unknown Topic'
  ) AS topic_name,
  COUNT(*) AS attempts,
  SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END) AS correct,
  ROUND(
    AVG(CASE WHEN qa.is_answered THEN
      CASE WHEN qa.is_correct THEN 100.0 ELSE 0.0 END
    ELSE NULL END
  ), 1) AS accuracy
FROM public.question_attempts qa
JOIN public.test_attempts ta ON ta.id = qa.attempt_id
LEFT JOIN public.test_questions tq ON tq.id = qa.test_question_id
WHERE ta.status IN ('SUBMITTED', 'AUTO_SUBMITTED')
GROUP BY ta.student_id, topic_name;

GRANT SELECT ON public.student_topic_stats TO authenticated;

-- class_student_stats view — per-class per-student aggregated performance
CREATE OR REPLACE VIEW public.class_student_stats AS
SELECT
  cs.class_id,
  cs.student_id,
  p.full_name,
  p.email,
  COUNT(DISTINCT ta.id) AS tests_completed,
  ROUND(AVG(ta.percentage), 1) AS avg_percentage,
  ROUND(
    CASE WHEN SUM(ta.correct_count + ta.wrong_count + ta.skipped_count) > 0
    THEN SUM(ta.correct_count)::NUMERIC / SUM(ta.correct_count + ta.wrong_count + ta.skipped_count) * 100
    ELSE NULL END, 1
  ) AS avg_accuracy,
  MAX(ta.submitted_at) AS last_attempt_at
FROM public.class_students cs
JOIN public.profiles p ON p.id = cs.student_id
LEFT JOIN public.test_attempts ta
  ON ta.student_id = cs.student_id
  AND ta.status IN ('SUBMITTED', 'AUTO_SUBMITTED')
GROUP BY cs.class_id, cs.student_id, p.full_name, p.email;

GRANT SELECT ON public.class_student_stats TO authenticated;
