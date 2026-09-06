-- ============================================================
-- AIMS AI — STAGE 9 MIGRATION: NOTIFICATIONS & DASHBOARD SUPPORT
-- ============================================================

-- 1. notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'TEST_ASSIGNED',
    'RESULT_AVAILABLE',
    'AI_ANALYSIS_READY',
    'PRACTICE_RECOMMENDED',
    'IMPROVEMENT_RESULT',
    'EARLY_WARNING',
    'CLASS_UPDATE',
    'GENERAL'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (user_id, created_at DESC);

-- RLS: users see only their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_insert_service" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

-- 2. Function to create a notification when a test is assigned
CREATE OR REPLACE FUNCTION public.notify_test_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test public.tests%ROWTYPE;
BEGIN
  SELECT * INTO v_test FROM public.tests WHERE id = NEW.test_id;
  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    NEW.student_id,
    'TEST_ASSIGNED',
    'New Test Assigned',
    'You have been assigned: ' || COALESCE(v_test.title, 'a new test') || '. Duration: ' || v_test.duration_minutes || ' minutes.',
    jsonb_build_object('test_id', NEW.test_id, 'assignment_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_test_assigned
  AFTER INSERT ON public.test_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_test_assigned();

-- 3. Function to create a notification when a test is submitted/scored
CREATE OR REPLACE FUNCTION public.notify_result_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status = 'SUBMITTED' OR NEW.status = 'AUTO_SUBMITTED')
     AND (OLD.status = 'IN_PROGRESS') THEN
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.student_id,
      'RESULT_AVAILABLE',
      'Result Available',
      'Your test result is ready. Score: ' || COALESCE(NEW.score::TEXT, '—') || ' / ' || COALESCE(NEW.total_marks::TEXT, '—') || ' (' || COALESCE(NEW.percentage::TEXT, '0') || '%)',
      jsonb_build_object('attempt_id', NEW.id, 'test_id', NEW.test_id, 'percentage', NEW.percentage)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_result_available
  AFTER UPDATE OF status ON public.test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.notify_result_available();

-- 4. student_topic_stats view — aggregates topic accuracy per student from question_attempts
-- Uses question_snapshot->>'topic_name' since topic_id may not always be set
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

-- 5. class_student_stats view — per-class per-student aggregated performance
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
