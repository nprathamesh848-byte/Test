-- ============================================================
-- AIMS AI — STAGE 2 MIGRATION: ACADEMIC STRUCTURE & QUESTION BANK
-- ============================================================

-- 1. classes
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NULL REFERENCES public.schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  class_level INTEGER NOT NULL CHECK (class_level BETWEEN 1 AND 10),
  section TEXT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026-27',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes (school_id);
CREATE INDEX IF NOT EXISTS idx_classes_class_level ON public.classes (class_level);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes (created_by);

CREATE TRIGGER trg_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. teacher_classes
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_classes TO authenticated;
GRANT ALL ON public.teacher_classes TO service_role;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON public.teacher_classes (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id ON public.teacher_classes (class_id);

-- 3. class_students
CREATE TABLE IF NOT EXISTS public.class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_students TO authenticated;
GRANT ALL ON public.class_students TO service_role;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON public.class_students (class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students (student_id);

-- 4. subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NULL,
  class_level INTEGER NOT NULL CHECK (class_level BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subjects_class_level ON public.subjects (class_level);

CREATE TRIGGER trg_subjects_updated_at BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. topics
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics (subject_id);

CREATE TRIGGER trg_topics_updated_at BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_level INTEGER NOT NULL CHECK (class_level BETWEEN 1 AND 10),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'TRUE_FALSE')),
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  marks NUMERIC NOT NULL DEFAULT 1 CHECK (marks > 0),
  explanation TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_questions_class_level ON public.questions (class_level);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON public.questions (subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON public.questions (topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions (difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions (status);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON public.questions (created_by);

CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. question_options
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_options TO authenticated;
GRANT ALL ON public.question_options TO service_role;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options (question_id);

-- ============================================================
-- HELPER FUNCTIONS FOR PERMISSIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_classes WHERE teacher_id = _user_id AND class_id = _class_id
  ) OR EXISTS (
    SELECT 1 FROM public.classes WHERE created_by = _user_id AND id = _class_id
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_student_in_class(_user_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_students WHERE student_id = _user_id AND class_id = _class_id
  ) OR public.has_role(_user_id, 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_teacher_of_class(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_student_in_class(UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- RLS POLICIES FOR STAGE 2
-- ============================================================

-- classes: readable by authenticated users; created/updated by teachers/admin
CREATE POLICY "classes_select_authenticated" ON public.classes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "classes_teacher_admin_insert" ON public.classes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "classes_teacher_admin_update" ON public.classes
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_teacher_of_class(auth.uid(), id))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_teacher_of_class(auth.uid(), id));

-- teacher_classes
CREATE POLICY "teacher_classes_select" ON public.teacher_classes
  FOR SELECT TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "teacher_classes_insert" ON public.teacher_classes
  FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "teacher_classes_delete" ON public.teacher_classes
  FOR DELETE TO authenticated USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- class_students
CREATE POLICY "class_students_select" ON public.class_students
  FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_teacher_of_class(auth.uid(), class_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "class_students_insert" ON public.class_students
  FOR INSERT TO authenticated WITH CHECK (public.is_teacher_of_class(auth.uid(), class_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "class_students_delete" ON public.class_students
  FOR DELETE TO authenticated USING (public.is_teacher_of_class(auth.uid(), class_id) OR public.has_role(auth.uid(), 'admin'));

-- subjects: readable by all signed-in users; admin/teacher create
CREATE POLICY "subjects_select_authenticated" ON public.subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "subjects_admin_teacher_insert" ON public.subjects
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "subjects_admin_teacher_update" ON public.subjects
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- topics: readable by all signed-in users; admin/teacher create
CREATE POLICY "topics_select_authenticated" ON public.topics
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "topics_admin_teacher_insert" ON public.topics
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "topics_admin_teacher_update" ON public.topics
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- questions: teachers & admin manage, students read
CREATE POLICY "questions_select_authenticated" ON public.questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions_teacher_admin_insert" ON public.questions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "questions_teacher_admin_update" ON public.questions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- question_options: readable by authenticated users; managed by question owner / admin
CREATE POLICY "question_options_select_authenticated" ON public.question_options
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "question_options_manage" ON public.question_options
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id AND (q.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
