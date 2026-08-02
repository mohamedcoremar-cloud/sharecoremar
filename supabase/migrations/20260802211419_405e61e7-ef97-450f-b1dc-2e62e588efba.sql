-- Public (anon) reads must not evaluate the private admin helper, which anon
-- has no EXECUTE right on. Split each policy into an anon path and an
-- authenticated path that keeps the admin override.

DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
CREATE POLICY "Anon read active categories" ON public.categories FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Users read active categories" ON public.categories FOR SELECT TO authenticated USING (is_active = true OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read active brands" ON public.brands;
CREATE POLICY "Anon read active brands" ON public.brands FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Users read active brands" ON public.brands FOR SELECT TO authenticated USING (is_active = true OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Anon read active products" ON public.products FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Users read active products" ON public.products FOR SELECT TO authenticated USING (is_active = true OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read banners" ON public.banners;
CREATE POLICY "Anon read active banners" ON public.banners FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Users read active banners" ON public.banners FOR SELECT TO authenticated USING (is_active = true OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read homepage" ON public.homepage_sections;
CREATE POLICY "Anon read active homepage" ON public.homepage_sections FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Users read active homepage" ON public.homepage_sections FOR SELECT TO authenticated USING (is_active = true OR private.is_admin(auth.uid()));