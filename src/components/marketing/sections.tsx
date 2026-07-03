import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, Search, Tags, TrendingUp } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { UpgradeButton } from "@/components/marketing/upgrade-button";
import { MetricPill } from "@/components/ui/metric-pill";
import { Counter } from "./counter";
import { CATEGORIES, TOOLS, toolsByCategory } from "@/lib/registry";

export function Hero() {
  return (
    <section className="container-page pb-16 pt-16 sm:pt-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-ember-600 dark:text-ember-400">
            Etsy SEO made simple
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-brand-900 dark:text-white sm:text-5xl lg:text-6xl">
            Your Etsy work deserves to be{" "}
            <span className="relative whitespace-nowrap">
              discovered
              <span className="absolute -bottom-1 left-0 h-2 w-full rounded-full bg-ember-400/50" aria-hidden />
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            A creator-friendly SEO hub built by sellers, for sellers. Research keywords, score your tags,
            read the trends, and write listings that rank — one guided step at a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/auth/signup" variant="accent" size="lg">
              Start Free <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/tools" variant="secondary" size="lg">
              Try Tools
            </ButtonLink>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No credit card required.</p>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

/* An illustrative product preview instead of a stock image: a mini tag report. */
function HeroPreview() {
  const rows = [
    { name: "ceramic mug handmade", comp: "good", vol: "good", v: "9.2K" },
    { name: "pottery mug gift for her", comp: "good", vol: "medium", v: "3.1K" },
    { name: "coffee lover gift", comp: "medium", vol: "good", v: "12.4K" },
    { name: "stoneware cup minimalist", comp: "good", vol: "medium", v: "1.8K" }
  ] as const;
  return (
    <div className="card p-5 sm:p-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white">
          <Tags className="h-4 w-4 text-ember-500" /> Tag Generator
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-brand-800 dark:text-slate-400">
          ceramic mug · USA
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-brand-800"
          >
            <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{r.name}</span>
            <span className="flex shrink-0 items-center gap-2">
              <MetricPill level={r.comp}>{r.comp === "good" ? "Low" : "Med"}</MetricPill>
              <MetricPill level={r.vol}>{r.v}/mo</MetricPill>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-800 px-4 py-3 text-white dark:bg-brand-800">
        <span className="text-sm font-semibold">4/13 tags selected</span>
        <span className="rounded-lg bg-ember-500 px-3 py-1.5 text-xs font-bold">Copy Tags</span>
      </div>
    </div>
  );
}

export function StatsBar() {
  return (
    <section className="border-y border-slate-200 bg-white py-10 dark:border-brand-800 dark:bg-brand-900/50">
      <div className="container-page grid grid-cols-2 gap-8 lg:grid-cols-4">
        <Counter to={500} suffix="K+" label="Sellers" />
        <Counter to={10} suffix="M+" label="Listings optimized" />
        <Counter to={98} suffix="%" label="Customer satisfaction" />
        <Counter to={127} label="Countries served" />
      </div>
    </section>
  );
}

const simplicity = [
  {
    icon: Gauge,
    title: "See what's working",
    body: "Run your shop through the analyzer and get a health score with the wins made visible — so you double down on the right listings.",
    href: "/tools/etsy/shop-analyzer",
    cta: "Analyze my shop"
  },
  {
    icon: Search,
    title: "Fix what's not",
    body: "Grade any single listing and get a concrete action plan: which title words to move, which tags to swap, which photos to add.",
    href: "/tools/etsy/listing-analyzer",
    cta: "Grade a listing"
  },
  {
    icon: Tags,
    title: "Remove guesswork",
    body: "Every tag comes scored for competition and monthly searches. Pick 13, copy once, paste into Etsy.",
    href: "/tools/etsy/tag-generator",
    cta: "Generate tags",
    sample: true
  },
  {
    icon: TrendingUp,
    title: "Turn views into sales",
    body: "Price against the niche's real distribution, ride seasonality instead of fighting it, and write copy for the buyer who's actually searching.",
    href: "/auth/signup",
    cta: "Get started"
  }
];

export function Simplicity() {
  return (
    <section className="container-page py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">
          Simplicity sets us apart.
        </h2>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
          Every tool guides you step by step. No dashboards to decode, no jargon to translate.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {simplicity.map((f) => (
          <div key={f.title} className="card flex flex-col p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
              <f.icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-bold text-brand-900 dark:text-white">{f.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.body}</p>
            {f.sample && (
              <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3 dark:bg-brand-950/60" aria-hidden>
                {[
                  ["linen tote bag", "2.4K/mo", "good"],
                  ["market bag aesthetic", "6.8K/mo", "medium"]
                ].map(([n, v, l]) => (
                  <div key={n} className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span>{n}</span>
                    <MetricPill level={l as "good" | "medium"}>{v}</MetricPill>
                  </div>
                ))}
              </div>
            )}
            <Link href={f.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-ember-600 hover:text-ember-700 dark:text-ember-400">
              {f.cta} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ToolGridSection() {
  return (
    <section className="bg-white py-20 dark:bg-brand-900/40">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">
            Built to work together.
          </h2>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Brainstorm a niche, analyze the field, compose the listing — one connected toolkit.
          </p>
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat} className="mt-10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{cat}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {toolsByCategory(cat).map((t) => (
                <Link key={t.slug} href={t.href} className="card group p-5 transition-shadow hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <t.icon className="h-5 w-5 text-brand-600 dark:text-slate-300" aria-hidden />
                    {t.status === "soon" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-brand-800 dark:text-slate-400">
                        Soon
                      </span>
                    )}
                  </div>
                  <h4 className="mt-3 font-bold text-brand-900 group-hover:text-ember-600 dark:text-white dark:group-hover:text-ember-400">
                    {t.name}
                  </h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.oneLiner}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const testimonials = [
  {
    name: "Maya T.",
    niche: "Handmade Jewelry",
    quote: "I filled all 13 tags with scored terms in five minutes. Two weeks later my bestseller moved from page 4 to page 1."
  },
  {
    name: "Jonas K.",
    niche: "3D Prints",
    quote: "The price distribution chart alone paid for itself — I was underpricing my whole shop by about 20%."
  },
  {
    name: "Priya S.",
    niche: "Digital Products",
    quote: "Other tools felt like flying a plane. This one just tells me what to do next, in order."
  },
  {
    name: "Elena R.",
    niche: "Print on Demand",
    quote: "The trend chart caught a seasonal spike a month early. I listed in time and rode the whole wave."
  }
];

export function Testimonials() {
  return (
    <section className="container-page py-20">
      <h2 className="text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">
        Sellers see the difference.
      </h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((t) => (
          <figure key={t.name} className="card flex flex-col p-6">
            <blockquote className="flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white dark:bg-ember-500"
                aria-hidden
              >
                {t.name.slice(0, 1)}
              </span>
              <span>
                <span className="block text-sm font-bold text-brand-900 dark:text-white">{t.name}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{t.niche}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    popular: false,
    features: ["3 searches per day, per tool", "Core tools access", "Save favorites", "Community support"],
    plan: "FREE" as const,
    cta: { label: "Start Free", variant: "secondary" as const }
  },
  {
    name: "Business",
    price: "$5.99",
    period: "/month",
    popular: true,
    features: ["All tools unlocked", "Generous daily usage", "Projects & rank tracking", "Priority support"],
    plan: "BUSINESS" as const,
    cta: { label: "Go Business", variant: "accent" as const }
  },
  {
    name: "Enterprise",
    price: "$29.99",
    period: "/month",
    popular: false,
    features: ["Large-scale usage", "Team seats & roles", "API access", "Dedicated support"],
    plan: "ENTERPRISE" as const,
    cta: { label: "Go Enterprise", variant: "secondary" as const }
  }
];

export function PricingTeaser() {
  return (
    <section className="bg-white py-20 dark:bg-brand-900/40">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">
            Simple pricing, honest limits.
          </h2>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
            Start free today. Upgrade when the results ask for it.
          </p>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`card relative flex flex-col p-6 ${t.popular ? "border-ember-400 ring-1 ring-ember-400 dark:border-ember-500 dark:ring-ember-500" : ""}`}
            >
              {t.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-ember-500 px-3 py-1 text-xs font-bold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-brand-900 dark:text-white">{t.name}</h3>
              <p className="mt-2">
                <span className="text-4xl font-extrabold tracking-tight text-brand-900 dark:text-white">{t.price}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400"> {t.period}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <UpgradeButton plan={t.plan} label={t.cta.label} variant={t.cta.variant} />
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/pricing" className="font-semibold text-ember-600 hover:text-ember-700 dark:text-ember-400">
            See the full plan comparison →
          </Link>
        </p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="container-page py-20">
      <div className="rounded-3xl bg-brand-800 px-6 py-14 text-center text-white dark:bg-brand-900 sm:px-12">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to stand out?</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-slate-300">
          Be seen. Then soar. Join the sellers who stopped guessing their SEO.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/auth/signup" variant="accent" size="lg">
            Start Free <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
        <p className="mt-3 text-sm text-slate-400">No credit card required.</p>
      </div>
    </section>
  );
}
