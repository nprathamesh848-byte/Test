-- Migration: Optimize Test Taking System
-- 1. View to fetch test attempt snapshot
CREATE OR REPLACE VIEW public.test_attempt_snapshot AS
SELECT
  ta.id AS attempt_id,
  tq.id AS test_question_id,
  q.id AS question_id,
  q.question_text,
  q.question_type,
  q.difficulty,
  qo.id AS option_id,
  qo.option_text,
  qo.is_correct,
  qa.answer_text,
  qa.is_correct AS answer_is_correct
FROM test_attempts ta
JOIN test_questions tq ON tq.test_id = ta.test_id
JOIN questions q ON q.id = tq.question_id
LEFT JOIN question_options qo ON qo.question_id = q.id
LEFT JOIN question_attempts qa ON qa.test_question_id = tq.id AND qa.attempt_id = ta.id;

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_id ON test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts(status);

-- 3. Bulk save RPC
CREATE OR REPLACE FUNCTION public.save_answers_bulk(attempt_id UUID, answers JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  ans RECORD;
BEGIN
  FOR ans IN SELECT * FROM jsonb_each(answers)
  LOOP
    INSERT INTO question_attempts (attempt_id, test_question_id, answer_text, is_correct)
    VALUES (
      attempt_id,
      ans.key::UUID,
      ans.value->>'answer_text',
      (ans.value->>'is_correct')::BOOLEAN
    )
    ON CONFLICT (attempt_id, test_question_id) DO UPDATE SET
      answer_text = EXCLUDED.answer_text,
      is_correct = EXCLUDED.is_correct,
      updated_at = NOW();
  END LOOP;
END;
$$;

-- Grant execute to anon & authenticated roles
GRANT EXECUTE ON FUNCTION public.save_answers_bulk(UUID, JSONB) TO anon, authenticated;
