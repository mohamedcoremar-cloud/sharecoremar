
-- Recreate the view as security_invoker=on so the linter is satisfied
DROP VIEW IF EXISTS public.public_suppliers;
CREATE VIEW public.public_suppliers
  WITH (security_invoker = on) AS
SELECT
  id, company_name, brand_name, description, governorate, city,
  logo_url, is_featured, business_type, created_at
FROM public.suppliers
WHERE status = 'approved';

GRANT SELECT ON public.public_suppliers TO anon, authenticated;

-- Add approved-read RLS policy scoped so column privileges enforce PII protection for anon
CREATE POLICY "Suppliers read approved public"
  ON public.suppliers
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Anon can only SELECT safe columns from suppliers directly
REVOKE SELECT ON public.suppliers FROM anon;
GRANT SELECT (id, company_name, brand_name, description, governorate, city, logo_url,
              is_featured, business_type, created_at, status)
  ON public.suppliers TO anon;
