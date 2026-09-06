-- 20260909000000_auto_enroll_student.sql
-- Auto enrollment of students into matching class upon insert

CREATE OR REPLACE FUNCTION public.auto_enroll_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_class_id UUID;
BEGIN
  -- Find first active class matching the student's class_level (order by name for deterministic first)
  SELECT id INTO v_class_id
  FROM public.classes
  WHERE class_level = NEW.class_level
    AND status = 'ACTIVE'
    AND (NEW.school_id IS NULL OR school_id = NEW.school_id)
  ORDER BY name ASC
  LIMIT 1;

  IF v_class_id IS NOT NULL THEN
    INSERT INTO public.class_students (class_id, student_id)
    VALUES (v_class_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on students table after insert
CREATE TRIGGER auto_enroll_student_trigger
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_student();

-- Update test_assignments policy to allow students to see assignments by class enrollment
DROP POLICY IF EXISTS test_assignments_select_by_class ON public.test_assignments;
CREATE POLICY test_assignments_select_by_class ON public.test_assignments
FOR SELECT TO authenticated USING (
  student_id = auth.uid()
  OR assigned_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR class_id = (
    SELECT cs.class_id FROM public.class_students cs WHERE cs.student_id = auth.uid()
  )
);
