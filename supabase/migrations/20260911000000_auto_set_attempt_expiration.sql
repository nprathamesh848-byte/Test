-- 20260911000000_auto_set_attempt_expiration.sql
-- Trigger to automatically set expires_at for a test attempt based on test duration

CREATE OR REPLACE FUNCTION public.set_attempt_expiration()
RETURNS TRIGGER AS $$
DECLARE
  v_duration INTEGER;
BEGIN
  -- Fetch test duration in minutes
  SELECT duration_minutes INTO v_duration FROM public.tests WHERE id = NEW.test_id;
  IF v_duration IS NULL OR v_duration <= 0 THEN
    RAISE EXCEPTION 'Test duration is invalid or not set for test %', NEW.test_id;
  END IF;
  -- Set expires_at as started_at + duration minutes
  NEW.expires_at := NEW.started_at + (v_duration || ' minutes')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on inserts to test_attempts
CREATE TRIGGER trg_set_attempt_expiration
BEFORE INSERT ON public.test_attempts
FOR EACH ROW EXECUTE FUNCTION public.set_attempt_expiration();

GRANT EXECUTE ON FUNCTION public.set_attempt_expiration() TO authenticated, service_role;
