
-- Drop the broad approved-read policy that still exposed PII rows to authenticated users
DROP POLICY IF EXISTS "Suppliers public read approved (safe cols via view)" ON public.suppliers;

-- Revoke direct table access from anon entirely; anon uses the view
REVOKE SELECT ON public.suppliers FROM anon;

-- Recreate view as SECURITY DEFINER (default) so it doesn't require underlying RLS for public rows
DROP VIEW IF EXISTS public.public_suppliers;
CREATE VIEW public.public_suppliers
  WITH (security_invoker = off) AS
SELECT
  id,
  company_name,
  brand_name,
  description,
  governorate,
  city,
  logo_url,
  is_featured,
  business_type,
  created_at
FROM public.suppliers
WHERE status = 'approved';

GRANT SELECT ON public.public_suppliers TO anon, authenticated;
