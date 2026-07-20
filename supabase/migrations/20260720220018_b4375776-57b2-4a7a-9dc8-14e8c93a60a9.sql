
-- 1. Extend order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_payment_review' BEFORE 'confirmed';

-- 2. Payments table (source of truth)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','refunded','cancelled')),
  transfer_reference text,
  proof_media_id uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  proof_url text,
  transferred_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  gateway_reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()));

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid()));

CREATE POLICY "Users insert own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Atomic approve
CREATE OR REPLACE FUNCTION public.approve_order_payment(p_order_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_payment record;
  v_item record;
  v_new_stock integer;
BEGIN
  IF v_uid IS NULL OR NOT (private.has_role(v_uid, 'admin'::public.app_role) OR private.has_role(v_uid, 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Lock order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id USING ERRCODE = 'P0002';
  END IF;

  IF v_order.status <> 'pending_payment_review'::public.order_status THEN
    RAISE EXCEPTION 'Order is not awaiting payment review (current: %)', v_order.status USING ERRCODE = 'P0001';
  END IF;

  -- Locate latest pending payment row
  SELECT * INTO v_payment
  FROM public.payments
  WHERE order_id = p_order_id AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending payment record found for order %', p_order_id USING ERRCODE = 'P0001';
  END IF;

  -- Approve payment
  UPDATE public.payments
     SET status = 'approved',
         reviewed_by = v_uid,
         reviewed_at = now(),
         review_note = COALESCE(p_note, review_note),
         updated_at = now()
   WHERE id = v_payment.id;

  -- Confirm order (mirror to legacy payment_status for back-compat)
  UPDATE public.orders
     SET status = 'confirmed'::public.order_status,
         payment_status = 'paid'::public.payment_status,
         updated_at = now()
   WHERE id = p_order_id;

  -- Timeline
  INSERT INTO public.order_status_history(order_id, status, note, created_by)
  VALUES (p_order_id, 'confirmed', COALESCE(p_note, 'Payment approved'), v_uid);

  -- Decrement stock
  FOR v_item IN
    SELECT product_id, quantity FROM public.order_items
     WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    UPDATE public.products
       SET stock = GREATEST(COALESCE(stock,0) - v_item.quantity, 0),
           updated_at = now()
     WHERE id = v_item.product_id
    RETURNING stock INTO v_new_stock;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id, 'payment_id', v_payment.id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_order_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_order_payment(uuid, text) TO authenticated;

-- 4. Atomic reject
CREATE OR REPLACE FUNCTION public.reject_order_payment(p_order_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order record;
  v_payment record;
BEGIN
  IF v_uid IS NULL OR NOT (private.has_role(v_uid, 'admin'::public.app_role) OR private.has_role(v_uid, 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id USING ERRCODE = 'P0002';
  END IF;

  IF v_order.status <> 'pending_payment_review'::public.order_status THEN
    RAISE EXCEPTION 'Order is not awaiting payment review' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE order_id = p_order_id AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF FOUND THEN
    UPDATE public.payments
       SET status = 'rejected',
           reviewed_by = v_uid,
           reviewed_at = now(),
           review_note = p_reason,
           updated_at = now()
     WHERE id = v_payment.id;
  END IF;

  UPDATE public.orders
     SET status = 'pending'::public.order_status,
         payment_status = 'failed'::public.payment_status,
         updated_at = now()
   WHERE id = p_order_id;

  INSERT INTO public.order_status_history(order_id, status, note, created_by)
  VALUES (p_order_id, 'pending', 'Payment rejected: ' || COALESCE(p_reason, ''), v_uid);

  RETURN jsonb_build_object('ok', true, 'order_id', p_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_order_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_order_payment(uuid, text) TO authenticated;
