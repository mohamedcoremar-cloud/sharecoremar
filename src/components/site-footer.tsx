import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import logoIcon from "@/assets/logo-icon.png";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function SiteFooter() {
  const { t, lang } = useI18n();
  const { data: settings } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => (await supabase.from("site_settings").select("*")).data ?? [],
  });
  const branding = settings?.find((s: any) => s.key === "branding")?.value as any;
  const footer = settings?.find((s: any) => s.key === "footer")?.value as any;
  const social = settings?.find((s: any) => s.key === "social")?.value as any;
  const name = branding?.[`name_${lang}`] ?? "Share CoreMar";
  const tagline = branding?.[`tagline_${lang}`] ?? "Smart Market. Core Solutions.";
  const copyright = footer?.[`copyright_${lang}`] ?? `© ${new Date().getFullYear()} Share CoreMar.`;

  return (
    <footer className="mt-20 border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={logoIcon} alt="" className="h-9 w-9 rounded-lg" />
            <span className="font-bold">{name}</span>
          </div>
          <p className="text-sm text-muted-foreground">{tagline}</p>
          {branding?.email && <p className="text-xs text-muted-foreground mt-3">{branding.email}</p>}
          {branding?.phone && <p className="text-xs text-muted-foreground">{branding.phone}</p>}
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">{t("footer.marketplace")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/products">{t("footer.all_products")}</Link></li>
            <li><Link to="/categories">{t("nav.categories")}</Link></li>
            <li><Link to="/brands">{t("nav.brands")}</Link></li>
            <li><Link to="/suppliers">{t("nav.suppliers")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">{t("footer.business")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/become-supplier">{t("nav.become_supplier")}</Link></li>
            <li>{t("footer.wholesale")}</li>
            <li>{t("footer.retail")}</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">{t("footer.support")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/p/$slug" params={{ slug: "about" }} className="hover:text-foreground">About Us</Link></li>
            <li><Link to="/p/$slug" params={{ slug: "contact" }} className="hover:text-foreground">Contact</Link></li>
            <li><Link to="/p/$slug" params={{ slug: "shipping" }} className="hover:text-foreground">Shipping</Link></li>
            <li><Link to="/p/$slug" params={{ slug: "returns" }} className="hover:text-foreground">Returns</Link></li>
            <li><Link to="/p/$slug" params={{ slug: "privacy" }} className="hover:text-foreground">Privacy</Link></li>
            <li><Link to="/p/$slug" params={{ slug: "terms" }} className="hover:text-foreground">Terms</Link></li>
          </ul>
          {social && (
            <div className="flex gap-3 mt-4 text-xs">
              {social.facebook && <a href={social.facebook} className="hover:text-foreground">Facebook</a>}
              {social.instagram && <a href={social.instagram} className="hover:text-foreground">Instagram</a>}
              {social.linkedin && <a href={social.linkedin} className="hover:text-foreground">LinkedIn</a>}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">{copyright}</div>
    </footer>
  );
}
