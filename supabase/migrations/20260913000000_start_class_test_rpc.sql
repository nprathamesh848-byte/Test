-- ============================================================
-- AIMS AI — RPC: start_class_test
-- Allows a student to self-enroll into a published class test
-- by auto-creating a test_assignment + test_attempt in one call.
-- Uses SECURITY DEFINER so the student can bypass the
-- teacher-only INSERT policy on test_assignments.
-- ============================================================

CREATE OR REPLACE FUNCTION public.start_class_test(p_test_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_test public.tests%ROWTYPE;
  v_assignment public.test_assignments%ROWTYPE;
  v_attempt public.test_attempts%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_student_id := auth.uid();

  -- 1. Validate the test exists and is PUBLISHED
  SELECT * INTO v_test FROM public.tests WHERE id = p_test_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found';
  END IF;
  IF v_test.status != 'PUBLISHED' THEN
    RAISE EXCEPTION 'Test is not available';
  END IF;

  -- 2. Ensure caller is a student
  IF NOT public.has_role(v_student_id, 'student') THEN
    RAISE EXCEPTION 'Only students can start tests';
  END IF;

  -- 3. Check for existing IN_PROGRESS attempt → resume it
  SELECT * INTO v_attempt
  FROM public.test_attempts
  WHERE test_id = p_test_id
    AND student_id = v_student_id
    AND status = 'IN_PROGRESS';
  IF FOUND THEN
    RETURN jsonb_build_object('attempt_id', v_attempt.id, 'resumed', true);
  END IF;

  -- 4. Upsert assignment (idempotent thanks to UNIQUE(test_id, student_id))
  INSERT INTO public.test_assignments (test_id, student_id, assigned_by, status)
  VALUES (p_test_id, v_student_id, v_student_id, 'STARTED')
  ON CONFLICT (test_id, student_id) DO UPDATE SET status = 'STARTED'
  RETURNING * INTO v_assignment;

  -- 5. Create the test attempt
  v_expires_at := now() + (v_test.duration_minutes || ' minutes')::INTERVAL;

  INSERT INTO public.test_attempts (
    test_id, assignment_id, student_id,
    attempt_number, started_at, expires_at, status
  ) VALUES (
    p_test_id, v_assignment.id, v_student_id,
    1, now(), v_expires_at, 'IN_PROGRESS'
  )
  RETURNING * INTO v_attempt;

  RETURN jsonb_build_object('attempt_id', v_attempt.id, 'resumed', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_class_test(UUID) TO authenticated, service_role;
