CREATE TABLE public.review_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

GRANT SELECT ON public.review_statuses TO anon, authenticated;
GRANT ALL ON public.review_statuses TO service_role;
ALTER TABLE public.review_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review statuses are readable by everyone"
  ON public.review_statuses FOR SELECT USING (true);
CREATE POLICY "Admins manage review statuses"
  ON public.review_statuses FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

INSERT INTO public.review_statuses (code, label_ar, label_en) VALUES
  ('pending', 'قيد المراجعة', 'Pending'),
  ('approved', 'معتمد', 'Approved'),
  ('rejected', 'مرفوض', 'Rejected');

CREATE TRIGGER trg_review_statuses_updated BEFORE UPDATE ON public.review_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  status_id uuid NOT NULL REFERENCES public.review_statuses(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (product_id, customer_id, order_id)
);

CREATE INDEX idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_customer ON public.product_reviews(customer_id);

GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved reviews are public"
  ON public.product_reviews FOR SELECT
  USING (
    deleted_at IS NULL
    AND status_id = (SELECT id FROM public.review_statuses WHERE code = 'approved')
  );

CREATE POLICY "Customers read own reviews"
  ON public.product_reviews FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Admins read all reviews"
  ON public.product_reviews FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));

CREATE POLICY "Customers create own reviews"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins moderate reviews"
  ON public.product_reviews FOR UPDATE TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

CREATE TRIGGER trg_product_reviews_updated BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Verified-purchase enforcement + forced pending status (server-side, no exceptions)
CREATE OR REPLACE FUNCTION public.enforce_verified_purchase_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending uuid;
BEGIN
  IF NEW.customer_id IS DISTINCT FROM auth.uid() AND NOT private.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'You can only review as yourself' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
     WHERE o.id = NEW.order_id
       AND o.buyer_id = NEW.customer_id
       AND o.status = 'delivered'::public.order_status
       AND oi.product_id = NEW.product_id
  ) THEN
    RAISE EXCEPTION 'Reviews are only allowed for products you received in a delivered order' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_pending FROM public.review_statuses WHERE code = 'pending';
  NEW.status_id := v_pending;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_verified_purchase_review() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_verified_purchase_review() TO service_role;

CREATE TRIGGER trg_product_reviews_verify BEFORE INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_verified_purchase_review();

-- Recalculate product rating from APPROVED reviews only
CREATE OR REPLACE FUNCTION public.recalc_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product uuid := COALESCE(NEW.product_id, OLD.product_id);
  v_avg numeric;
  v_count integer;
BEGIN
  SELECT ROUND(AVG(pr.rating)::numeric, 2), COUNT(*)
    INTO v_avg, v_count
    FROM public.product_reviews pr
    JOIN public.review_statuses rs ON rs.id = pr.status_id
   WHERE pr.product_id = v_product
     AND pr.deleted_at IS NULL
     AND rs.code = 'approved';

  UPDATE public.products
     SET rating = COALESCE(v_avg, 0),
         reviews_count = COALESCE(v_count, 0),
         updated_at = now()
   WHERE id = v_product;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.recalc_product_rating() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_product_rating() TO service_role;

CREATE TRIGGER trg_product_reviews_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalc_product_rating();

-- Admin moderation RPC
CREATE OR REPLACE FUNCTION public.set_review_status(p_review_id uuid, p_status_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status uuid;
BEGIN
  IF v_uid IS NULL OR NOT (private.has_role(v_uid, 'admin'::public.app_role) OR private.has_role(v_uid, 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_status FROM public.review_statuses WHERE code = p_status_code AND is_active;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Unknown review status %', p_status_code USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.product_reviews
     SET status_id = v_status, updated_by = v_uid, updated_at = now()
   WHERE id = p_review_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review % not found', p_review_id USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('ok', true, 'review_id', p_review_id, 'status', p_status_code);
END;
$$;

REVOKE ALL ON FUNCTION public.set_review_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_review_status(uuid, text) TO authenticated, service_role;

-- Admin listing view helper (reviews with product + customer names) is not needed;
-- admin UI joins products and profiles directly.
