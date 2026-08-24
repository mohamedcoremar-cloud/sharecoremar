CREATE TABLE public.catalog_submission_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label_en text NOT NULL,
  label_ar text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.catalog_submission_statuses TO authenticated;
GRANT ALL ON public.catalog_submission_statuses TO service_role;
ALTER TABLE public.catalog_submission_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read submission statuses"
  ON public.catalog_submission_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage submission statuses"
  ON public.catalog_submission_statuses FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE TRIGGER trg_catalog_submission_statuses_updated
  BEFORE UPDATE ON public.catalog_submission_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.catalog_submission_statuses (code, label_en, label_ar, sort_order, is_terminal) VALUES
  ('draft', 'Draft', 'مسودة', 10, false),
  ('admin_review', 'Admin review', 'مراجعة الإدارة', 20, false),
  ('sent_to_supplier', 'Sent to supplier', 'مُرسل للمورد', 30, false),
  ('supplier_approved', 'Supplier approved', 'موافقة المورد', 40, false),
  ('pending_final_approval', 'Pending final approval', 'بانتظار الموافقة النهائية', 50, false),
  ('published', 'Published', 'تم النشر', 60, true),
  ('rejected', 'Rejected', 'مرفوض', 70, true);

CREATE TABLE public.catalog_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'new',
  status_id uuid NOT NULL REFERENCES public.catalog_submission_statuses(id),
  proposed jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  source text NOT NULL DEFAULT 'supplier',
  ai_note text,
  submitted_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  CONSTRAINT catalog_submissions_kind_check CHECK (kind IN ('new', 'edit')),
  CONSTRAINT catalog_submissions_source_check CHECK (source IN ('supplier', 'admin', 'ai_bulk'))
);
CREATE INDEX idx_catalog_submissions_supplier ON public.catalog_submissions(supplier_id);
CREATE INDEX idx_catalog_submissions_status ON public.catalog_submissions(status_id);

GRANT SELECT ON public.catalog_submissions TO authenticated;
GRANT ALL ON public.catalog_submissions TO service_role;
ALTER TABLE public.catalog_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers read own submissions"
  ON public.catalog_submissions FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND supplier_id = private.supplier_id_for(auth.uid()));
CREATE POLICY "Admins read all submissions"
  ON public.catalog_submissions FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));
CREATE POLICY "Admins manage submissions"
  ON public.catalog_submissions FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

CREATE TRIGGER trg_catalog_submissions_updated
  BEFORE UPDATE ON public.catalog_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_catalog_submission_ref()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    LOOP
      NEW.reference_code := 'CS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.catalog_submissions WHERE reference_code = NEW.reference_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_catalog_submissions_ref
  BEFORE INSERT ON public.catalog_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_catalog_submission_ref();

-- Helper: status id by code
CREATE OR REPLACE FUNCTION private.submission_status_id(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.catalog_submission_statuses WHERE code = p_code
$$;

CREATE OR REPLACE FUNCTION private.submission_status_code(p_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT code FROM public.catalog_submission_statuses WHERE id = p_id
$$;

REVOKE ALL ON FUNCTION private.submission_status_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.submission_status_code(uuid) FROM PUBLIC;

-- Supplier proposes an edit to their own product
CREATE OR REPLACE FUNCTION public.submit_product_edit(p_product_id uuid, p_proposed jsonb)
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
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND supplier_id = v_sup) THEN
    RAISE EXCEPTION 'You can only propose edits to your own products' USING ERRCODE = '42501';
  END IF;
  IF p_proposed IS NULL OR p_proposed = '{}'::jsonb THEN
    RAISE EXCEPTION 'No changes were proposed' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.catalog_submissions cs
     WHERE cs.product_id = p_product_id
       AND cs.deleted_at IS NULL
       AND private.submission_status_code(cs.status_id) NOT IN ('published','rejected')
  ) THEN
    RAISE EXCEPTION 'There is already an open submission for this product' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.catalog_submissions (
    supplier_id, product_id, kind, status_id, proposed, source, submitted_by, created_by
  ) VALUES (
    v_sup, p_product_id, 'edit', private.submission_status_id('pending_final_approval'),
    p_proposed, 'supplier', v_uid, v_uid
  ) RETURNING id, reference_code INTO v_id, v_ref;

  RETURN jsonb_build_object('ok', true, 'submission_id', v_id, 'reference_code', v_ref);
END;
$$;

-- Supplier responds to a draft sent to them
CREATE OR REPLACE FUNCTION public.supplier_respond_submission(p_submission_id uuid, p_action text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sup uuid := private.supplier_id_for(auth.uid());
  v_row record;
  v_code text;
BEGIN
  IF v_uid IS NULL OR v_sup IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.catalog_submissions
   WHERE id = p_submission_id AND supplier_id = v_sup AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found' USING ERRCODE = 'P0002';
  END IF;
  v_code := private.submission_status_code(v_row.status_id);
  IF v_code <> 'sent_to_supplier' THEN
    RAISE EXCEPTION 'This submission is not awaiting your response' USING ERRCODE = 'P0001';
  END IF;
  IF p_action = 'approve' THEN
    UPDATE public.catalog_submissions
       SET status_id = private.submission_status_id('pending_final_approval'),
           reason = NULL, updated_by = v_uid, updated_at = now()
     WHERE id = p_submission_id;
  ELSIF p_action = 'changes' THEN
    IF COALESCE(btrim(p_note), '') = '' THEN
      RAISE EXCEPTION 'Please describe the changes you need' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.catalog_submissions
       SET status_id = private.submission_status_id('admin_review'),
           reason = btrim(p_note), updated_by = v_uid, updated_at = now()
     WHERE id = p_submission_id;
  ELSE
    RAISE EXCEPTION 'Unsupported action %', p_action USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('ok', true, 'submission_id', p_submission_id, 'action', p_action);
END;
$$;

-- Admin advances / rejects / publishes
CREATE OR REPLACE FUNCTION public.admin_set_submission_status(
  p_submission_id uuid,
  p_status_code text,
  p_reason text DEFAULT NULL,
  p_proposed jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row record;
  v_cur text;
  v_allowed text[];
  v_prop jsonb;
  v_product uuid;
  v_slug text;
  v_name_en text;
BEGIN
  IF v_uid IS NULL OR NOT private.is_admin(v_uid) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.catalog_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_proposed IS NOT NULL THEN
    UPDATE public.catalog_submissions
       SET proposed = p_proposed, updated_by = v_uid, updated_at = now()
     WHERE id = p_submission_id;
    v_row.proposed := p_proposed;
  END IF;

  v_cur := private.submission_status_code(v_row.status_id);
  v_allowed := CASE v_cur
    WHEN 'draft' THEN ARRAY['admin_review','rejected']
    WHEN 'admin_review' THEN ARRAY['sent_to_supplier','pending_final_approval','rejected']
    WHEN 'sent_to_supplier' THEN ARRAY['admin_review','rejected']
    WHEN 'supplier_approved' THEN ARRAY['pending_final_approval','rejected']
    WHEN 'pending_final_approval' THEN ARRAY['published','rejected','admin_review']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_status_code = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_cur, p_status_code USING ERRCODE = 'P0001';
  END IF;

  IF p_status_code = 'rejected' AND COALESCE(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = 'P0001';
  END IF;

  IF p_status_code = 'published' THEN
    v_prop := COALESCE(v_row.proposed, '{}'::jsonb);
    v_name_en := COALESCE(NULLIF(btrim(v_prop->>'name_en'), ''), NULL);

    IF v_row.product_id IS NOT NULL THEN
      UPDATE public.products p SET
        name_en       = COALESCE(v_name_en, p.name_en),
        name_ar       = COALESCE(NULLIF(btrim(v_prop->>'name_ar'), ''), p.name_ar),
        description   = COALESCE(v_prop->>'description', p.description),
        retail_price  = COALESCE((v_prop->>'retail_price')::numeric, p.retail_price),
        offer_price   = CASE WHEN v_prop ? 'offer_price' THEN NULLIF(v_prop->>'offer_price','')::numeric ELSE p.offer_price END,
        is_offer      = COALESCE((v_prop->>'is_offer')::boolean, p.is_offer),
        category_id   = COALESCE(NULLIF(v_prop->>'category_id','')::uuid, p.category_id),
        unit          = COALESCE(NULLIF(btrim(v_prop->>'unit'), ''), p.unit),
        stock         = COALESCE((v_prop->>'stock')::integer, p.stock),
        images        = CASE WHEN v_prop ? 'images' THEN v_prop->'images' ELSE p.images END,
        updated_at    = now()
      WHERE p.id = v_row.product_id
      RETURNING p.id INTO v_product;
    ELSE
      IF v_name_en IS NULL THEN
        RAISE EXCEPTION 'A product name is required before publishing' USING ERRCODE = 'P0001';
      END IF;
      v_slug := regexp_replace(lower(v_name_en), '[^a-z0-9]+', '-', 'g');
      v_slug := btrim(v_slug, '-') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);

      INSERT INTO public.products (
        supplier_id, category_id, name_en, name_ar, slug, description,
        retail_price, offer_price, is_offer, unit, stock, images, is_active
      ) VALUES (
        v_row.supplier_id,
        NULLIF(v_prop->>'category_id','')::uuid,
        v_name_en,
        COALESCE(NULLIF(btrim(v_prop->>'name_ar'), ''), v_name_en),
        v_slug,
        v_prop->>'description',
        COALESCE((v_prop->>'retail_price')::numeric, 0),
        NULLIF(v_prop->>'offer_price','')::numeric,
        COALESCE((v_prop->>'is_offer')::boolean, false),
        NULLIF(btrim(v_prop->>'unit'), ''),
        COALESCE((v_prop->>'stock')::integer, 0),
        COALESCE(v_prop->'images', '[]'::jsonb),
        true
      ) RETURNING id INTO v_product;

      UPDATE public.catalog_submissions SET product_id = v_product WHERE id = p_submission_id;
    END IF;
  END IF;

  UPDATE public.catalog_submissions
     SET status_id = private.submission_status_id(p_status_code),
         reason = CASE WHEN p_status_code = 'rejected' THEN btrim(p_reason) ELSE COALESCE(btrim(p_reason), reason) END,
         reviewed_by = v_uid,
         reviewed_at = now(),
         published_at = CASE WHEN p_status_code = 'published' THEN now() ELSE published_at END,
         updated_by = v_uid,
         updated_at = now()
   WHERE id = p_submission_id;

  RETURN jsonb_build_object('ok', true, 'submission_id', p_submission_id, 'from', v_cur, 'to', p_status_code, 'product_id', v_product);
END;
$$;

-- Admin creates a draft (used by the AI bulk intake path in a later step)
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
  IF p_source NOT IN ('admin','ai_bulk') THEN
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

REVOKE ALL ON FUNCTION public.submit_product_edit(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.supplier_respond_submission(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_submission_status(uuid, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_submission_draft(uuid, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_product_edit(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_respond_submission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_submission_status(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_submission_draft(uuid, jsonb, text, text) TO authenticated;