-- Public listing view runs as the querying user (no elevated privileges)
DROP VIEW IF EXISTS public.public_payment_methods;
CREATE VIEW public.public_payment_methods
WITH (security_invoker = true) AS
  SELECT id, code, name_en, name_ar, description_en, description_ar,
         instructions_en, instructions_ar, icon_url,
         fees_percent, fees_fixed, sort_order,
         is_enabled, is_available_at_launch
    FROM public.payment_methods
   WHERE is_enabled = true AND is_available_at_launch = true;

REVOKE ALL ON public.public_payment_methods FROM anon, authenticated;
GRANT SELECT ON public.public_payment_methods TO anon, authenticated;
GRANT ALL ON public.public_payment_methods TO service_role;

-- Row access for the public listing, limited to display-safe columns via column grants
DROP POLICY IF EXISTS pm_public_display ON public.payment_methods;
CREATE POLICY pm_public_display ON public.payment_methods
  FOR SELECT TO anon, authenticated
  USING (is_enabled = true AND is_available_at_launch = true);

REVOKE SELECT ON public.payment_methods FROM anon, authenticated;
GRANT SELECT (
  id, code, name_en, name_ar, description_en, description_ar,
  instructions_en, instructions_ar, icon_url,
  fees_percent, fees_fixed, sort_order, is_enabled, is_available_at_launch,
  environment, created_at, updated_at
) ON public.payment_methods TO anon, authenticated;