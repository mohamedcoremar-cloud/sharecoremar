-- Allow the admin draft creator to record manual entries
CREATE OR REPLACE FUNCTION public.admin_create_submission_draft(
  p_supplier_id uuid,
  p_proposed jsonb,
  p_source text DEFAULT 'admin',
  p_ai_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_ref text;
BEGIN
  IF v_uid IS NULL OR NOT private.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_source NOT IN ('admin','ai_bulk','manual') THEN
    RAISE EXCEPTION 'Unsupported source %', p_source USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = p_supplier_id) THEN
    RAISE EXCEPTION 'Supplier not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.catalog_submissions (
    supplier_id, kind, status_id, proposed, source, ai_note, submitted_by, created_by
  ) VALUES (
    p_supplier_id, 'new', private.submission_status_id('draft'),
    COALESCE(p_proposed, '{}'::jsonb), p_source, p_ai_note, v_uid, v_uid
  ) RETURNING id, reference_code INTO v_id, v_ref;

  RETURN jsonb_build_object('ok', true, 'submission_id', v_id, 'reference_code', v_ref);
END;
$$;

-- Supplier submits a brand-new product manually (no AI), for final admin approval
CREATE OR REPLACE FUNCTION public.submit_new_product(p_proposed jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sup uuid := private.supplier_id_for(auth.uid());
  v_id uuid;
  v_ref text;
BEGIN
  IF v_uid IS NULL OR v_sup IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_proposed IS NULL OR COALESCE(btrim(p_proposed->>'name_en'), '') = '' THEN
    RAISE EXCEPTION 'A product name is required' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE((p_proposed->>'retail_price')::numeric, 0) <= 0 THEN
    RAISE EXCEPTION 'A valid price is required' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.catalog_submissions (
    supplier_id, product_id, kind, status_id, proposed, source, submitted_by, created_by
  ) VALUES (
    v_sup, NULL, 'new', private.submission_status_id('pending_final_approval'),
    p_proposed, 'manual', v_uid, v_uid
  ) RETURNING id, reference_code INTO v_id, v_ref;

  RETURN jsonb_build_object('ok', true, 'submission_id', v_id, 'reference_code', v_ref);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_new_product(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_new_product(jsonb) TO authenticated;