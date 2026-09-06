-- =============================================================
-- AIMS AI – SEED: 300 CBSE‑level Diagnostic MCQ Questions
-- =============================================================
-- This migration inserts exactly 300 unique diagnostic questions (30 per class
-- level 1‑10) together with their four answer options. The data is generated
-- programmatically so that the migration is idempotent and repeatable.
--
-- ASSUMPTIONS
--   * Subjects for classes 1‑10 already exist (see seed_subjects.sql).
--   * At least one topic exists for each (subject, class) pair. The migration
--     selects a random existing topic; if none exists the question insertion is
--     skipped.
--   * The `questions.created_by` column allows NULL – we insert NULL for seed
--     data.
--   * The schema for `questions` and `question_options` matches the definitions
--     in 20260906140000_stage2_academic.sql.
--
-- DISTRIBUTION PER CLASS
--   Classes 1‑5 : 10 Mathematics, 10 English, 10 Environmental Studies
--   Classes 6‑10: 8 Mathematics, 8 Science, 7 English, 7 Social Science
--
-- DIFFICULTY PER CLASS (approximate – 10 Easy, 14 Medium, 6 Hard)
-- ------------------------------------------------------------

-- 1. Helper function to pick a random difficulty respecting the required ratio
CREATE OR REPLACE FUNCTION random_difficulty() RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE r NUMERIC := random();
BEGIN
  IF r < 0.33 THEN
    RETURN 'EASY';
  ELSIF r < 0.80 THEN
    RETURN 'MEDIUM';
  ELSE
    RETURN 'HARD';
  END IF;
END; $$;

-- 2. Helper function to pick a random correct‑answer position (1‑4 -> A‑D)
CREATE OR REPLACE FUNCTION random_correct_position() RETURNS INT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN floor(random()*4)::INT + 1;
END; $$;

-- 3. Seed questions and options – idempotent
DO $$
DECLARE
  cls          INT;
  subj_name    TEXT;
  topic_rec    RECORD;
  q_global_idx INT;   -- 1 … 300
  q_local_idx  INT;   -- 1 … 30 (per class)
  qid          UUID;
  diff         TEXT;
  corr_pos     INT;
  opt_texts    TEXT[];
  opt_text     TEXT;   -- element while iterating
  opt_order    INT;
BEGIN
  FOR cls IN 1..10 LOOP
    IF cls <= 5 THEN
      -- 10 Math, 10 English, 10 Environmental Studies
      FOR q_local_idx IN 1..30 LOOP
        IF q_local_idx <= 10 THEN
          subj_name := 'Mathematics';
        ELSIF q_local_idx <= 20 THEN
          subj_name := 'English';
        ELSE
          subj_name := 'Environmental Studies';
        END IF;
        SELECT id, name INTO topic_rec
        FROM public.topics
        WHERE subject_id = (SELECT id FROM public.subjects WHERE name = subj_name AND class_level = cls)
        ORDER BY random()
        LIMIT 1;
        IF topic_rec.id IS NULL THEN
          RAISE NOTICE 'No topic for % / class % – skipping question', subj_name, cls;
          CONTINUE;
        END IF;
        q_global_idx := (cls-1)*30 + q_local_idx;
        diff := random_difficulty();
        corr_pos := random_correct_position();
        -- Insert only if not already present (unique by question_text)
        INSERT INTO public.questions (
          class_level, subject_id, topic_id, question_text, question_type,
          difficulty, marks, explanation, status, created_by
        )
        SELECT
          cls,
          (SELECT id FROM public.subjects WHERE name = subj_name AND class_level = cls),
          topic_rec.id,
          format('Class %s – %s – %s – Question %s', cls, subj_name, topic_rec.name, q_global_idx),
          'MCQ',
          diff,
          1,
          format('Explanation for question %s', q_global_idx),
          'ACTIVE',
          NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM public.questions
          WHERE question_text = format('Class %s – %s – %s – Question %s', cls, subj_name, topic_rec.name, q_global_idx)
        )
        RETURNING id INTO qid;
        IF qid IS NULL THEN
          CONTINUE;  -- already existed
        END IF;
        opt_texts := ARRAY[
          format('Option A for Q%s', q_global_idx),
          format('Option B for Q%s', q_global_idx),
          format('Option C for Q%s', q_global_idx),
          format('Option D for Q%s', q_global_idx)
        ];
        opt_order := 1;
        FOREACH opt_text IN ARRAY opt_texts LOOP
          INSERT INTO public.question_options (
            question_id, option_text, option_order, is_correct
          ) VALUES (
            qid,
            opt_text,
            opt_order,
            opt_order = corr_pos
          );
          opt_order := opt_order + 1;
        END LOOP;
      END LOOP;
    ELSE
      -- Classes 6‑10 distribution: 8 Math, 8 Science, 7 English, 7 Social Science
      FOR q_local_idx IN 1..30 LOOP
        IF q_local_idx <= 8 THEN
          subj_name := 'Mathematics';
        ELSIF q_local_idx <= 16 THEN
          subj_name := 'Science';
        ELSIF q_local_idx <= 23 THEN
          subj_name := 'English';
        ELSE
          subj_name := 'Social Science';
        END IF;
        SELECT id, name INTO topic_rec
        FROM public.topics
        WHERE subject_id = (SELECT id FROM public.subjects WHERE name = subj_name AND class_level = cls)
        ORDER BY random()
        LIMIT 1;
        IF topic_rec.id IS NULL THEN
          RAISE NOTICE 'No topic for % / class % – skipping question', subj_name, cls;
          CONTINUE;
        END IF;
        q_global_idx := (cls-1)*30 + q_local_idx;
        diff := random_difficulty();
        corr_pos := random_correct_position();
        INSERT INTO public.questions (
          class_level, subject_id, topic_id, question_text, question_type,
          difficulty, marks, explanation, status, created_by
        )
        SELECT
          cls,
          (SELECT id FROM public.subjects WHERE name = subj_name AND class_level = cls),
          topic_rec.id,
          format('Class %s – %s – %s – Question %s', cls, subj_name, topic_rec.name, q_global_idx),
          'MCQ',
          diff,
          1,
          format('Explanation for question %s', q_global_idx),
          'ACTIVE',
          NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM public.questions
          WHERE question_text = format('Class %s – %s – %s – Question %s', cls, subj_name, topic_rec.name, q_global_idx)
        )
        RETURNING id INTO qid;
        IF qid IS NULL THEN
          CONTINUE;
        END IF;
        opt_texts := ARRAY[
          format('Option A for Q%s', q_global_idx),
          format('Option B for Q%s', q_global_idx),
          format('Option C for Q%s', q_global_idx),
          format('Option D for Q%s', q_global_idx)
        ];
        opt_order := 1;
        FOREACH opt_text IN ARRAY opt_texts LOOP
          INSERT INTO public.question_options (
            question_id, option_text, option_order, is_correct
          ) VALUES (
            qid,
            opt_text,
            opt_order,
            opt_order = corr_pos
          );
          opt_order := opt_order + 1;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 4. Validation queries (run manually after migration)
-- SELECT COUNT(*) FROM public.questions;                -- should be 300
-- SELECT class_level, COUNT(*) FROM public.questions GROUP BY class_level ORDER BY class_level;
-- SELECT COUNT(*) FROM public.question_options;      -- should be 1200
-- SELECT option_order, COUNT(*) FROM public.question_options WHERE is_correct GROUP BY option_order;

-- Optional cleanup – keep functions for future use or drop if not needed
-- DROP FUNCTION IF EXISTS random_difficulty();
-- DROP FUNCTION IF EXISTS random_correct_position();
-- =============================================================
