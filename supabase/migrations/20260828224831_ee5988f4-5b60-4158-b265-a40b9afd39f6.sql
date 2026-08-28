ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS use_own_key boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fallback_to_lovable boolean NOT NULL DEFAULT true;