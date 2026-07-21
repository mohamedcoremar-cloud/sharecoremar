
-- 1) Suppliers: drop the anon-exposing policy. The public_suppliers view already provides safe columns.
DROP POLICY IF EXISTS "Suppliers read approved public" ON public.suppliers;

-- 2) Revoke execute on SECURITY DEFINER helpers from public/anon/authenticated where not required.
REVOKE EXECUTE ON FUNCTION public.merge_guest_cart_on_login(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rollback_content_version(text, uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_order_payment(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_order_payment(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_content_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
