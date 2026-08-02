import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_public/p/$slug")({
  component: PagePage,
  head: () => ({
    meta: [
      { title: "Information — Share CoreMar" },
      { name: "description", content: "Read Share CoreMar's policies and information pages, including terms, privacy and delivery details." },
      { property: "og:title", content: "Information — Share CoreMar" },
      { property: "og:description", content: "Share CoreMar policies and information pages: terms, privacy and delivery." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function PagePage() {
  const { slug } = Route.useParams();
  const { lang } = useI18n();
  const { data: page, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => (await supabase.from("pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle()).data,
  });

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-16">Loading…</div>;
  if (!page) return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Page not found. <Link to="/" className="text-primary underline">Home</Link></div>;

  const title = lang === "ar" ? (page.title_ar || page.title_en) : page.title_en;
  const content = lang === "ar" ? (page.content_ar || page.content_en) : page.content_en;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold mb-6">{title}</h1>
      <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-foreground/90">
        {renderMarkdown(content ?? "")}
      </div>
    </article>
  );
}

function renderMarkdown(md: string) {
  // simple markdown: # H1, ## H2, **bold**, - lists
  const lines = md.split("\n");
  const out: any[] = [];
  let listBuffer: string[] = [];
  const flush = () => { if (listBuffer.length) { out.push(<ul key={out.length} className="list-disc ps-6 my-3 space-y-1">{listBuffer.map((l,i) => <li key={i} dangerouslySetInnerHTML={{__html: inline(l)}} />)}</ul>); listBuffer = []; } };
  const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  lines.forEach((line, i) => {
    if (line.startsWith("# ")) { flush(); out.push(<h1 key={i} className="text-3xl font-bold mt-6 mb-3">{line.slice(2)}</h1>); }
    else if (line.startsWith("## ")) { flush(); out.push(<h2 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(3)}</h2>); }
    else if (line.startsWith("### ")) { flush(); out.push(<h3 key={i} className="text-xl font-semibold mt-4 mb-2">{line.slice(4)}</h3>); }
    else if (line.startsWith("- ")) { listBuffer.push(line.slice(2)); }
    else if (line.trim() === "") { flush(); }
    else { flush(); out.push(<p key={i} className="my-2" dangerouslySetInnerHTML={{__html: inline(line)}} />); }
  });
  flush();
  return out;
}
