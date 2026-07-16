
CREATE TABLE public.theme_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  color_primary TEXT NOT NULL DEFAULT 'oklch(0.78 0.14 82)',
  color_primary_foreground TEXT NOT NULL DEFAULT 'oklch(0.15 0.01 260)',
  color_secondary TEXT NOT NULL DEFAULT 'oklch(0.97 0.005 260)',
  color_secondary_foreground TEXT NOT NULL DEFAULT 'oklch(0.19 0.01 260)',
  color_accent TEXT NOT NULL DEFAULT 'oklch(0.95 0.03 82)',
  color_accent_foreground TEXT NOT NULL DEFAULT 'oklch(0.19 0.01 260)',
  color_success TEXT NOT NULL DEFAULT 'oklch(0.7 0.17 145)',
  color_warning TEXT NOT NULL DEFAULT 'oklch(0.8 0.16 85)',
  color_error TEXT NOT NULL DEFAULT 'oklch(0.6 0.22 27)',
  color_background TEXT NOT NULL DEFAULT 'oklch(1 0 0)',
  color_surface TEXT NOT NULL DEFAULT 'oklch(1 0 0)',
  color_text TEXT NOT NULL DEFAULT 'oklch(0.19 0.01 260)',
  color_border TEXT NOT NULL DEFAULT 'oklch(0.93 0.008 260)',
  font_family TEXT NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
  logo_url TEXT,
  favicon_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT theme_settings_single_row CHECK (id = 'default')
);

GRANT SELECT ON public.theme_settings TO anon, authenticated;
GRANT ALL ON public.theme_settings TO service_role;

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme_settings public read" ON public.theme_settings
  FOR SELECT USING (true);

CREATE POLICY "theme_settings admin write" ON public.theme_settings
  FOR ALL TO authenticated
  USING (private.is_admin(auth.uid()))
  WITH CHECK (private.is_admin(auth.uid()));

CREATE TRIGGER update_theme_settings_updated_at
  BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.theme_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;
