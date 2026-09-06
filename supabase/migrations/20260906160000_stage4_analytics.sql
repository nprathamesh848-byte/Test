-- ============================================================
-- AIMS AI — STAGE 4 MIGRATION: ANALYTICS & TOPIC PERFORMANCE
-- ============================================================

-- 1. student_topic_performance
CREATE TABLE IF NOT EXISTS public.student_topic_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers INTEGER NOT NULL DEFAULT 0,
  skipped_answers INTEGER NOT NULL DEFAULT 0,
  total_marks_earned NUMERIC NOT NULL DEFAULT 0,
  total_possible_marks NUMERIC NOT NULL DEFAULT 0,
  accuracy NUMERIC NOT NULL DEFAULT 0,
  average_time_seconds NUMERIC NOT NULL DEFAULT 0,
  tests_attempted INTEGER NOT NULL DEFAULT 0,
  performance_level TEXT NOT NULL DEFAULT 'AVERAGE' CHECK (performance_level IN ('STRONG', 'AVERAGE', 'NEEDS_PRACTICE')),
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, topic_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_topic_performance TO authenticated;
GRANT ALL ON public.student_topic_performance TO service_role;
ALTER TABLE public.student_topic_performance ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stp_student_id ON public.student_topic_performance (student_id);
CREATE INDEX IF NOT EXISTS idx_stp_topic_id ON public.student_topic_performance (topic_id);
CREATE INDEX IF NOT EXISTS idx_stp_performance_level ON public.student_topic_performance (performance_level);

CREATE TRIGGER trg_stp_updated_at BEFORE UPDATE ON public.student_topic_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS POLICIES FOR STAGE 4 ANALYTICS
CREATE POLICY "student_topic_performance_select" ON public.student_topic_performance
  FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  );
CREATE POLICY "student_topic_performance_manage" ON public.student_topic_performance
  FOR ALL TO authenticated USING (
    student_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );
