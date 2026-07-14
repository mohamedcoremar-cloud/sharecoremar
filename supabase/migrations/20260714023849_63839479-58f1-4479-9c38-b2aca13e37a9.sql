
INSERT INTO public.categories (name_en, name_ar, slug, sort_order, is_active, is_featured) VALUES
  ('Beverages','المشروبات','beverages',1,true,true),
  ('Food & Groceries','الأطعمة والبقالة','food-groceries',2,true,true),
  ('Dairy & Eggs','الألبان والبيض','dairy-eggs',3,true,true),
  ('Snacks & Confectionery','الوجبات الخفيفة والحلويات','snacks',4,true,true),
  ('Personal Care','العناية الشخصية','personal-care',5,true,true),
  ('Home Care','العناية بالمنزل','home-care',6,true,true),
  ('Baby Care','عناية الأطفال','baby-care',7,true,true),
  ('Health & Wellness','الصحة والعافية','health',8,true,true),
  ('Frozen Foods','الأطعمة المجمدة','frozen',9,true,true),
  ('Bakery','المخبوزات','bakery',10,true,true),
  ('Cooking Essentials','أساسيات الطبخ','cooking',11,true,true),
  ('Tobacco','التبغ','tobacco',12,true,false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.brands (name, slug, country, sort_order, is_active, is_featured) VALUES
  ('Juhayna','juhayna','Egypt',1,true,true),
  ('Domty','domty','Egypt',2,true,true),
  ('Edita','edita','Egypt',3,true,true),
  ('Lamar','lamar','Egypt',4,true,true),
  ('Chipsy','chipsy','Egypt',5,true,true),
  ('Corona','corona','Egypt',6,true,true),
  ('El Rashidi El Mizan','rashidi-mizan','Egypt',7,true,true),
  ('Bisco Misr','bisco-misr','Egypt',8,true,true),
  ('Al Ahram Beverages','al-ahram','Egypt',9,true,true),
  ('Nestlé','nestle','International',10,true,true),
  ('Unilever','unilever','International',11,true,true),
  ('P&G','pg','International',12,true,true)
ON CONFLICT (slug) DO NOTHING;
