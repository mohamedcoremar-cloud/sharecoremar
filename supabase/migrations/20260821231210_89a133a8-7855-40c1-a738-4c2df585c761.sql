REVOKE ALL ON FUNCTION public.set_profile_ref_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_ref_code(text) FROM PUBLIC, anon, authenticated;