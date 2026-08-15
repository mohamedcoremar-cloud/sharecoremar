-- 1. Role enum value (not referenced elsewhere in this migration)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'logistics_partner';

-- 2. Membership tables
CREATE TABLE public.supplier_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
GRANT SELECT ON public.supplier_users TO authenticated;
GRANT ALL ON public.supplier_users TO service_role;
ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY supplier_users_admin_all ON public.supplier_users FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY supplier_users_self_read ON public.supplier_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER trg_supplier_users_updated BEFORE UPDATE ON public.supplier_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.delivery_partner_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_partner_id uuid NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);
GRANT SELECT ON public.delivery_partner_users TO authenticated;
GRANT ALL ON public.delivery_partner_users TO service_role;
ALTER TABLE public.delivery_partner_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_partner_users_admin_all ON public.delivery_partner_users FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY delivery_partner_users_self_read ON public.delivery_partner_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER trg_delivery_partner_users_updated BEFORE UPDATE ON public.delivery_partner_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Stage detail columns on the append-only timeline
ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS supplier_ready_eta text,
  ADD COLUMN IF NOT EXISTS logistics_delivery_eta text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS vehicle_info text;

-- 4. Scoping helpers (same SECURITY DEFINER pattern as private.has_role/is_admin)
CREATE OR REPLACE FUNCTION private.supplier_id_for(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT supplier_id FROM public.supplier_users
   WHERE user_id = _user_id AND is_active AND deleted_at IS NULL
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.delivery_partner_id_for(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT delivery_partner_id FROM public.delivery_partner_users
   WHERE user_id = _user_id AND is_active AND deleted_at IS NULL
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.order_has_supplier(_order_id uuid, _supplier_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _supplier_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
     WHERE oi.order_id = _order_id AND p.supplier_id = _supplier_id
  );
$$;

-- Derived current fulfillment stage: latest matching timeline row. Never stored.
CREATE OR REPLACE FUNCTION private.order_stage(_order_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.status FROM public.order_status_history h
   WHERE h.order_id = _order_id
     AND h.status IN ('queued_at_supplier','supplier_preparing','ready_for_pickup',
                      'accepted_by_logistics','picked_up_by_logistics','in_transit','delivered')
   ORDER BY h.created_at DESC, h.id DESC
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.order_for_delivery_partner(_order_id uuid, _partner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _partner_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.deliveries d
                  WHERE d.order_id = _order_id AND d.delivery_partner_id = _partner_id)
     AND COALESCE(private.order_stage(_order_id), '') IN
         ('ready_for_pickup','accepted_by_logistics','picked_up_by_logistics','in_transit','delivered');
$$;

REVOKE ALL ON FUNCTION private.supplier_id_for(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.delivery_partner_id_for(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.order_has_supplier(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.order_stage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.order_for_delivery_partner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.supplier_id_for(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.delivery_partner_id_for(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.order_has_supplier(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.order_stage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.order_for_delivery_partner(uuid, uuid) TO authenticated, service_role;

-- 5. Auto-queue at supplier when an order becomes confirmed (place_order untouched)
CREATE OR REPLACE FUNCTION public.queue_order_at_supplier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status <> 'confirmed'::public.order_status THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.order_status_history
              WHERE order_id = NEW.id AND status = 'queued_at_supplier') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.order_status_history(order_id, status, note, is_internal)
  VALUES (NEW.id, 'queued_at_supplier', 'Sent to supplier queue', false);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_order_at_supplier() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_order_at_supplier() TO service_role;
CREATE TRIGGER trg_orders_queue_at_supplier AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.queue_order_at_supplier();

-- 6. Derived stage view (security_invoker so RLS on the base table still applies)
CREATE OR REPLACE VIEW public.order_fulfillment_current WITH (security_invoker = true) AS
SELECT DISTINCT ON (h.order_id)
  h.order_id,
  h.status AS stage,
  h.note,
  h.supplier_ready_eta,
  h.logistics_delivery_eta,
  h.driver_name,
  h.driver_phone,
  h.vehicle_info,
  h.created_at AS stage_at
FROM public.order_status_history h
WHERE h.status IN ('queued_at_supplier','supplier_preparing','ready_for_pickup',
                   'accepted_by_logistics','picked_up_by_logistics','in_transit','delivered')
ORDER BY h.order_id, h.created_at DESC, h.id DESC;
REVOKE ALL ON public.order_fulfillment_current FROM PUBLIC, anon;
GRANT SELECT ON public.order_fulfillment_current TO authenticated, service_role;

-- 7. Supplier stage RPC
CREATE OR REPLACE FUNCTION public.supplier_set_order_stage(
  p_order_id uuid, p_stage text, p_eta text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sup uuid := private.supplier_id_for(auth.uid());
  v_cur text;
  v_allowed text[];
BEGIN
  IF v_uid IS NULL OR v_sup IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT private.order_has_supplier(p_order_id, v_sup) THEN
    RAISE EXCEPTION 'Not authorized for this order' USING ERRCODE = '42501';
  END IF;
  IF p_stage NOT IN ('supplier_preparing','ready_for_pickup') THEN
    RAISE EXCEPTION 'Unsupported supplier stage %', p_stage USING ERRCODE = 'P0001';
  END IF;

  v_cur := COALESCE(private.order_stage(p_order_id), 'none');
  v_allowed := CASE v_cur
    WHEN 'queued_at_supplier'  THEN ARRAY['supplier_preparing']
    WHEN 'supplier_preparing'  THEN ARRAY['ready_for_pickup']
    ELSE ARRAY[]::text[]
  END;
  IF NOT (p_stage = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Invalid stage transition: % -> %', v_cur, p_stage USING ERRCODE = 'P0001';
  END IF;
  IF p_stage = 'supplier_preparing' AND COALESCE(btrim(p_eta), '') = '' THEN
    RAISE EXCEPTION 'A readiness time is required' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.order_status_history(order_id, status, note, is_internal, created_by, supplier_ready_eta)
  VALUES (p_order_id, p_stage, p_note, false, v_uid,
          CASE WHEN p_stage = 'supplier_preparing' THEN btrim(p_eta) ELSE NULL END);

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'from', v_cur, 'to', p_stage);
END;
$$;
REVOKE ALL ON FUNCTION public.supplier_set_order_stage(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.supplier_set_order_stage(uuid, text, text, text) TO authenticated, service_role;

-- 8. Logistics stage RPC (delegates delivered/dispatch to the existing delivery module)
CREATE OR REPLACE FUNCTION public.logistics_set_order_stage(
  p_order_id uuid, p_stage text, p_eta text DEFAULT NULL,
  p_driver_name text DEFAULT NULL, p_driver_phone text DEFAULT NULL,
  p_vehicle_info text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_partner uuid := private.delivery_partner_id_for(auth.uid());
  v_delivery uuid;
  v_cur text;
  v_allowed text[];
BEGIN
  IF v_uid IS NULL OR v_partner IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT private.order_for_delivery_partner(p_order_id, v_partner) THEN
    RAISE EXCEPTION 'Not authorized for this order' USING ERRCODE = '42501';
  END IF;
  IF p_stage NOT IN ('accepted_by_logistics','picked_up_by_logistics','in_transit','delivered') THEN
    RAISE EXCEPTION 'Unsupported logistics stage %', p_stage USING ERRCODE = 'P0001';
  END IF;

  v_cur := COALESCE(private.order_stage(p_order_id), 'none');
  v_allowed := CASE v_cur
    WHEN 'ready_for_pickup'        THEN ARRAY['accepted_by_logistics']
    WHEN 'accepted_by_logistics'   THEN ARRAY['picked_up_by_logistics']
    WHEN 'picked_up_by_logistics'  THEN ARRAY['in_transit']
    WHEN 'in_transit'              THEN ARRAY['delivered']
    ELSE ARRAY[]::text[]
  END;
  IF NOT (p_stage = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Invalid stage transition: % -> %', v_cur, p_stage USING ERRCODE = 'P0001';
  END IF;
  IF p_stage = 'accepted_by_logistics' AND COALESCE(btrim(p_eta), '') = '' THEN
    RAISE EXCEPTION 'A delivery timeframe is required' USING ERRCODE = 'P0001';
  END IF;
  IF p_stage = 'in_transit' AND (COALESCE(btrim(p_driver_name), '') = ''
      OR COALESCE(btrim(p_driver_phone), '') = '' OR COALESCE(btrim(p_vehicle_info), '') = '') THEN
    RAISE EXCEPTION 'Driver name, driver phone and vehicle info are required' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.order_status_history(
    order_id, status, note, is_internal, created_by,
    logistics_delivery_eta, driver_name, driver_phone, vehicle_info)
  VALUES (p_order_id, p_stage, p_note, false, v_uid,
    CASE WHEN p_stage = 'accepted_by_logistics' THEN btrim(p_eta) ELSE NULL END,
    CASE WHEN p_stage = 'in_transit' THEN btrim(p_driver_name) ELSE NULL END,
    CASE WHEN p_stage = 'in_transit' THEN btrim(p_driver_phone) ELSE NULL END,
    CASE WHEN p_stage = 'in_transit' THEN btrim(p_vehicle_info) ELSE NULL END);

  -- Reuse the existing delivery module for the physical movement / delivered state.
  SELECT id INTO v_delivery FROM public.deliveries
   WHERE order_id = p_order_id AND delivery_partner_id = v_partner
   ORDER BY created_at DESC LIMIT 1;

  IF v_delivery IS NOT NULL THEN
    IF p_stage = 'picked_up_by_logistics' THEN
      PERFORM public.update_delivery_status(v_delivery, 'picked_up', p_note);
    ELSIF p_stage = 'in_transit' THEN
      PERFORM public.update_delivery_status(v_delivery, 'out_for_delivery', p_note);
    ELSIF p_stage = 'delivered' THEN
      PERFORM public.update_delivery_status(v_delivery, 'delivered', p_note);
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'from', v_cur, 'to', p_stage);
END;
$$;
REVOKE ALL ON FUNCTION public.logistics_set_order_stage(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.logistics_set_order_stage(uuid, text, text, text, text, text, text) TO authenticated, service_role;

-- 9. Allow a delivery partner's own logins into the existing delivery RPC.
--    ONLY the authorization guard changes; the transition map and side effects are identical.
CREATE OR REPLACE FUNCTION public.update_delivery_status(p_delivery_id uuid, p_new_status_code text, p_note text DEFAULT NULL::text, p_failure_reason_code text DEFAULT NULL::text, p_reschedule_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_delivery record;
  v_current_code text;
  v_new_status record;
  v_reason_id uuid;
  v_allowed text[];
  v_attempt integer;
BEGIN
  SELECT * INTO v_delivery FROM public.deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery % not found', p_delivery_id USING ERRCODE = 'P0002';
  END IF;

  IF v_uid IS NULL OR NOT (
       private.has_role(v_uid,'admin'::public.app_role)
    OR private.has_role(v_uid,'super_admin'::public.app_role)
    OR (v_delivery.delivery_partner_id IS NOT NULL
        AND v_delivery.delivery_partner_id = private.delivery_partner_id_for(v_uid))
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT code INTO v_current_code FROM public.delivery_statuses WHERE id = v_delivery.status_id;

  SELECT * INTO v_new_status FROM public.delivery_statuses WHERE code = p_new_status_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown delivery status %', p_new_status_code USING ERRCODE = 'P0001';
  END IF;

  IF v_current_code = p_new_status_code THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true, 'status', v_current_code);
  END IF;

  v_allowed := CASE v_current_code
    WHEN 'assigned'         THEN ARRAY['picked_up','out_for_delivery','cancelled']
    WHEN 'picked_up'        THEN ARRAY['out_for_delivery','failed','cancelled']
    WHEN 'out_for_delivery' THEN ARRAY['delivered','failed','cancelled']
    WHEN 'failed'           THEN ARRAY['rescheduled','cancelled']
    WHEN 'rescheduled'      THEN ARRAY['out_for_delivery','picked_up','failed','cancelled']
    WHEN 'delivered'        THEN ARRAY[]::text[]
    WHEN 'cancelled'        THEN ARRAY[]::text[]
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_new_status_code = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Invalid delivery transition: % -> %', v_current_code, p_new_status_code USING ERRCODE = 'P0001';
  END IF;

  IF p_new_status_code = 'failed' THEN
    IF p_failure_reason_code IS NULL THEN
      RAISE EXCEPTION 'A failure reason is required when marking a delivery as failed' USING ERRCODE = 'P0001';
    END IF;
    SELECT id INTO v_reason_id FROM public.delivery_failure_reasons WHERE code = p_failure_reason_code;
    IF v_reason_id IS NULL THEN
      RAISE EXCEPTION 'Unknown failure reason %', p_failure_reason_code USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.deliveries
     SET status_id = v_new_status.id,
         delivered_at = CASE WHEN p_new_status_code = 'delivered' THEN now() ELSE delivered_at END,
         scheduled_at = COALESCE(p_reschedule_at, scheduled_at),
         notes = COALESCE(p_note, notes),
         updated_at = now()
   WHERE id = p_delivery_id;

  IF p_new_status_code IN ('delivered','failed') THEN
    v_attempt := COALESCE(v_delivery.attempts_count, 0) + 1;
    INSERT INTO public.delivery_attempts (delivery_id, attempt_number, result, failure_reason_id, note, created_by)
    VALUES (p_delivery_id, v_attempt, p_new_status_code, v_reason_id, p_note, v_uid);
    UPDATE public.deliveries SET attempts_count = v_attempt WHERE id = p_delivery_id;
  END IF;

  IF p_new_status_code = 'delivered' THEN
    UPDATE public.orders SET status = 'delivered'::public.order_status, updated_at = now() WHERE id = v_delivery.order_id;
    INSERT INTO public.order_status_history(order_id, status, note, created_by)
    VALUES (v_delivery.order_id, 'delivered', COALESCE(p_note,'Delivery completed'), v_uid);
  ELSIF p_new_status_code = 'out_for_delivery' THEN
    UPDATE public.orders SET status = 'shipped'::public.order_status, updated_at = now()
     WHERE id = v_delivery.order_id AND status IN ('confirmed','processing');
    INSERT INTO public.order_status_history(order_id, status, note, created_by)
    VALUES (v_delivery.order_id, 'shipped', COALESCE(p_note,'Out for delivery'), v_uid);
  ELSIF p_new_status_code = 'failed' THEN
    INSERT INTO public.order_status_history(order_id, status, note, created_by)
    VALUES (v_delivery.order_id, 'shipped', 'Delivery attempt failed: ' || COALESCE(p_note, p_failure_reason_code), v_uid);
  ELSIF p_new_status_code = 'rescheduled' THEN
    INSERT INTO public.order_status_history(order_id, status, note, created_by)
    VALUES (v_delivery.order_id, 'shipped', 'Delivery rescheduled' || COALESCE(' for ' || p_reschedule_at::text, '') , v_uid);
  END IF;

  RETURN jsonb_build_object('ok', true, 'delivery_id', p_delivery_id, 'from', v_current_code, 'to', p_new_status_code);
END;
$function$;
REVOKE ALL ON FUNCTION public.update_delivery_status(uuid, text, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_delivery_status(uuid, text, text, text, timestamptz) TO authenticated, service_role;

-- 10. Scoped read access for the two portals (additive policies only)
CREATE POLICY orders_supplier_read ON public.orders FOR SELECT TO authenticated
  USING (private.order_has_supplier(id, private.supplier_id_for(auth.uid())));
CREATE POLICY orders_logistics_read ON public.orders FOR SELECT TO authenticated
  USING (private.order_for_delivery_partner(id, private.delivery_partner_id_for(auth.uid())));

CREATE POLICY order_items_supplier_read ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products p
             WHERE p.id = order_items.product_id
               AND p.supplier_id = private.supplier_id_for(auth.uid()))
  );
CREATE POLICY order_items_logistics_read ON public.order_items FOR SELECT TO authenticated
  USING (private.order_for_delivery_partner(order_id, private.delivery_partner_id_for(auth.uid())));

CREATE POLICY osh_supplier_read ON public.order_status_history FOR SELECT TO authenticated
  USING (is_internal = false
     AND private.order_has_supplier(order_id, private.supplier_id_for(auth.uid())));
CREATE POLICY osh_logistics_read ON public.order_status_history FOR SELECT TO authenticated
  USING (is_internal = false
     AND private.order_for_delivery_partner(order_id, private.delivery_partner_id_for(auth.uid())));

CREATE POLICY deliveries_logistics_read ON public.deliveries FOR SELECT TO authenticated
  USING (delivery_partner_id = private.delivery_partner_id_for(auth.uid()));
CREATE POLICY delivery_partners_own_read ON public.delivery_partners FOR SELECT TO authenticated
  USING (id = private.delivery_partner_id_for(auth.uid()));
CREATE POLICY delivery_statuses_logistics_read ON public.delivery_statuses FOR SELECT TO authenticated
  USING (private.delivery_partner_id_for(auth.uid()) IS NOT NULL);
CREATE POLICY suppliers_linked_user_read ON public.suppliers FOR SELECT TO authenticated
  USING (id = private.supplier_id_for(auth.uid()));