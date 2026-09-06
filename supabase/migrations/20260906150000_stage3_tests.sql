-- ============================================================
-- AIMS AI — STAGE 3 MIGRATION: TESTS, ASSIGNMENTS, ATTEMPTS & SCORING
-- ============================================================

-- 1. tests
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NULL REFERENCES public.schools(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  class_level INTEGER NOT NULL CHECK (class_level BETWEEN 1 AND 10),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  instructions TEXT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  total_marks NUMERIC NOT NULL DEFAULT 0,
  passing_marks NUMERIC NOT NULL DEFAULT 0,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  show_result_immediately BOOLEAN NOT NULL DEFAULT true,
  allow_retake BOOLEAN NOT NULL DEFAULT false,
  max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts >= 1),
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tests_created_by ON public.tests (created_by);
CREATE INDEX IF NOT EXISTS idx_tests_class_level ON public.tests (class_level);
CREATE INDEX IF NOT EXISTS idx_tests_subject_id ON public.tests (subject_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON public.tests (status);

CREATE TRIGGER trg_tests_updated_at BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. test_questions
CREATE TABLE IF NOT EXISTS public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  marks NUMERIC NOT NULL CHECK (marks > 0),
  question_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_questions TO authenticated;
GRANT ALL ON public.test_questions TO service_role;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions (test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question_id ON public.test_questions (question_id);

-- 3. test_assignments
CREATE TABLE IF NOT EXISTS public.test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'STARTED', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  UNIQUE (test_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_assignments TO authenticated;
GRANT ALL ON public.test_assignments TO service_role;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_test_assignments_test_id ON public.test_assignments (test_id);
CREATE INDEX IF NOT EXISTS idx_test_assignments_student_id ON public.test_assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_test_assignments_class_id ON public.test_assignments (class_id);

-- 4. test_attempts
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  assignment_id UUID NULL REFERENCES public.test_assignments(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'EXPIRED', 'CANCELLED')),
  score NUMERIC NOT NULL DEFAULT 0,
  total_marks NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON public.test_attempts (test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_id ON public.test_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_assignment_id ON public.test_attempts (assignment_id);

CREATE TRIGGER trg_test_attempts_updated_at BEFORE UPDATE ON public.test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. question_attempts
CREATE TABLE IF NOT EXISTS public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  test_question_id UUID NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  selected_option_id UUID NULL,
  answer_text TEXT NULL,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  is_correct BOOLEAN NULL,
  marks_awarded NUMERIC NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  first_viewed_at TIMESTAMPTZ NULL,
  answered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, test_question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_attempts TO authenticated;
GRANT ALL ON public.question_attempts TO service_role;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_question_attempts_attempt_id ON public.question_attempts (attempt_id);

CREATE TRIGGER trg_question_attempts_updated_at BEFORE UPDATE ON public.question_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. attempt_events
CREATE TABLE IF NOT EXISTS public.attempt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NULL
);
GRANT SELECT, INSERT ON public.attempt_events TO authenticated;
GRANT ALL ON public.attempt_events TO service_role;
ALTER TABLE public.attempt_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_attempt_events_attempt_id ON public.attempt_events (attempt_id);

-- ============================================================
-- SERVER-SIDE SCORING FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_test_attempt(p_attempt_id UUID, p_is_auto_submit BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.test_attempts%ROWTYPE;
  v_test public.tests%ROWTYPE;
  v_tq RECORD;
  v_correct INTEGER := 0;
  v_wrong INTEGER := 0;
  v_skipped INTEGER := 0;
  v_score NUMERIC := 0;
  v_total_marks NUMERIC := 0;
  v_percentage NUMERIC := 0;
  v_time_taken INTEGER := 0;
  v_snap JSONB;
  v_options JSONB;
  v_opt RECORD;
  v_correct_opt_id UUID;
  v_qa RECORD;
  v_is_corr BOOLEAN;
  v_awarded NUMERIC;
BEGIN
  -- Fetch attempt
  SELECT * INTO v_attempt FROM public.test_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  -- Ensure student owns attempt or is admin/teacher
  IF v_attempt.student_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'teacher') THEN
    RAISE EXCEPTION 'Unauthorized to submit this attempt';
  END IF;

  -- Return existing result if already submitted
  IF v_attempt.status IN ('SUBMITTED', 'AUTO_SUBMITTED') THEN
    RETURN jsonb_build_object(
      'score', v_attempt.score,
      'total_marks', v_attempt.total_marks,
      'percentage', v_attempt.percentage,
      'correct_count', v_attempt.correct_count,
      'wrong_count', v_attempt.wrong_count,
      'skipped_count', v_attempt.skipped_count,
      'status', v_attempt.status
    );
  END IF;

  -- Fetch test
  SELECT * INTO v_test FROM public.tests WHERE id = v_attempt.test_id;

  -- Calculate time taken
  v_time_taken := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - v_attempt.started_at)))::INTEGER);

  -- Evaluate each test question
  FOR v_tq IN SELECT * FROM public.test_questions WHERE test_id = v_attempt.test_id LOOP
    v_total_marks := v_total_marks + v_tq.marks;
    v_snap := v_tq.question_snapshot;
    v_options := v_snap->'options';

    -- Find correct option id from snapshot
    v_correct_opt_id := NULL;
    IF v_options IS NOT NULL THEN
      FOR v_opt IN SELECT * FROM jsonb_to_recordset(v_options) AS x(id UUID, is_correct BOOLEAN) LOOP
        IF v_opt.is_correct THEN
          v_correct_opt_id := v_opt.id;
        END IF;
      END LOOP;
    END IF;

    -- Find student's answer
    SELECT * INTO v_qa FROM public.question_attempts WHERE attempt_id = p_attempt_id AND test_question_id = v_tq.id;

    IF v_qa.id IS NULL OR NOT v_qa.is_answered OR v_qa.selected_option_id IS NULL THEN
      v_skipped := v_skipped + 1;
      v_is_corr := false;
      v_awarded := 0;
    ELSE
      IF v_correct_opt_id IS NOT NULL AND v_qa.selected_option_id = v_correct_opt_id THEN
        v_correct := v_correct + 1;
        v_is_corr := true;
        v_awarded := v_tq.marks;
        v_score := v_score + v_tq.marks;
      ELSE
        v_wrong := v_wrong + 1;
        v_is_corr := false;
        v_awarded := 0;
      END IF;
    END IF;

    -- Update question_attempts row securely
    IF v_qa.id IS NOT NULL THEN
      UPDATE public.question_attempts
      SET is_correct = v_is_corr, marks_awarded = v_awarded
      WHERE id = v_qa.id;
    ELSE
      INSERT INTO public.question_attempts (attempt_id, test_question_id, is_answered, is_correct, marks_awarded)
      VALUES (p_attempt_id, v_tq.id, false, false, 0);
    END IF;
  END LOOP;

  IF v_total_marks > 0 THEN
    v_percentage := ROUND((v_score / v_total_marks) * 100, 2);
  ELSE
    v_percentage := 0;
  END IF;

  -- Update test_attempts
  UPDATE public.test_attempts
  SET
    status = CASE WHEN p_is_auto_submit THEN 'AUTO_SUBMITTED' ELSE 'SUBMITTED' END,
    submitted_at = now(),
    score = v_score,
    total_marks = v_total_marks,
    percentage = v_percentage,
    correct_count = v_correct,
    wrong_count = v_wrong,
    skipped_count = v_skipped,
    time_taken_seconds = v_time_taken
  WHERE id = p_attempt_id;

  -- Update assignment status if present
  IF v_attempt.assignment_id IS NOT NULL THEN
    UPDATE public.test_assignments SET status = 'COMPLETED' WHERE id = v_attempt.assignment_id;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'total_marks', v_total_marks,
    'percentage', v_percentage,
    'correct_count', v_correct,
    'wrong_count', v_wrong,
    'skipped_count', v_skipped,
    'status', CASE WHEN p_is_auto_submit THEN 'AUTO_SUBMITTED' ELSE 'SUBMITTED' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_test_attempt(UUID, BOOLEAN) TO authenticated, service_role;

-- ============================================================
-- RLS POLICIES FOR STAGE 3
-- ============================================================

-- tests: teachers & admin manage; students view published tests assigned to them
CREATE POLICY "tests_select" ON public.tests
  FOR SELECT TO authenticated USING (
    status = 'PUBLISHED' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "tests_insert" ON public.tests
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tests_update" ON public.tests
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- test_questions: readable by authenticated users; managed by test creator / admin
CREATE POLICY "test_questions_select" ON public.test_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "test_questions_manage" ON public.test_questions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND (t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- test_assignments
CREATE POLICY "test_assignments_select" ON public.test_assignments
  FOR SELECT TO authenticated USING (student_id = auth.uid() OR assigned_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "test_assignments_insert" ON public.test_assignments
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "test_assignments_update" ON public.test_assignments
  FOR UPDATE TO authenticated USING (student_id = auth.uid() OR assigned_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- test_attempts
CREATE POLICY "test_attempts_select" ON public.test_attempts
  FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid()
    )
  );
CREATE POLICY "test_attempts_insert" ON public.test_attempts
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "test_attempts_update" ON public.test_attempts
  FOR UPDATE TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- question_attempts
CREATE POLICY "question_attempts_select" ON public.question_attempts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.test_attempts ta WHERE ta.id = attempt_id AND (ta.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.tests t WHERE t.id = ta.test_id AND t.created_by = auth.uid())))
  );
CREATE POLICY "question_attempts_insert" ON public.question_attempts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.test_attempts ta WHERE ta.id = attempt_id AND (ta.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );
CREATE POLICY "question_attempts_update" ON public.question_attempts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.test_attempts ta WHERE ta.id = attempt_id AND (ta.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

-- attempt_events
CREATE POLICY "attempt_events_select" ON public.attempt_events
  FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "attempt_events_insert" ON public.attempt_events
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
