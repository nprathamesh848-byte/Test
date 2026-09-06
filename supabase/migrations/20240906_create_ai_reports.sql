-- Migration: create ai_reports table (superseded by stage5 migration)
-- This migration has been replaced by 20260906170000_stage5_ai_reports.sql
-- which creates ai_reports with the correct schema using gen_random_uuid()
-- and referencing the correct tables (profiles, classes, tests).
SELECT 1; -- no-op placeholder
