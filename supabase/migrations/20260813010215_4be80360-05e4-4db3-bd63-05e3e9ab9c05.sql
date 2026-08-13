CREATE OR REPLACE FUNCTION public.place_order(p_address_id uuid, p_payment_method text, p_notes text DEFAULT NULL::text, p_transfer_reference text DEFAULT NULL::text, p_proof_media_id uuid DEFAULT NULL::uuid, p_proof_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_addr record;
  v_method public.payment_method;
  v_requires_proof boolean;
  v_order_id uuid;
  v_order_number text;
  v_status public.order_status;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_shipping numeric := 0;
  v_total numeric := 0;
  v_item record;
  v_price numeric;
  v_line numeric;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cod','instapay','wallet') THEN
    RAISE EXCEPTION 'Unsupported payment method' USING ERRCODE = 'P0001';
  END IF;
  v_method := p_payment_method::public.payment_method;
  v_requires_proof := p_payment_method IN ('instapay','wallet');

  IF NOT EXISTS (
    SELECT 1 FROM public.payment_methods
     WHERE code = p_payment_method AND is_enabled AND is_available_at_launch
  ) THEN
    RAISE EXCEPTION 'Payment method is not available' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_addr FROM public.addresses
   WHERE id = p_address_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery address not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_requires_proof AND (COALESCE(btrim(p_transfer_reference),'') = '' OR COALESCE(btrim(p_proof_url),'') = '') THEN
    RAISE EXCEPTION 'Transfer reference and proof of transfer are required' USING ERRCODE = 'P0001';
  END IF;

  -- Authoritative pricing from catalog
  CREATE TEMP TABLE IF NOT EXISTS _po_items (
    product_id uuid, product_name text, quantity integer,
    unit_price numeric, total_price numeric
  ) ON COMMIT DROP;
  -- safeupdate (supautils) is preloaded for the API role and rejects a bare
  -- DELETE; an explicit WHERE clause keeps the reset working.
  DELETE FROM _po_items WHERE true;

  FOR v_item IN
    SELECT ci.product_id, ci.quantity, p.name_en, p.is_active, p.stock,
           p.retail_price, p.offer_price, p.is_offer, COALESCE(p.tax_rate, 0) AS tax_rate
      FROM public.cart_items ci
      JOIN public.products p ON p.id = ci.product_id
     WHERE ci.user_id = v_uid AND ci.saved_for_later = false
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for product %', v_item.name_en USING ERRCODE = 'P0001';
    END IF;
    IF NOT COALESCE(v_item.is_active, false) THEN
      RAISE EXCEPTION 'Product % is no longer available', v_item.name_en USING ERRCODE = 'P0001';
    END IF;
    IF COALESCE(v_item.stock, 0) < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_item.name_en USING ERRCODE = 'P0001';
    END IF;

    v_price := CASE
      WHEN COALESCE(v_item.is_offer, false) AND COALESCE(v_item.offer_price, 0) > 0 THEN v_item.offer_price
      ELSE v_item.retail_price
    END;
    v_line := ROUND(v_price * v_item.quantity, 2);

    v_subtotal := v_subtotal + v_line;
    v_tax := v_tax + ROUND(v_line * v_item.tax_rate / 100.0, 2);
    v_count := v_count + 1;

    INSERT INTO _po_items VALUES (v_item.product_id, v_item.name_en, v_item.quantity, v_price, v_line);
  END LOOP;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Your cart is empty' USING ERRCODE = 'P0001';
  END IF;

  v_shipping := CASE WHEN v_subtotal > 2000 THEN 0 ELSE 50 END;
  v_total := ROUND(v_subtotal + v_tax + v_shipping, 2);
  v_status := CASE WHEN v_requires_proof THEN 'pending_payment_review' ELSE 'pending' END::public.order_status;
  v_order_number := 'SC-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 5));

  INSERT INTO public.orders (
    order_number, buyer_id, status, payment_method, payment_status,
    subtotal, tax, shipping, discount, total, currency,
    shipping_address, address_id, contact_phone, customer_email, notes
  ) VALUES (
    v_order_number, v_uid, v_status, v_method, 'pending'::public.payment_status,
    v_subtotal, v_tax, v_shipping, 0, v_total, 'EGP',
    to_jsonb(v_addr), p_address_id, v_addr.phone,
    (SELECT email FROM auth.users WHERE id = v_uid),
    NULLIF(btrim(COALESCE(p_notes,'')), '')
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
  SELECT v_order_id, product_id, product_name, quantity, unit_price, total_price FROM _po_items;

  INSERT INTO public.payments (
    order_id, method, amount, currency, status,
    transfer_reference, proof_media_id, proof_url, transferred_at
  ) VALUES (
    v_order_id, v_method, v_total, 'EGP', 'pending',
    CASE WHEN v_requires_proof THEN btrim(p_transfer_reference) ELSE NULL END,
    CASE WHEN v_requires_proof THEN p_proof_media_id ELSE NULL END,
    CASE WHEN v_requires_proof THEN p_proof_url ELSE NULL END,
    CASE WHEN v_requires_proof THEN now() ELSE NULL END
  );

  INSERT INTO public.order_status_history (order_id, status, note, created_by)
  VALUES (v_order_id, v_status::text,
          CASE WHEN v_requires_proof THEN 'Awaiting payment review' ELSE 'Order placed' END, v_uid);

  DELETE FROM public.cart_items WHERE user_id = v_uid AND saved_for_later = false;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'order_number', v_order_number, 'total', v_total);
END;
$function$;