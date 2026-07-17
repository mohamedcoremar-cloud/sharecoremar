REVOKE ALL ON FUNCTION public.record_content_version() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_content_version() TO service_role;

REVOKE ALL ON FUNCTION public.rollback_content_version(text, uuid, integer) FROM PUBLIC, anon;
-- keep authenticated so admins/super_admins can invoke; the function itself checks the role
GRANT EXECUTE ON FUNCTION public.rollback_content_version(text, uuid, integer) TO authenticated, service_role;