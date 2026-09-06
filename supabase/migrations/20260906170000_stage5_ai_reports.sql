-- ============================================================
-- AIMS AI — STAGE 5 MIGRATION: AI REPORTS & RECOMMENDATIONS
-- ============================================================

-- 1. ai_reports
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  test_id UUID NULL REFERENCES public.tests(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'STUDENT_TEST_ANALYSIS',
    'STUDENT_OVERALL_ANALYSIS',
    'STUDENT_TOPIC_ANALYSIS',
    'STUDENT_PROGRESS_ANALYSIS',
    'TEACHER_STUDENT_ANALYSIS',
    'CLASS_ANALYSIS',
    'CLASS_TOPIC_ANALYSIS',
    'TEST_ANALYSIS',
    'STUDY_RECOMMENDATION'
  )),
  analysis_scope TEXT NOT NULL DEFAULT 'STUDENT' CHECK (analysis_scope IN ('STUDENT', 'CLASS', 'TEST', 'SYSTEM')),
  input_snapshot JSONB NOT NULL,
  ai_response JSONB NOT NULL,
  summary TEXT NOT NULL,
  model_version TEXT NULL DEFAULT 'gemini-3.6-flash',
  prompt_version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reports TO authenticated;
GRANT ALL ON public.ai_reports TO service_role;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_reports_user_id ON public.ai_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_student_id ON public.ai_reports (student_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_test_id ON public.ai_reports (test_id);

CREATE TRIGGER trg_ai_reports_updated_at BEFORE UPDATE ON public.ai_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. ai_recommendations
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  subject_id UUID NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL DEFAULT 'PRACTICE_TOPIC' CHECK (recommendation_type IN (
    'PRACTICE_TOPIC', 'REVIEW_MISTAKES', 'RETAKE_TEST', 'PRACTICE_DIFFICULTY', 'TIME_MANAGEMENT'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  reason TEXT NOT NULL,
  source_report_id UUID NULL REFERENCES public.ai_reports(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendations TO authenticated;
GRANT ALL ON public.ai_recommendations TO service_role;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_rec_student_id ON public.ai_recommendations (student_id);

-- RLS POLICIES FOR STAGE 5
CREATE POLICY "ai_reports_select" ON public.ai_reports
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  );
CREATE POLICY "ai_reports_insert" ON public.ai_reports
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "ai_recommendations_select" ON public.ai_recommendations
  FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  );
CREATE POLICY "ai_recommendations_manage" ON public.ai_recommendations
  FOR ALL TO authenticated USING (
    student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
  );
