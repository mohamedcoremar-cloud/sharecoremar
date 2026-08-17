DROP VIEW IF EXISTS public.supplier_orders_view;
DROP VIEW IF EXISTS public.logistics_orders_view;

CREATE OR REPLACE FUNCTION public.supplier_orders()
RETURNS TABLE (
  id uuid,
  order_number text,
  created_at timestamptz,
  status public.order_status,
  total numeric,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT o.id, o.order_number, o.created_at, o.status, o.total, o.currency
    FROM public.orders o
   WHERE private.order_has_supplier(o.id, private.supplier_id_for(auth.uid()))
   ORDER BY o.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.logistics_orders()
RETURNS TABLE (
  id uuid,
  order_number text,
  created_at timestamptz,
  total numeric,
  currency text,
  delivery_address jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT o.id, o.order_number, o.created_at, o.total, o.currency,
         jsonb_build_object(
           'full_name', o.shipping_address->>'full_name',
           'phone',     o.shipping_address->>'phone',
           'street',    o.shipping_address->>'street',
           'building',  o.shipping_address->>'building',
           'apartment', o.shipping_address->>'apartment',
           'landmark',  o.shipping_address->>'landmark',
           'city',      o.shipping_address->>'city',
           'governorate', o.shipping_address->>'governorate'
         )
    FROM public.orders o
   WHERE private.order_for_delivery_partner(o.id, private.delivery_partner_id_for(auth.uid()))
   ORDER BY o.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.supplier_orders() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.logistics_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.supplier_orders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.logistics_orders() TO authenticated;