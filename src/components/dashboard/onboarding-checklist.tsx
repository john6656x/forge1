import Link from "next/link";
import { CheckCircle2, Circle, Rocket } from "lucide-react";

interface Props {
  etsyConnected: boolean;
  hasSearches: boolean;
  hasTracked: boolean;
}

/**
 * The activation path for a fresh account. Renders only while steps remain,
 * then disappears forever — the dashboard takes over.
 */
export function OnboardingChecklist({ etsyConnected, hasSearches, hasTracked }: Props) {
  const steps = [
    {
      done: etsyConnected,
      title: "Connect your Etsy shop",
      desc: "Read-only OAuth. Every listing gets graded instantly — weakest first, so you know where to start.",
      href: "/settings",
      cta: "Connect"
    },
    {
      done: hasSearches,
      title: "Run your first tag search",
      desc: "One seed keyword → 13 scored tags. The single highest-leverage SEO action on Etsy.",
      href: "/tools/etsy/tag-generator",
      cta: "Open Tag Generator"
    },
    {
      done: hasTracked,
      title: "Track a keyword",
      desc: "Check where a listing ranks, hit \u201cTrack daily\u201d, and the movement charts itself from tomorrow.",
      href: "/tools/etsy/rank-check",
      cta: "Open Rank Check"
    }
  ];
  const remaining = steps.filter((s) => !s.done).length;
  if (remaining === 0) return null;

  return (
    <section className="card border-ember-200 p-5 dark:border-ember-500/30" aria-label="Getting started">
      <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white">
        <Rocket className="h-4 w-4 text-ember-500" aria-hidden />
        Get set up — {steps.length - remaining}/{steps.length} done
      </h2>
      <ol className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.title} className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 ${s.done ? "border-slate-100 opacity-60 dark:border-brand-800" : "border-slate-200 dark:border-brand-700"}`}>
            <div className="flex items-start gap-3">
              {s.done
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" aria-hidden />
                : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />}
              <div>
                <p className={`text-sm font-semibold ${s.done ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>{s.title}</p>
                {!s.done && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>}
              </div>
            </div>
            {!s.done && (
              <Link href={s.href} className="shrink-0 rounded-lg bg-ember-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-ember-600">
                {s.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
