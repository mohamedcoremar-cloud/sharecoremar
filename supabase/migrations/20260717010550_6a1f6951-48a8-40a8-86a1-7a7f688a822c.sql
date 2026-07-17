
-- Carts table (guest + customer)
CREATE TABLE public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text,
  status text NOT NULL CHECK (status IN ('active','converted','abandoned')) DEFAULT 'active',
  currency char(3) NOT NULL DEFAULT 'EGP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT carts_owner_present CHECK (customer_id IS NOT NULL OR session_token IS NOT NULL)
);

CREATE INDEX carts_customer_id_idx ON public.carts(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX carts_session_token_idx ON public.carts(session_token) WHERE session_token IS NOT NULL;
CREATE UNIQUE INDEX carts_one_active_per_customer
  ON public.carts(customer_id) WHERE status = 'active' AND customer_id IS NOT NULL AND deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO anon;
GRANT ALL ON public.carts TO service_role;

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts_own_customer" ON public.carts
  FOR ALL TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "carts_admin_all" ON public.carts
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER carts_updated_at BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend existing cart_items (nullable additions; do not break current flow)
ALTER TABLE public.cart_items
  ADD COLUMN cart_id uuid REFERENCES public.carts(id) ON DELETE CASCADE,
  ADD COLUMN session_token text,
  ADD COLUMN unit_price_snapshot numeric(12,2);

ALTER TABLE public.cart_items ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX cart_items_cart_id_idx ON public.cart_items(cart_id) WHERE cart_id IS NOT NULL;
CREATE INDEX cart_items_session_token_idx ON public.cart_items(session_token) WHERE session_token IS NOT NULL;
CREATE UNIQUE INDEX cart_items_cart_product_unique ON public.cart_items(cart_id, product_id) WHERE cart_id IS NOT NULL;

-- Additional policies for guest access via cart_id / session_token
CREATE POLICY "cart_items_by_cart_owner" ON public.cart_items
  FOR ALL TO authenticated
  USING (
    cart_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    cart_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = auth.uid()
    )
  );

-- Merge guest cart into authenticated user's active cart
CREATE OR REPLACE FUNCTION public.merge_guest_cart_on_login(p_session_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_guest_cart_id uuid;
  v_user_cart_id uuid;
  r record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_session_token IS NULL OR length(p_session_token) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_guest_cart_id
    FROM public.carts
   WHERE session_token = p_session_token
     AND customer_id IS NULL
     AND status = 'active'
     AND deleted_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  SELECT id INTO v_user_cart_id
    FROM public.carts
   WHERE customer_id = v_user_id
     AND status = 'active'
     AND deleted_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_user_cart_id IS NULL THEN
    IF v_guest_cart_id IS NOT NULL THEN
      UPDATE public.carts
         SET customer_id = v_user_id, session_token = NULL
       WHERE id = v_guest_cart_id;
      RETURN v_guest_cart_id;
    ELSE
      INSERT INTO public.carts(customer_id, status)
      VALUES (v_user_id, 'active')
      RETURNING id INTO v_user_cart_id;
      RETURN v_user_cart_id;
    END IF;
  END IF;

  IF v_guest_cart_id IS NULL THEN
    RETURN v_user_cart_id;
  END IF;

  FOR r IN SELECT product_id, quantity, unit_price_snapshot
             FROM public.cart_items
            WHERE cart_id = v_guest_cart_id
  LOOP
    INSERT INTO public.cart_items(cart_id, product_id, quantity, unit_price_snapshot)
    VALUES (v_user_cart_id, r.product_id, r.quantity, r.unit_price_snapshot)
    ON CONFLICT (cart_id, product_id)
    DO UPDATE SET quantity = public.cart_items.quantity + EXCLUDED.quantity,
                  updated_at = now();
  END LOOP;

  UPDATE public.carts
     SET status = 'converted', session_token = NULL, updated_at = now()
   WHERE id = v_guest_cart_id;

  RETURN v_user_cart_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_guest_cart_on_login(text) TO authenticated;
