
-- =========== CART ===========
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  saved_for_later BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_own" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== WISHLIST ===========
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist_own" ON public.wishlist_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========== ADDRESSES ===========
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  governorate TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  building TEXT,
  apartment TEXT,
  landmark TEXT,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses_own" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== ORDER STATUS HISTORY ===========
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "osh_admin_all" ON public.order_status_history FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE POLICY "osh_owner_read" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_status_history.order_id AND o.buyer_id = auth.uid()) AND is_internal = false);

-- =========== ORDERS additions ===========
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- =========== PAGES ===========
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  content_en TEXT,
  content_ar TEXT,
  meta_title_en TEXT,
  meta_title_ar TEXT,
  meta_description_en TEXT,
  meta_description_ar TEXT,
  og_image_url TEXT,
  is_indexable BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_public_read_published" ON public.pages FOR SELECT USING (is_published = true);
CREATE POLICY "pages_admin_all" ON public.pages FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE TRIGGER pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========== PAYMENT METHODS ===========
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT,
  description_en TEXT,
  description_ar TEXT,
  instructions_en TEXT,
  instructions_ar TEXT,
  icon_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_available_at_launch BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  fees_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  fees_fixed NUMERIC(10,2) NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
-- Public read only enabled ones, and only safe columns are queried by client (config kept private via view? we'll rely on client selecting safe cols; policies below)
CREATE POLICY "pm_public_enabled" ON public.payment_methods FOR SELECT USING (is_enabled = true);
CREATE POLICY "pm_admin_all" ON public.payment_methods FOR ALL TO authenticated
  USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));
CREATE TRIGGER payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed payment methods
INSERT INTO public.payment_methods (code, name_en, name_ar, description_en, description_ar, is_enabled, is_available_at_launch, sort_order) VALUES
  ('cod', 'Cash on Delivery', 'الدفع عند الاستلام', 'Pay in cash when the order arrives.', 'ادفع نقدًا عند وصول الطلب.', true, true, 1),
  ('wallet', 'Egyptian Wallet', 'المحفظة المصرية', 'Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay.', 'فودافون كاش، أورنج كاش، اتصالات كاش، وي باي.', true, true, 2),
  ('instapay', 'InstaPay', 'إنستا باي', 'Direct bank transfer via InstaPay.', 'تحويل بنكي مباشر عبر إنستا باي.', true, true, 3),
  ('paymob', 'Paymob', 'باي موب', 'Cards via Paymob gateway.', 'الدفع بالبطاقات عبر باي موب.', false, false, 4),
  ('fawry', 'Fawry', 'فوري', 'Pay at any Fawry outlet.', 'ادفع في أي منفذ فوري.', false, false, 5),
  ('stripe', 'Stripe', 'سترايب', 'International cards via Stripe.', 'البطاقات الدولية عبر سترايب.', false, false, 6),
  ('paypal', 'PayPal', 'باي بال', 'Pay with PayPal balance or card.', 'الدفع عبر باي بال.', false, false, 7),
  ('amazon_pay', 'Amazon Payment', 'أمازون للدفع', 'Pay with Amazon.', 'الدفع عبر أمازون.', false, false, 8),
  ('apple_pay', 'Apple Pay', 'آبل باي', 'Pay with Apple Pay.', 'الدفع عبر آبل باي.', false, false, 9),
  ('google_pay', 'Google Pay', 'جوجل باي', 'Pay with Google Pay.', 'الدفع عبر جوجل باي.', false, false, 10)
ON CONFLICT (code) DO NOTHING;

-- Seed default pages
INSERT INTO public.pages (slug, title_en, title_ar, content_en, content_ar, meta_title_en, meta_description_en, is_published, sort_order) VALUES
  ('about', 'About Us', 'من نحن',
   E'# About Share CoreMar\n\nShare CoreMar is a premium unified commerce marketplace connecting suppliers, businesses, and personal buyers across Egypt. It is one of the flagship business platforms owned and operated by **Share CoreGro** — a modern Egyptian company committed to innovation, trust, and long-term value creation.\n\n## Our Mission\nTo build the most reliable and accessible commerce ecosystem for FMCG merchants, suppliers, and buyers across Egypt — combining the depth of wholesale trade with the convenience of modern retail technology.\n\n## Our Vision\nTo empower every Egyptian business — from the smallest kiosk to the largest distributor — with the digital tools and supply access they need to grow with confidence.\n\n## What We Do\n- Curated FMCG catalog from verified suppliers\n- Wholesale and retail pricing in one place\n- Nationwide delivery across all governorates\n- Multi-language experience (Arabic & English)\n\n## Our Commitment\nWe stand behind every transaction with transparent pricing, verified partners, and dedicated customer support. Share CoreGro invests continuously in the platform to ensure it remains secure, fast, and easy to use.',
   E'# عن شير كورمار\n\nشير كورمار منصة تجارة موحدة متميزة تربط الموردين والشركات والمستهلكين في مصر. وهي إحدى المنصات الرئيسية المملوكة والمدارة من قبل **شير كورجرو** — شركة مصرية حديثة ملتزمة بالابتكار والثقة وخلق قيمة طويلة الأمد.\n\n## رسالتنا\nبناء أكثر منظومة تجارية موثوقة وسهلة الوصول للتجار والموردين والمشترين في مصر.\n\n## رؤيتنا\nتمكين كل شركة مصرية — من أصغر كشك حتى أكبر موزع — بالأدوات الرقمية والوصول إلى الإمدادات.\n\n## التزامنا\nنقف خلف كل معاملة بأسعار شفافة وشركاء موثوقين ودعم عملاء متخصص.',
   'About Us — Share CoreMar', 'Learn about Share CoreMar, a Share CoreGro platform serving Egypt''s FMCG market.', true, 1),
  ('contact', 'Contact Us', 'اتصل بنا',
   E'# Contact Us\n\nWe would love to hear from you.\n\n- **Email:** support@sharecoremar.com\n- **Phone:** +20 100 000 0000\n- **Address:** Cairo, Egypt\n\nOur support team responds within one business day.',
   E'# اتصل بنا\n\nنسعد بالتواصل معك.\n\n- **البريد:** support@sharecoremar.com\n- **الهاتف:** +20 100 000 0000\n- **العنوان:** القاهرة، مصر',
   'Contact — Share CoreMar', 'Contact Share CoreMar support team.', true, 2),
  ('privacy', 'Privacy Policy', 'سياسة الخصوصية',
   E'# Privacy Policy\n\nShare CoreMar respects your privacy. We collect only the information necessary to fulfill your orders, improve your experience, and comply with Egyptian law.\n\n## Data We Collect\nName, contact details, delivery address, order history, and technical usage data.\n\n## How We Use It\nProcessing orders, customer support, security, analytics, and lawful communication.\n\n## Your Rights\nYou may request access, correction, or deletion of your data at any time by contacting support.',
   E'# سياسة الخصوصية\n\nتحترم شير كورمار خصوصيتك.',
   'Privacy Policy — Share CoreMar', 'How Share CoreMar handles your personal data.', true, 3),
  ('terms', 'Terms & Conditions', 'الشروط والأحكام',
   E'# Terms & Conditions\n\nBy using Share CoreMar you agree to the following terms. Share CoreMar is operated by Share CoreGro and governed by the laws of the Arab Republic of Egypt.\n\n## Accounts\nYou are responsible for keeping your account credentials confidential.\n\n## Orders & Payments\nAll orders are subject to availability and confirmation of price.\n\n## Delivery\nDelivery times are estimates; actual times may vary by governorate.\n\n## Returns\nSee our Return Policy for details.',
   E'# الشروط والأحكام\n\nباستخدامك شير كورمار، فإنك توافق على هذه الشروط.',
   'Terms & Conditions — Share CoreMar', 'Terms of using the Share CoreMar platform.', true, 4),
  ('shipping', 'Shipping Policy', 'سياسة الشحن',
   E'# Shipping Policy\n\nWe deliver across all 27 governorates of Egypt.\n\n- **Greater Cairo:** 1–2 business days\n- **Delta & Alexandria:** 2–4 business days\n- **Upper Egypt & Border Governorates:** 3–6 business days\n\nShipping fees are calculated at checkout based on destination and weight.',
   E'# سياسة الشحن\n\nنشحن إلى جميع محافظات مصر الـ27.',
   'Shipping — Share CoreMar', 'Share CoreMar shipping and delivery information for Egypt.', true, 5),
  ('returns', 'Return Policy', 'سياسة الإرجاع',
   E'# Return Policy\n\nEligible items may be returned within 14 days of delivery in their original condition.\n\n## Non-returnable\nOpened food, personal care, and perishable goods.\n\n## Process\nContact support with your order number to initiate a return. Refunds are issued to the original payment method within 7 business days of receipt.',
   E'# سياسة الإرجاع\n\nيمكن إرجاع المنتجات المؤهلة خلال 14 يومًا.',
   'Returns — Share CoreMar', 'Share CoreMar return and refund policy.', true, 6)
ON CONFLICT (slug) DO NOTHING;
