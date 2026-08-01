
-- ============ LOOKUPS ============
CREATE TABLE public.delivery_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_statuses TO anon, authenticated;
GRANT ALL ON public.delivery_statuses TO service_role;
ALTER TABLE public.delivery_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_statuses_read_all" ON public.delivery_statuses FOR SELECT USING (true);
CREATE POLICY "delivery_statuses_admin_write" ON public.delivery_statuses FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));

CREATE TABLE public.delivery_failure_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_failure_reasons TO anon, authenticated;
GRANT ALL ON public.delivery_failure_reasons TO service_role;
ALTER TABLE public.delivery_failure_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_reasons_read_all" ON public.delivery_failure_reasons FOR SELECT USING (true);
CREATE POLICY "delivery_reasons_admin_write" ON public.delivery_failure_reasons FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));

-- ============ PARTNERS ============
CREATE TABLE public.delivery_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text NOT NULL,
  type text NOT NULL DEFAULT 'in_house',
  phone text,
  email text,
  coverage_notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_partners_type_chk CHECK (type IN ('in_house','third_party'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_partners TO authenticated;
GRANT ALL ON public.delivery_partners TO service_role;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_partners_admin_all" ON public.delivery_partners FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));

-- ============ DELIVERIES ============
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_partner_id uuid REFERENCES public.delivery_partners(id),
  status_id uuid NOT NULL REFERENCES public.delivery_statuses(id),
  tracking_number text,
  scheduled_at timestamptz,
  delivered_at timestamptz,
  attempts_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deliveries_order_idx ON public.deliveries(order_id);
CREATE INDEX deliveries_status_idx ON public.deliveries(status_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries_owner_read" ON public.deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = deliveries.order_id AND o.buyer_id = auth.uid()));
CREATE POLICY "deliveries_admin_all" ON public.deliveries FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));

CREATE TABLE public.delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  result text NOT NULL,
  failure_reason_id uuid REFERENCES public.delivery_failure_reasons(id),
  note text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_attempts_result_chk CHECK (result IN ('delivered','failed'))
);
CREATE INDEX delivery_attempts_delivery_idx ON public.delivery_attempts(delivery_id);
GRANT SELECT, INSERT ON public.delivery_attempts TO authenticated;
GRANT ALL ON public.delivery_attempts TO service_role;
ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_attempts_owner_read" ON public.delivery_attempts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.deliveries d JOIN public.orders o ON o.id = d.order_id
     WHERE d.id = delivery_attempts.delivery_id AND o.buyer_id = auth.uid()));
CREATE POLICY "delivery_attempts_admin_all" ON public.delivery_attempts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'super_admin'::public.app_role));

-- updated_at triggers
CREATE TRIGGER trg_delivery_statuses_updated BEFORE UPDATE ON public.delivery_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_delivery_reasons_updated BEFORE UPDATE ON public.delivery_failure_reasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_delivery_partners_updated BEFORE UPDATE ON public.delivery_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED ============
INSERT INTO public.delivery_statuses (code, name_en, name_ar, sort_order, is_terminal) VALUES
  ('assigned','Assigned','مُعيَّنة',10,false),
  ('picked_up','Picked up','تم الاستلام',20,false),
  ('out_for_delivery','Out for delivery','خارج للتسليم',30,false),
  ('rescheduled','Rescheduled','إعادة جدولة',40,false),
  ('failed','Delivery failed','فشل التسليم',50,false),
  ('delivered','Delivered','تم التسليم',60,true),
  ('cancelled','Cancelled','ملغاة',70,true);

INSERT INTO public.delivery_failure_reasons (code, name_en, name_ar, sort_order) VALUES
  ('customer_unavailable','Customer unavailable','العميل غير متواجد',10),
  ('refused','Customer refused the order','العميل رفض الاستلام',20),
  ('wrong_address','Wrong or incomplete address','عنوان خاطئ أو غير مكتمل',30),
  ('phone_unreachable','Phone unreachable','الهاتف مغلق أو لا يرد',40),
  ('customer_reschedule','Customer asked to reschedule','العميل طلب تأجيل الموعد',50);

INSERT INTO public.delivery_partners (name_en, name_ar, type, phone, is_active, sort_order)
VALUES ('Share CoreMar Fleet','أسطول شير كورمار','in_house','+20 100 000 0000', true, 1);

-- ============ AUTO-CREATE DELIVERY ON CONFIRM ============
CREATE OR REPLACE FUNCTION public.ensure_delivery_for_confirmed_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner uuid;
  v_status uuid;
BEGIN
  IF NEW.status <> 'confirmed'::public.order_status THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.deliveries WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_status FROM public.delivery_statuses WHERE code = 'assigned';
  SELECT id INTO v_partner FROM public.delivery_partners
    WHERE type = 'in_house' AND is_active ORDER BY sort_order LIMIT 1;

  INSERT INTO public.deliveries (order_id, delivery_partner_id, status_id)
  VALUES (NEW.id, v_partner, v_status);

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_delivery_for_confirmed_order() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_delivery_for_confirmed_order() TO service_role;

CREATE TRIGGER trg_orders_ensure_delivery
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.ensure_delivery_for_confirmed_order();

-- backfill for already-confirmed-or-later orders
INSERT INTO public.deliveries (order_id, delivery_partner_id, status_id, delivered_at)
SELECT o.id,
       (SELECT id FROM public.delivery_partners WHERE type='in_house' AND is_active ORDER BY sort_order LIMIT 1),
       (SELECT id FROM public.delivery_statuses WHERE code = CASE
          WHEN o.status = 'shipped'::public.order_status THEN 'out_for_delivery'
          WHEN o.status = 'delivered'::public.order_status THEN 'delivered'
          ELSE 'assigned' END),
       CASE WHEN o.status = 'delivered'::public.order_status THEN o.updated_at ELSE NULL END
  FROM public.orders o
 WHERE o.status IN ('confirmed','processing','shipped','delivered')
   AND NOT EXISTS (SELECT 1 FROM public.deliveries d WHERE d.order_id = o.id);

-- ============ ATOMIC STATUS UPDATE RPC ============
CREATE OR REPLACE FUNCTION public.update_delivery_status(
  p_delivery_id uuid,
  p_new_status_code text,
  p_note text DEFAULT NULL,
  p_failure_reason_code text DEFAULT NULL,
  p_reschedule_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_delivery record;
  v_current_code text;
  v_new_status record;
  v_reason_id uuid;
  v_allowed text[];
  v_attempt integer;
BEGIN
  IF v_uid IS NULL OR NOT (private.has_role(v_uid,'admin'::public.app_role) OR private.has_role(v_uid,'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_delivery FROM public.deliveries WHERE id = p_delivery_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery % not found', p_delivery_id USING ERRCODE = 'P0002';
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
    -- order intentionally stays open for rescheduling
    INSERT INTO public.order_status_history(order_id, status, note, created_by)
    VALUES (v_delivery.order_id, 'shipped', 'Delivery attempt failed: ' || COALESCE(p_note, p_failure_reason_code), v_uid);
  ELSIF p_new_status_code = 'rescheduled' THEN
    INSERT INTO public.order_status_history(order_id, status, note, created_by)
    VALUES (v_delivery.order_id, 'shipped', 'Delivery rescheduled' || COALESCE(' for ' || p_reschedule_at::text, '') , v_uid);
  END IF;

  RETURN jsonb_build_object('ok', true, 'delivery_id', p_delivery_id, 'from', v_current_code, 'to', p_new_status_code);
END;
$$;
REVOKE ALL ON FUNCTION public.update_delivery_status(uuid, text, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_delivery_status(uuid, text, text, text, timestamptz) TO authenticated, service_role;
