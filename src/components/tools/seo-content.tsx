import { Accordion } from "@/components/ui/accordion";
import { ToolDef } from "@/lib/registry";
import { CheckCircle2 } from "lucide-react";

/** The below-the-fold Overview / Features / How-to / FAQ block on every tool page. */
export function ToolSeoContent({ tool }: { tool: ToolDef }) {
  return (
    <div className="mt-14 space-y-12 border-t border-slate-200 pt-10 dark:border-brand-800">
      <section aria-labelledby="overview-h">
        <h2 id="overview-h" className="text-xl font-extrabold tracking-tight text-brand-900 dark:text-white">Overview</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">What it does</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{tool.overview.what}</p>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Why it matters</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{tool.overview.why}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-h">
        <h2 id="features-h" className="text-xl font-extrabold tracking-tight text-brand-900 dark:text-white">Features</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tool.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 dark:border-brand-800 dark:bg-brand-900 dark:text-slate-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="howto-h">
        <h2 id="howto-h" className="text-xl font-extrabold tracking-tight text-brand-900 dark:text-white">How to use it</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tool.howTo.map((step, i) => (
            <li key={step} className="card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white dark:bg-ember-500">
                {i + 1}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-xl font-extrabold tracking-tight text-brand-900 dark:text-white">Frequently asked questions</h2>
        <div className="mt-4">
          <Accordion items={tool.faq} />
        </div>
      </section>
    </div>
  );
}
