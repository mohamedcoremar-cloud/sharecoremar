import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

type Dict = Record<string, { en: string; ar: string }>;

const DICT: Dict = {
  // Nav
  "nav.products": { en: "Products", ar: "المنتجات" },
  "nav.categories": { en: "Categories", ar: "الفئات" },
  "nav.brands": { en: "Brands", ar: "العلامات" },
  "nav.suppliers": { en: "Suppliers", ar: "الموردون" },
  "nav.become_supplier": { en: "Become Supplier", ar: "كن موردًا" },
  "nav.search_placeholder": { en: "Search products, brands, suppliers...", ar: "ابحث عن المنتجات والعلامات والموردين..." },
  "nav.signin": { en: "Sign in", ar: "تسجيل الدخول" },
  "nav.account": { en: "Account", ar: "الحساب" },
  "nav.orders": { en: "My Orders", ar: "طلباتي" },
  "nav.admin": { en: "Admin Dashboard", ar: "لوحة التحكم" },
  "nav.signout": { en: "Sign out", ar: "تسجيل الخروج" },
  // Footer
  "footer.marketplace": { en: "Marketplace", ar: "السوق" },
  "footer.business": { en: "Business", ar: "الأعمال" },
  "footer.support": { en: "Support", ar: "الدعم" },
  "footer.all_products": { en: "All Products", ar: "كل المنتجات" },
  "footer.wholesale": { en: "Wholesale", ar: "الجملة" },
  "footer.retail": { en: "Retail", ar: "التجزئة" },
  "footer.contact": { en: "Contact", ar: "اتصل بنا" },
  "footer.help": { en: "Help Center", ar: "مركز المساعدة" },
  "footer.terms": { en: "Terms & Privacy", ar: "الشروط والخصوصية" },
  // Admin
  "admin.dashboard": { en: "Dashboard", ar: "لوحة التحكم" },
  "admin.products": { en: "Products", ar: "المنتجات" },
  "admin.categories": { en: "Categories", ar: "الفئات" },
  "admin.brands": { en: "Brands", ar: "العلامات" },
  "admin.suppliers": { en: "Suppliers", ar: "الموردون" },
  "admin.orders": { en: "Orders", ar: "الطلبات" },
  "admin.users": { en: "Users", ar: "المستخدمون" },
  "admin.homepage": { en: "Homepage CMS", ar: "الصفحة الرئيسية" },
  "admin.banners": { en: "Banners", ar: "البانرات" },
  "admin.media": { en: "Media Library", ar: "مكتبة الوسائط" },
  "admin.settings": { en: "Settings", ar: "الإعدادات" },
  "admin.back_to_site": { en: "Back to site", ar: "العودة للموقع" },
  // CRUD
  "crud.new": { en: "New", ar: "جديد" },
  "crud.search": { en: "Search...", ar: "بحث..." },
  "crud.edit": { en: "Edit", ar: "تعديل" },
  "crud.delete": { en: "Delete", ar: "حذف" },
  "crud.duplicate": { en: "Duplicate", ar: "تكرار" },
  "crud.save": { en: "Save", ar: "حفظ" },
  "crud.cancel": { en: "Cancel", ar: "إلغاء" },
  "crud.saving": { en: "Saving...", ar: "جاري الحفظ..." },
  "crud.loading": { en: "Loading…", ar: "جاري التحميل…" },
  "crud.no_records": { en: "No records yet", ar: "لا توجد بيانات بعد" },
  "crud.bulk_delete": { en: "Delete selected", ar: "حذف المحدد" },
  "crud.bulk_enable": { en: "Enable selected", ar: "تفعيل المحدد" },
  "crud.bulk_disable": { en: "Disable selected", ar: "تعطيل المحدد" },
  "crud.selected": { en: "selected", ar: "محدد" },
  "crud.filter_all": { en: "All", ar: "الكل" },
  "crud.filter_active": { en: "Active", ar: "مفعّل" },
  "crud.filter_inactive": { en: "Inactive", ar: "معطّل" },
  // Home
  "home.shop_by_category": { en: "Shop by Category", ar: "تسوق حسب الفئة" },
  "home.explore": { en: "Explore thousands of FMCG products", ar: "استكشف آلاف المنتجات الاستهلاكية" },
  "home.view_all": { en: "View all →", ar: "عرض الكل ←" },
  "home.featured_products": { en: "Featured Products", ar: "منتجات مميزة" },
  "home.trusted_brands": { en: "Trusted Brands", ar: "علامات موثوقة" },
  "home.no_products": { en: "Products will appear here once suppliers upload their catalog.", ar: "ستظهر المنتجات هنا فور رفع الموردين لقوائمهم." },
  "home.offers": { en: "Weekly Offers", ar: "عروض الأسبوع" },
  "home.offers_sub": { en: "Limited-time prices on selected FMCG lines", ar: "أسعار لفترة محدودة على منتجات مختارة" },
  "home.new_arrivals": { en: "New Arrivals", ar: "وصل حديثًا" },
  "home.new_arrivals_sub": { en: "The latest additions to our catalog", ar: "أحدث الإضافات إلى الكتالوج" },
  "home.best_sellers": { en: "Best Sellers", ar: "الأكثر مبيعًا" },
  "home.best_sellers_sub": { en: "Most requested products by our buyers", ar: "المنتجات الأكثر طلبًا من عملائنا" },
  "home.why": { en: "Why buy from Share CoreMar?", ar: "لماذا تشتري من شير كورمار؟" },
  "home.why_sub": { en: "One marketplace for wholesale and retail, built for the Egyptian market", ar: "سوق واحد للجملة والتجزئة، مصمم للسوق المصري" },
  "home.why_suppliers": { en: "Verified suppliers", ar: "موردون موثوقون" },
  "home.why_suppliers_d": { en: "Every supplier is reviewed and approved before listing a single product.", ar: "يتم مراجعة واعتماد كل مورد قبل إضافة أي منتج." },
  "home.why_delivery": { en: "Tracked delivery", ar: "توصيل متابَع" },
  "home.why_delivery_d": { en: "Follow every shipment status from confirmation to your door.", ar: "تابع حالة كل شحنة من التأكيد حتى باب منزلك." },
  "home.why_payments": { en: "Secure payments", ar: "مدفوعات آمنة" },
  "home.why_payments_d": { en: "Cash on delivery, wallet and InstaPay — each transfer reviewed before confirmation.", ar: "الدفع عند الاستلام والمحفظة وإنستاباي — مع مراجعة كل تحويل قبل التأكيد." },
  "home.why_pricing": { en: "Wholesale & retail pricing", ar: "أسعار جملة وتجزئة" },
  "home.why_pricing_d": { en: "Clear retail prices with wholesale tiers for business buyers.", ar: "أسعار تجزئة واضحة مع أسعار جملة لعملاء الأعمال." },
  "home.promo_wholesale_t": { en: "Buying for your business?", ar: "تشتري لعملك؟" },
  "home.promo_wholesale_d": { en: "Unlock wholesale tiers, bulk quantities and supplier-direct pricing.", ar: "احصل على أسعار الجملة والكميات الكبيرة والتعامل المباشر مع الموردين." },
  "home.promo_wholesale_cta": { en: "Explore wholesale", ar: "استكشف الجملة" },
  "home.promo_delivery_t": { en: "Delivered across Egypt", ar: "توصيل في كل مصر" },
  "home.promo_delivery_d": { en: "In-house delivery with live status on every order.", ar: "توصيل داخلي مع تتبع حالة كل طلب." },
  "home.promo_delivery_cta": { en: "Start shopping", ar: "ابدأ التسوق" },
  "home.suppliers_title": { en: "Trusted Suppliers", ar: "موردون موثوقون" },
  "home.suppliers_sub": { en: "Approved Egyptian suppliers listing on Share CoreMar", ar: "موردون مصريون معتمدون على شير كورمار" },
  // Product
  "product.add_to_cart": { en: "Add to cart", ar: "أضف إلى السلة" },
  "product.wishlist": { en: "Add to wishlist", ar: "أضف إلى المفضلة" },
  "product.in_stock": { en: "In stock", ar: "متوفر" },
  "product.low_stock": { en: "Low stock", ar: "الكمية محدودة" },
  "product.out_of_stock": { en: "Out of stock", ar: "غير متوفر" },
  "product.wholesale_from": { en: "Wholesale from", ar: "الجملة من" },
  "product.min_qty": { en: "min", ar: "أقل كمية" },
  // Wishlist
  "wishlist.title": { en: "My Wishlist", ar: "قائمة المفضلة" },
  "wishlist.saved_one": { en: "1 saved product", ar: "منتج محفوظ واحد" },
  "wishlist.saved_many": { en: "saved products", ar: "منتجات محفوظة" },
  "wishlist.empty": { en: "Your wishlist is empty.", ar: "قائمة المفضلة فارغة." },
  "wishlist.browse": { en: "Browse products", ar: "تصفح المنتجات" },
  "wishlist.signin_title": { en: "Your wishlist", ar: "قائمة المفضلة" },
  "wishlist.signin_body": { en: "Sign in to save products and pick up where you left off.", ar: "سجّل الدخول لحفظ المنتجات ومتابعة ما بدأته." },
  "wishlist.remove": { en: "Remove from wishlist", ar: "إزالة من المفضلة" },
  "nav.wishlist": { en: "Wishlist", ar: "المفضلة" },
  "nav.cart": { en: "Cart", ar: "السلة" },
};

interface I18nCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  pick: (row: any, base: string) => any;
}

const Ctx = createContext<I18nCtx | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "en" || saved === "ar") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  }

  const t = (key: string) => DICT[key]?.[lang] ?? key;
  const pick = (row: any, base: string) => {
    if (!row) return "";
    return row[`${base}_${lang}`] ?? row[`${base}_en`] ?? row[base] ?? "";
  };

  return (
    <Ctx.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, t, pick }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be inside I18nProvider");
  return c;
}
