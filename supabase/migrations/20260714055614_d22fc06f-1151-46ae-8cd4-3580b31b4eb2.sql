
-- 1) Move SECURITY DEFINER helpers to a non-exposed schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.is_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) media_library: drop public read, add admin-only read
DROP POLICY IF EXISTS "Media library public read" ON public.media_library;
CREATE POLICY "Media library admin read" ON public.media_library
  FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

-- 3) site_settings: restrict public read to known-safe keys
DROP POLICY IF EXISTS "Site settings public read" ON public.site_settings;
CREATE POLICY "Site settings public read safe keys" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('branding', 'footer', 'social'));

-- 4) suppliers: remove public PII exposure, expose only safe columns via view
DROP POLICY IF EXISTS "Public read approved suppliers" ON public.suppliers;

CREATE POLICY "Suppliers select own or admin" ON public.suppliers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin(auth.uid()));

CREATE OR REPLACE VIEW public.public_suppliers
  WITH (security_invoker = on) AS
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

-- View needs an underlying-row policy readable by anon; add a narrow one that only exposes approved rows and rely on the view's projection.
CREATE POLICY "Suppliers public read approved (safe cols via view)" ON public.suppliers
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- Revoke direct table read from anon so only the view is usable publicly for safe columns.
REVOKE SELECT ON public.suppliers FROM anon;
GRANT SELECT (id, company_name, brand_name, description, governorate, city, logo_url, is_featured, business_type, created_at, status) ON public.suppliers TO anon;

GRANT SELECT ON public.public_suppliers TO anon, authenticated;
