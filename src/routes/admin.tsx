import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { I18nProvider, useI18n } from "@/lib/i18n";
import {
  LayoutDashboard, Package, FolderTree, BadgeCheck, Users, ShoppingBag, Image as ImageIcon,
  Building2, Home as HomeIcon, LogOut, Settings, Layers, Globe, FileText, CreditCard, Truck,
} from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

export const Route = createFileRoute("/admin")({
  component: () => (
    <AuthProvider>
      <AdminShell />
    </AuthProvider>
  ),
});

function useMenu() {
  const { t } = useI18n();
  return [
    { to: "/admin", label: t("admin.dashboard"), icon: LayoutDashboard, exact: true },
    { to: "/admin/products", label: t("admin.products"), icon: Package },
    { to: "/admin/categories", label: t("admin.categories"), icon: FolderTree },
    { to: "/admin/brands", label: t("admin.brands"), icon: BadgeCheck },
    { to: "/admin/suppliers", label: t("admin.suppliers"), icon: Building2 },
    { to: "/admin/orders", label: t("admin.orders"), icon: ShoppingBag },
    { to: "/admin/deliveries", label: "Deliveries", icon: Truck },
    { to: "/admin/users", label: t("admin.users"), icon: Users },
    { to: "/admin/homepage", label: t("admin.homepage"), icon: Layers },
    { to: "/admin/banners", label: t("admin.banners"), icon: ImageIcon },
    { to: "/admin/media", label: t("admin.media"), icon: ImageIcon },
    { to: "/admin/pages", label: "Pages", icon: FileText },
    { to: "/admin/payments", label: "Payment Methods", icon: CreditCard },
    { to: "/admin/settings", label: t("admin.settings"), icon: Settings },
  ] as const;
}

function AdminShell() {
  return (
    <I18nProvider>
      <AdminShellInner />
    </I18nProvider>
  );
}

function AdminShellInner() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const MENU = useMenu();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-sidebar text-sidebar-foreground">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sidebar text-sidebar-foreground p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-sidebar-foreground/70 mb-6">Please sign in to continue.</p>
          <Link to="/auth" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium">Sign in</Link>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sidebar text-sidebar-foreground p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-sidebar-foreground/70 mb-6">Your account doesn't have admin privileges.</p>
          <Link to="/" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex">
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <img src={logoIcon} alt="" className="h-9 w-9 rounded-lg" />
          <div>
            <div className="font-bold text-sm">Share CoreMar</div>
            <div className="text-[10px] uppercase tracking-wider text-primary">Admin</div>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {MENU.map((m) => {
            const active = (m as any).exact ? location.pathname === m.to : location.pathname.startsWith(m.to);
            const Icon = m.icon;
            return (
              <Link key={m.to} to={m.to} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}>
                <Icon className="h-4 w-4" />
                {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <Globe className="h-4 w-4" /> {lang === "en" ? "العربية" : "English"}
          </button>
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <HomeIcon className="h-4 w-4" /> {t("admin.back_to_site")}
          </Link>
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> {t("nav.signout")}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto"><Outlet /></main>
    </div>
  );
}
