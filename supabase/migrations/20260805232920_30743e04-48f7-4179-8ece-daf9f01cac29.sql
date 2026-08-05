ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS show_in_nav boolean NOT NULL DEFAULT false;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS nav_sort_order integer NOT NULL DEFAULT 0;