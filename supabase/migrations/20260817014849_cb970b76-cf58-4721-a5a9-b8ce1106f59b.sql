-- 1) Suppliers cannot self-approve
CREATE OR REPLACE FUNCTION public.protect_supplier_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.is_admin(auth.uid()) THEN
    NEW.status := OLD.status;
    NEW.is_featured := OLD.is_featured;
    NEW.rating := OLD.rating;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_supplier_verification_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_supplier_verification_fields ON public.suppliers;
CREATE TRIGGER protect_supplier_verification_fields
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.protect_supplier_verification_fields();

-- new supplier applications always start as pending / not featured
CREATE OR REPLACE FUNCTION public.force_supplier_pending_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT private.is_admin(auth.uid()) THEN
    NEW.status := 'pending'::public.verification_status;
    NEW.is_featured := false;
    NEW.rating := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.force_supplier_pending_on_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS force_supplier_pending_on_insert ON public.suppliers;
CREATE TRIGGER force_supplier_pending_on_insert
BEFORE INSERT ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.force_supplier_pending_on_insert();

-- 2) Remove full-row order access for suppliers / logistics
DROP POLICY IF EXISTS "orders_supplier_read" ON public.orders;
DROP POLICY IF EXISTS "orders_logistics_read" ON public.orders;

-- Column-limited fulfillment views (owner-rights views; each filters by caller scope)
CREATE OR REPLACE VIEW public.supplier_orders_view AS
SELECT o.id,
       o.order_number,
       o.created_at,
       o.status,
       o.total,
       o.currency
  FROM public.orders o
 WHERE private.order_has_supplier(o.id, private.supplier_id_for(auth.uid()));

CREATE OR REPLACE VIEW public.logistics_orders_view AS
SELECT o.id,
       o.order_number,
       o.created_at,
       o.total,
       o.currency,
       jsonb_build_object(
         'full_name', o.shipping_address->>'full_name',
         'phone',     o.shipping_address->>'phone',
         'street',    o.shipping_address->>'street',
         'building',  o.shipping_address->>'building',
         'apartment', o.shipping_address->>'apartment',
         'landmark',  o.shipping_address->>'landmark',
         'city',      o.shipping_address->>'city',
         'governorate', o.shipping_address->>'governorate'
       ) AS delivery_address
  FROM public.orders o
 WHERE private.order_for_delivery_partner(o.id, private.delivery_partner_id_for(auth.uid()));

REVOKE ALL ON public.supplier_orders_view FROM PUBLIC, anon;
REVOKE ALL ON public.logistics_orders_view FROM PUBLIC, anon;
GRANT SELECT ON public.supplier_orders_view TO authenticated;
GRANT SELECT ON public.logistics_orders_view TO authenticated;