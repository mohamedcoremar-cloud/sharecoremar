DROP POLICY IF EXISTS pm_public_enabled ON public.payment_methods;

CREATE OR REPLACE VIEW public.public_payment_methods
WITH (security_invoker = false) AS
SELECT id, code, name_en, name_ar, description_en, description_ar,
       instructions_en, instructions_ar, icon_url,
       fees_percent, fees_fixed, is_available_at_launch, sort_order
  FROM public.payment_methods
 WHERE is_enabled = true;

REVOKE ALL ON public.public_payment_methods FROM anon, authenticated;
GRANT SELECT ON public.public_payment_methods TO anon, authenticated;
GRANT ALL ON public.public_payment_methods TO service_role;