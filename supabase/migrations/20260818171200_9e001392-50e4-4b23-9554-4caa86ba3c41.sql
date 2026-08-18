DROP VIEW IF EXISTS public.admin_orders;
DROP VIEW IF EXISTS public.admin_payments;

CREATE OR REPLACE FUNCTION public.admin_orders()
RETURNS SETOF public.orders
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.orders ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_payments()
RETURNS SETOF public.payments
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.payments ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_orders() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_payments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_orders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_payments() TO authenticated, service_role;