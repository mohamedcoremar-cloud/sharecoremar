-- Remove full-row read access and re-grant only customer-safe columns
REVOKE SELECT ON public.orders FROM authenticated, anon;
REVOKE SELECT ON public.payments FROM authenticated, anon;

GRANT SELECT (id, order_number, buyer_id, status, payment_method, payment_status, subtotal, tax, shipping, total, currency, shipping_address, contact_phone, notes, created_at, updated_at, discount, coupon_code, address_id, customer_email)
  ON public.orders TO authenticated, anon;

GRANT SELECT (id, order_id, method, amount, currency, status, transfer_reference, proof_media_id, proof_url, transferred_at, reviewed_at, gateway_reference, metadata, created_at, updated_at)
  ON public.payments TO authenticated, anon;

-- Admin-only surfaces that still expose the internal columns
CREATE OR REPLACE VIEW public.admin_orders WITH (security_invoker = false) AS
  SELECT o.* FROM public.orders o WHERE private.is_admin(auth.uid());

CREATE OR REPLACE VIEW public.admin_payments WITH (security_invoker = false) AS
  SELECT p.* FROM public.payments p WHERE private.is_admin(auth.uid());

REVOKE ALL ON public.admin_orders FROM anon;
REVOKE ALL ON public.admin_payments FROM anon;
GRANT SELECT ON public.admin_orders TO authenticated;
GRANT SELECT ON public.admin_payments TO authenticated;
GRANT ALL ON public.admin_orders TO service_role;
GRANT ALL ON public.admin_payments TO service_role;