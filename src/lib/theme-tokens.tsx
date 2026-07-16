import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized design-tokens applier.
 *
 * Reads the single row in `public.theme_settings` and writes each token to
 * `document.documentElement` as a CSS custom property. All existing styles
 * already reference these variables (via `@theme inline` + shadcn tokens in
 * `src/styles.css`), so this component changes behavior only when the DB
 * values differ from the CSS defaults. On first load the DB is seeded with
 * the exact current defaults, so appearance is unchanged.
 *
 * This is infrastructure only — no admin UI is wired here yet.
 */

type ThemeRow = {
  color_primary: string;
  color_primary_foreground: string;
  color_secondary: string;
  color_secondary_foreground: string;
  color_accent: string;
  color_accent_foreground: string;
  color_success: string;
  color_warning: string;
  color_error: string;
  color_background: string;
  color_surface: string;
  color_text: string;
  color_border: string;
  font_family: string;
  logo_url: string | null;
  favicon_url: string | null;
};

const VAR_MAP: Record<keyof ThemeRow, string[] | null> = {
  // Each DB column maps to one or more existing CSS variables so the current
  // design tokens keep working without renaming anything downstream.
  color_primary: ["--primary", "--ring", "--gold"],
  color_primary_foreground: ["--primary-foreground", "--gold-foreground"],
  color_secondary: ["--secondary", "--muted"],
  color_secondary_foreground: ["--secondary-foreground", "--muted-foreground"],
  color_accent: ["--accent"],
  color_accent_foreground: ["--accent-foreground"],
  color_success: ["--success"],
  color_warning: ["--warning"],
  color_error: ["--destructive"],
  color_background: ["--background"],
  color_surface: ["--card", "--popover"],
  color_text: ["--foreground", "--card-foreground", "--popover-foreground", "--ink"],
  color_border: ["--border", "--input"],
  font_family: null,
  logo_url: null,
  favicon_url: null,
};

function applyTheme(row: ThemeRow) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  (Object.keys(VAR_MAP) as (keyof ThemeRow)[]).forEach((key) => {
    const vars = VAR_MAP[key];
    const value = row[key];
    if (!vars || value == null) return;
    for (const v of vars) root.style.setProperty(v, String(value));
  });

  if (row.font_family) {
    document.body.style.fontFamily = row.font_family;
  }
  if (row.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = row.favicon_url;
  }
}

export function ThemeTokensProvider() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("theme_settings")
        .select(
          "color_primary,color_primary_foreground,color_secondary,color_secondary_foreground,color_accent,color_accent_foreground,color_success,color_warning,color_error,color_background,color_surface,color_text,color_border,font_family,logo_url,favicon_url"
        )
        .eq("id", "default")
        .maybeSingle();
      if (cancelled || !data) return;
      applyTheme(data as ThemeRow);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
