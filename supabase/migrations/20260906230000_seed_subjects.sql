-- ============================================================
-- AIMS AI — SEED: Standard Subjects for Classes 1–10
-- ============================================================
-- The subjects table was empty, causing the Subject dropdown on
-- Teacher → Create Assessment to show no options.
--
-- Uses ON CONFLICT to avoid duplicates if subjects already exist.
-- Requires a unique constraint on (name, class_level).
-- ============================================================

-- Add a unique constraint so ON CONFLICT works and prevents duplicates going forward
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subjects_name_class_level_key'
  ) THEN
    ALTER TABLE public.subjects ADD CONSTRAINT subjects_name_class_level_key UNIQUE (name, class_level);
  END IF;
END $$;

-- Seed subjects for Classes 1–10
INSERT INTO public.subjects (name, class_level, status) VALUES
  -- Class 1
  ('Mathematics', 1, 'ACTIVE'),
  ('English', 1, 'ACTIVE'),
  ('Hindi', 1, 'ACTIVE'),
  ('Environmental Studies', 1, 'ACTIVE'),
  -- Class 2
  ('Mathematics', 2, 'ACTIVE'),
  ('English', 2, 'ACTIVE'),
  ('Hindi', 2, 'ACTIVE'),
  ('Environmental Studies', 2, 'ACTIVE'),
  -- Class 3
  ('Mathematics', 3, 'ACTIVE'),
  ('English', 3, 'ACTIVE'),
  ('Hindi', 3, 'ACTIVE'),
  ('Environmental Studies', 3, 'ACTIVE'),
  -- Class 4
  ('Mathematics', 4, 'ACTIVE'),
  ('English', 4, 'ACTIVE'),
  ('Hindi', 4, 'ACTIVE'),
  ('Environmental Studies', 4, 'ACTIVE'),
  -- Class 5
  ('Mathematics', 5, 'ACTIVE'),
  ('English', 5, 'ACTIVE'),
  ('Hindi', 5, 'ACTIVE'),
  ('Environmental Studies', 5, 'ACTIVE'),
  -- Class 6
  ('Mathematics', 6, 'ACTIVE'),
  ('Science', 6, 'ACTIVE'),
  ('English', 6, 'ACTIVE'),
  ('Hindi', 6, 'ACTIVE'),
  ('Social Science', 6, 'ACTIVE'),
  ('Sanskrit', 6, 'ACTIVE'),
  -- Class 7
  ('Mathematics', 7, 'ACTIVE'),
  ('Science', 7, 'ACTIVE'),
  ('English', 7, 'ACTIVE'),
  ('Hindi', 7, 'ACTIVE'),
  ('Social Science', 7, 'ACTIVE'),
  ('Sanskrit', 7, 'ACTIVE'),
  -- Class 8
  ('Mathematics', 8, 'ACTIVE'),
  ('Science', 8, 'ACTIVE'),
  ('English', 8, 'ACTIVE'),
  ('Hindi', 8, 'ACTIVE'),
  ('Social Science', 8, 'ACTIVE'),
  ('Sanskrit', 8, 'ACTIVE'),
  -- Class 9
  ('Mathematics', 9, 'ACTIVE'),
  ('Science', 9, 'ACTIVE'),
  ('English', 9, 'ACTIVE'),
  ('Hindi', 9, 'ACTIVE'),
  ('Social Science', 9, 'ACTIVE'),
  ('Sanskrit', 9, 'ACTIVE'),
  -- Class 10
  ('Mathematics', 10, 'ACTIVE'),
  ('Science', 10, 'ACTIVE'),
  ('English', 10, 'ACTIVE'),
  ('Hindi', 10, 'ACTIVE'),
  ('Social Science', 10, 'ACTIVE'),
  ('Sanskrit', 10, 'ACTIVE')
ON CONFLICT (name, class_level) DO NOTHING;
