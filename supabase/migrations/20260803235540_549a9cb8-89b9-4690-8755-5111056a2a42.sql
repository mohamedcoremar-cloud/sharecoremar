CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  provider text NOT NULL DEFAULT 'lovable_ai_gateway',
  model text,
  system_prompt text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI agents admin manage" ON public.ai_agents
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TRIGGER trg_ai_agents_updated
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_agents (role_key, name_ar, name_en, is_active) VALUES
  ('merchandising_inventory', 'وكيل التشكيل والمخزون', 'Merchandising & Inventory Agent', false),
  ('market_intelligence', 'وكيل ذكاء السوق', 'Market Intelligence Agent', false),
  ('logistics_fulfillment', 'وكيل اللوجستيات والتنفيذ', 'Logistics & Fulfillment Agent', false),
  ('conversational_support', 'وكيل الدعم الحواري', 'Conversational Support Agent', false);