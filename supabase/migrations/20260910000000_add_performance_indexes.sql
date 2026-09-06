-- 20260910000000_add_performance_indexes.sql
-- Add missing indexes for high‑traffic columns

CREATE INDEX IF NOT EXISTS idx_tests_class_level_status ON public.tests (class_level, status);
CREATE INDEX IF NOT EXISTS idx_tests_created_by_status ON public.tests (created_by, status);
CREATE INDEX IF NOT EXISTS idx_test_assignments_student_id_status ON public.test_assignments (student_id, status);
CREATE INDEX IF NOT EXISTS idx_test_attempts_student_id_status ON public.test_attempts (student_id, status);
CREATE INDEX IF NOT EXISTS idx_question_attempts_attempt_id ON public.question_attempts (attempt_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students (student_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON public.class_students (class_id);

GRANT SELECT ON public.tests TO authenticated;
GRANT SELECT ON public.test_assignments TO authenticated;
GRANT SELECT ON public.test_attempts TO authenticated;
GRANT SELECT ON public.question_attempts TO authenticated;
