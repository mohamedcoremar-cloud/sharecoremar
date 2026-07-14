
-- Storage policies for 'media' bucket
CREATE POLICY "Media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Media admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_admin(auth.uid()));
CREATE POLICY "Media admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.is_admin(auth.uid()));
CREATE POLICY "Media admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_admin(auth.uid()));

-- Media library table
CREATE TABLE public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  width INT,
  height INT,
  alt_en TEXT,
  alt_ar TEXT,
  folder TEXT DEFAULT 'general',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.media_library TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media library public read" ON public.media_library FOR SELECT USING (true);
CREATE POLICY "Media library admin insert" ON public.media_library FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Media library admin update" ON public.media_library FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Media library admin delete" ON public.media_library FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_media_library_updated_at BEFORE UPDATE ON public.media_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Site settings for global CMS config (branding, contact, social, footer, etc.)
CREATE TABLE public.site_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Site settings admin write" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.site_settings (key, value) VALUES
  ('branding', '{"name_en":"Share CoreMar","name_ar":"شير كورمار","tagline_en":"Smart Market. Core Solutions.","tagline_ar":"سوق ذكي. حلول جوهرية.","email":"info@sharecoremar.com","phone":"+20 000 000 0000","address_en":"Cairo, Egypt","address_ar":"القاهرة، مصر"}'::jsonb),
  ('social', '{"facebook":"","instagram":"","twitter":"","linkedin":"","youtube":"","whatsapp":""}'::jsonb),
  ('footer', '{"copyright_en":"© 2026 Share CoreMar. All rights reserved.","copyright_ar":"© 2026 شير كورمار. جميع الحقوق محفوظة."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed homepage_sections with full FMCG content if missing keys
INSERT INTO public.homepage_sections (section_key, title_en, title_ar, subtitle_en, subtitle_ar, content, sort_order, is_active)
VALUES
  ('hero', 'Everything your FMCG business needs', 'كل ما يحتاجه نشاطك في السلع الاستهلاكية', 'in one trusted place.', 'في مكان واحد موثوق.',
    '{"cta_primary_en":"Start Shopping","cta_primary_ar":"ابدأ التسوق","cta_secondary_en":"Become a Supplier","cta_secondary_ar":"كن موردًا","badge_en":"Egypt''s Premium Unified FMCG Marketplace","badge_ar":"سوق مصر الرائد للسلع الاستهلاكية"}'::jsonb, 1, true),
  ('features', 'Why Share CoreMar', 'لماذا شير كورمار', null, null,
    '{"items":[{"icon":"truck","title_en":"Fast Delivery","title_ar":"توصيل سريع"},{"icon":"shield-check","title_en":"Verified Suppliers","title_ar":"موردون موثقون"},{"icon":"tag","title_en":"Best Wholesale Prices","title_ar":"أفضل أسعار الجملة"},{"icon":"headphones","title_en":"24/7 Support","title_ar":"دعم على مدار الساعة"}]}'::jsonb, 2, true),
  ('stats', 'Trusted by thousands', 'ثقة الآلاف', null, null,
    '{"items":[{"value":"500+","label_en":"Suppliers","label_ar":"موردون"},{"value":"25K+","label_en":"Products","label_ar":"منتجات"},{"value":"100K+","label_en":"Orders","label_ar":"طلبات"},{"value":"4.9★","label_en":"Rating","label_ar":"تقييم"}]}'::jsonb, 3, true),
  ('cta_supplier', 'Grow your FMCG business with us', 'نمِّ نشاطك معنا', 'Join hundreds of Egyptian suppliers reaching thousands of buyers.', 'انضم لمئات الموردين المصريين وصولاً لآلاف المشترين.',
    '{"cta_en":"Become a Supplier","cta_ar":"كن موردًا"}'::jsonb, 4, true)
ON CONFLICT (section_key) DO NOTHING;
