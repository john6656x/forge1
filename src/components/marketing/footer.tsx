import Link from "next/link";
import { toolsByCategory } from "@/lib/registry";

const company = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compare", label: "Compare" },
  { href: "/blog", label: "Blog" },
  { href: "/press", label: "Press" },
  { href: "/contact", label: "Contact" }
];

const compare = [
  { href: "/compare/erank", label: "vs eRank" },
  { href: "/compare/alura", label: "vs Alura" },
  { href: "/compare/marmalead", label: "vs Marmalead" },
  { href: "/compare/everbee", label: "vs EverBee" }
];

const legal = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" }
];

function Col({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="link-quiet">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const tools = ["Compose", "Analyze", "Brainstorm"].flatMap((c) => toolsByCategory(c as never)).slice(0, 8);
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-brand-800 dark:bg-brand-950">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <Col title="Tools" links={tools.map((t) => ({ href: t.href, label: t.name }))} />
        <Col title="Company" links={company} />
        <Col title="Compare" links={compare} />
        <Col title="Legal" links={legal} />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Connect</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="#" className="link-quiet">X / Twitter</a></li>
            <li><a href="#" className="link-quiet">Instagram</a></li>
            <li><a href="#" className="link-quiet">YouTube</a></li>
            <li><a href="#" className="link-quiet">Pinterest</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-brand-800">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} RankForge. Etsy SEO made simple. Be seen. Then soar.</p>
          <p>
            The term &quot;Etsy&quot; is a trademark of Etsy, Inc. This application uses the Etsy API but is not
            endorsed or certified by Etsy.
          </p>
        </div>
      </div>
    </footer>
  );
}
