-- Trigger-only functions: nobody should call these directly
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_user_email_updated() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_columns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_owner_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Helpers: signed-in users only (needed by RLS + app), never anonymous
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_audit(TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit(TEXT, TEXT, UUID, JSONB) TO authenticated, service_role;