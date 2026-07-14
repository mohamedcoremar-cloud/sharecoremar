
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'supplier', 'business_buyer', 'personal_buyer');
CREATE TYPE public.account_type AS ENUM ('supplier', 'business_buyer', 'personal_buyer');
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('cod', 'instapay', 'wallet');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  account_type public.account_type NOT NULL DEFAULT 'personal_buyer',
  avatar_url TEXT,
  language TEXT DEFAULT 'ar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'));
$$;

-- Profile policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ AUTO-CREATE PROFILE + BOOTSTRAP SUPER ADMIN ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- Bootstrap: sharecoremar@gmail.com becomes super_admin automatically
  IF LOWER(NEW.email) = 'sharecoremar@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ BRANDS ============
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active brands" ON public.brands FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage brands" ON public.brands FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SUPPLIERS ============
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  brand_name TEXT,
  owner_name TEXT,
  business_type TEXT,
  tax_number TEXT,
  commercial_registration TEXT,
  vat_number TEXT,
  description TEXT,
  address TEXT,
  governorate TEXT,
  city TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  logo_url TEXT,
  cover_url TEXT,
  status public.verification_status DEFAULT 'pending',
  is_featured BOOLEAN DEFAULT false,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved suppliers" ON public.suppliers FOR SELECT USING (status = 'approved' OR public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Suppliers insert own" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Suppliers update own" ON public.suppliers FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Admins delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT,
  barcode TEXT,
  description TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  retail_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(12,2),
  min_quantity INT DEFAULT 1,
  max_quantity INT,
  stock INT DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  weight NUMERIC(10,2),
  unit TEXT DEFAULT 'piece',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_offer BOOLEAN DEFAULT false,
  offer_price NUMERIC(12,2),
  tags TEXT[],
  rating NUMERIC(3,2) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_products_featured ON public.products(is_featured) WHERE is_featured = true;
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Suppliers manage own products" ON public.products FOR ALL TO authenticated
  USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()))
  WITH CHECK (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('SCM-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,8)),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method NOT NULL DEFAULT 'cod',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  shipping_address JSONB DEFAULT '{}'::jsonb,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own order items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE buyer_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ HOMEPAGE SECTIONS (CMS) ============
CREATE TABLE public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title_en TEXT,
  title_ar TEXT,
  subtitle_en TEXT,
  subtitle_ar TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT ALL ON public.homepage_sections TO service_role;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read homepage" ON public.homepage_sections FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage homepage" ON public.homepage_sections FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_homepage_updated BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ BANNERS ============
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT,
  title_ar TEXT,
  subtitle_en TEXT,
  subtitle_ar TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  position TEXT DEFAULT 'hero',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage banners" ON public.banners FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED CATEGORIES (Egyptian FMCG) ============
INSERT INTO public.categories (name_en, name_ar, slug, icon, sort_order, is_featured) VALUES
  ('Food', 'مواد غذائية', 'food', 'utensils', 1, true),
  ('Beverages', 'مشروبات', 'beverages', 'coffee', 2, true),
  ('Frozen Food', 'أطعمة مجمدة', 'frozen', 'snowflake', 3, true),
  ('Dairy', 'ألبان', 'dairy', 'milk', 4, true),
  ('Cleaning', 'منظفات', 'cleaning', 'sparkles', 5, true),
  ('Detergents', 'مطهرات', 'detergents', 'droplet', 6, true),
  ('Disposable Supplies', 'مستلزمات مرة واحدة', 'disposable', 'package', 7, true),
  ('Medical Supplies', 'مستلزمات طبية', 'medical', 'heart-pulse', 8, false),
  ('Restaurant Supplies', 'مستلزمات مطاعم', 'restaurant', 'chef-hat', 9, false),
  ('Hotel Supplies', 'مستلزمات فنادق', 'hotel', 'bed', 10, false),
  ('Packaging', 'تغليف', 'packaging', 'box', 11, false),
  ('Office Supplies', 'مستلزمات مكتبية', 'office', 'briefcase', 12, false),
  ('Retail Essentials', 'أساسيات التجزئة', 'retail', 'shopping-bag', 13, false);

-- ============ SEED BRANDS ============
INSERT INTO public.brands (name, slug, country, is_featured, sort_order) VALUES
  ('Juhayna', 'juhayna', 'Egypt', true, 1),
  ('Domty', 'domty', 'Egypt', true, 2),
  ('Edita', 'edita', 'Egypt', true, 3),
  ('El Rashidi El Mizan', 'rashidi-mizan', 'Egypt', true, 4),
  ('Corona', 'corona', 'Egypt', true, 5),
  ('Americana', 'americana', 'Egypt', true, 6),
  ('Lamar', 'lamar', 'Egypt', true, 7),
  ('Beyti', 'beyti', 'Egypt', true, 8);

-- ============ SEED HOMEPAGE ============
INSERT INTO public.homepage_sections (section_key, title_en, title_ar, subtitle_en, subtitle_ar, content, sort_order) VALUES
  ('hero', 'Everything your business needs', 'كل ما تحتاجه تجارتك', 'Trust. Professionalism. One place.', 'بثقة واحترافية في مكان واحد', '{"cta_en":"Start Shopping","cta_ar":"ابدأ التسوق","cta_link":"/products"}'::jsonb, 1),
  ('features', 'Why Share CoreMar', 'لماذا شير كورمار', null, null, '{"items":[{"icon":"truck","title_en":"Fast Delivery","title_ar":"توصيل سريع"},{"icon":"shield-check","title_en":"Verified Suppliers","title_ar":"موردون موثقون"},{"icon":"tag","title_en":"Best Prices","title_ar":"أفضل الأسعار"},{"icon":"headphones","title_en":"24/7 Support","title_ar":"دعم 24/7"}]}'::jsonb, 2),
  ('stats', 'Trusted by thousands', 'موثوق به من الآلاف', null, null, '{"items":[{"value":"10K+","label_en":"Products","label_ar":"منتج"},{"value":"500+","label_en":"Suppliers","label_ar":"مورد"},{"value":"50K+","label_en":"Buyers","label_ar":"مشتري"},{"value":"27","label_en":"Governorates","label_ar":"محافظة"}]}'::jsonb, 3);
