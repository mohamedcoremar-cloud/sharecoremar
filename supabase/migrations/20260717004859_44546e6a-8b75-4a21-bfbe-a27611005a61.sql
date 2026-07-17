CREATE TABLE public.content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_versions_lookup
  ON public.content_versions (entity_type, entity_id, version_number DESC);
CREATE UNIQUE INDEX uq_content_versions_entity_version
  ON public.content_versions (entity_type, entity_id, version_number);

GRANT SELECT, INSERT ON public.content_versions TO authenticated;
GRANT ALL ON public.content_versions TO service_role;

ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read content versions"
  ON public.content_versions FOR SELECT
  TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE POLICY "Admins can insert content versions"
  ON public.content_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.record_content_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_type text := TG_ARGV[0];
  v_entity_id uuid;
  v_next integer;
  v_snapshot jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_entity_id := (to_jsonb(OLD) ->> 'id')::uuid;
    v_snapshot := to_jsonb(OLD);
  ELSE
    v_entity_id := (to_jsonb(NEW) ->> 'id')::uuid;
    v_snapshot := to_jsonb(NEW);
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next
    FROM public.content_versions
   WHERE entity_type = v_entity_type
     AND entity_id = v_entity_id;

  INSERT INTO public.content_versions (entity_type, entity_id, version_number, snapshot, created_by)
  VALUES (v_entity_type, v_entity_id, v_next, v_snapshot, auth.uid());

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pages_version
BEFORE INSERT OR UPDATE ON public.pages
FOR EACH ROW EXECUTE FUNCTION public.record_content_version('page');

CREATE TRIGGER trg_homepage_sections_version
BEFORE INSERT OR UPDATE ON public.homepage_sections
FOR EACH ROW EXECUTE FUNCTION public.record_content_version('homepage_section');

CREATE TRIGGER trg_theme_settings_version
BEFORE INSERT OR UPDATE ON public.theme_settings
FOR EACH ROW EXECUTE FUNCTION public.record_content_version('theme_settings');

CREATE TRIGGER trg_banners_version
BEFORE INSERT OR UPDATE ON public.banners
FOR EACH ROW EXECUTE FUNCTION public.record_content_version('banner');

CREATE OR REPLACE FUNCTION public.rollback_content_version(
  p_entity_type text,
  p_entity_id uuid,
  p_version_number integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb;
  v_sql text;
  v_table text;
  v_cols text;
BEGIN
  IF NOT (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to rollback content';
  END IF;

  SELECT snapshot INTO v_snapshot
    FROM public.content_versions
   WHERE entity_type = p_entity_type
     AND entity_id = p_entity_id
     AND version_number = p_version_number;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Version % not found for % %', p_version_number, p_entity_type, p_entity_id;
  END IF;

  v_table := CASE p_entity_type
    WHEN 'page' THEN 'pages'
    WHEN 'homepage_section' THEN 'homepage_sections'
    WHEN 'theme_settings' THEN 'theme_settings'
    WHEN 'banner' THEN 'banners'
    ELSE NULL
  END;

  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Unsupported entity_type %', p_entity_type;
  END IF;

  SELECT string_agg(format('%I = ($1->>%L)', key, key), ', ')
    INTO v_cols
    FROM jsonb_object_keys(v_snapshot) AS key
   WHERE key NOT IN ('id', 'created_at', 'updated_at');

  v_sql := format('UPDATE public.%I SET %s WHERE id = %L', v_table, v_cols, p_entity_id);
  EXECUTE v_sql USING v_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.rollback_content_version(text, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.rollback_content_version(text, uuid, integer) TO authenticated;