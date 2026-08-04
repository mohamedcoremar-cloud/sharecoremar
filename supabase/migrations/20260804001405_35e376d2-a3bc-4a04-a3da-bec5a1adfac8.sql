DROP VIEW IF EXISTS public.public_payment_methods;

-- Restore public row visibility for enabled methods, but block the sensitive
-- config column via column-level privileges (RLS is row-level only).
CREATE POLICY pm_public_enabled ON public.payment_methods
  FOR SELECT TO anon, authenticated
  USING (is_enabled = true);

REVOKE ALL ON public.payment_methods FROM anon, authenticated;

GRANT SELECT (id, code, name_en, name_ar, description_en, description_ar,
              instructions_en, instructions_ar, icon_url, is_enabled,
              is_available_at_launch, environment, fees_percent, fees_fixed,
              sort_order, created_at, updated_at)
  ON public.payment_methods TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;