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
};

interface I18nCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  pick: <T extends Record<string, any>>(row: T, base: string) => any;
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
  const pick = <T extends Record<string, any>>(row: T, base: string) => {
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
