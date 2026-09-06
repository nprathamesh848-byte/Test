-- ============================================================
-- AIMS AI — HOTFIX: Allow teachers to read all students
-- (Required for "Add Student to Class" search to work)
-- ============================================================

-- Without this, teachers query the `students` table and get
-- zero results because the existing RLS only allows own-row access.
DROP POLICY IF EXISTS "students_teacher_can_read" ON public.students;

CREATE POLICY "students_teacher_can_read" ON public.students
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Also allow teachers to read profiles of students (for email display in class roster)
-- The profiles policy already allows admin; extend to teacher for roster display
DROP POLICY IF EXISTS "profiles_teacher_can_read" ON public.profiles;

CREATE POLICY "profiles_teacher_can_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  );
