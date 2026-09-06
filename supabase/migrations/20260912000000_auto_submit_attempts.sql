-- 20260912000000_auto_submit_attempts.sql
-- Function and trigger to auto‑submit attempts when they expire

-- Ensure pg_cron extension is available (Supabase supports it on Pro plans)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function that scans for expired IN_PROGRESS attempts and submits them
CREATE OR REPLACE FUNCTION public.auto_submit_expired_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.test_attempts
    WHERE status = 'IN_PROGRESS' AND expires_at <= now()
  LOOP
    PERFORM public.submit_test_attempt(rec.id, true);
  END LOOP;
END;
$$;

-- Schedule the function to run every minute
SELECT cron.schedule('auto_submit_expired_attempts', '* * * * *', $$SELECT public.auto_submit_expired_attempts();$$);

GRANT EXECUTE ON FUNCTION public.auto_submit_expired_attempts() TO authenticated, service_role;
