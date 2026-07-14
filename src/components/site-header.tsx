import { Link } from "@tanstack/react-router";
import { ShoppingCart, Heart, Menu, Search, User, LogOut, LayoutDashboard, Globe } from "lucide-react";
import { useState } from "react";
import logoIcon from "@/assets/logo-icon.png";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const NAV = [
    { to: "/products", label: t("nav.products") },
    { to: "/categories", label: t("nav.categories") },
    { to: "/brands", label: t("nav.brands") },
    { to: "/suppliers", label: t("nav.suppliers") },
    { to: "/become-supplier", label: t("nav.become_supplier") },
  ];
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoIcon} alt="Share CoreMar" className="h-9 w-9 rounded-lg" />
          <span className="hidden font-bold tracking-tight sm:inline">Share CoreMar</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 w-72">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input placeholder={t("nav.search_placeholder")} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="gap-1 font-semibold">
            <Globe className="h-4 w-4" /> {lang === "en" ? "AR" : "EN"}
          </Button>
          <Button variant="ghost" size="icon" asChild><Link to="/wishlist"><Heart className="h-5 w-5" /></Link></Button>
          <Button variant="ghost" size="icon" asChild><Link to="/cart"><ShoppingCart className="h-5 w-5" /></Link></Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium truncate">{user.email}</div>
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin"><LayoutDashboard className="mr-2 h-4 w-4" /> {t("nav.admin")}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild><Link to="/account">{t("nav.account")}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/orders">{t("nav.orders")}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}><LogOut className="mr-2 h-4 w-4" /> {t("nav.signout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" className="btn-gold"><Link to="/auth">{t("nav.signin")}</Link></Button>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="rounded px-2 py-2 text-sm font-medium hover:bg-muted" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
