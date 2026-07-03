"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutGrid, PanelLeft, Settings, Star } from "lucide-react";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { CATEGORIES, toolsByCategory } from "@/lib/registry";
import { Logo } from "@/components/marketing/header";
import { ThemeToggle } from "@/components/theme";
import { ButtonLink } from "@/components/ui/button";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Tools" className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div>
        <p className="px-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Favorites</p>
        <p className="mt-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-500 dark:border-brand-700 dark:text-slate-400">
          Star a tool to pin it here.
        </p>
      </div>
      {CATEGORIES.map((cat) => (
        <div key={cat}>
          <p className="px-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{cat}</p>
          <ul className="mt-1.5 space-y-0.5">
            {toolsByCategory(cat).map((t) => {
              const active = pathname === t.href;
              return (
                <li key={t.slug}>
                  <Link
                    href={t.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-800 text-white dark:bg-ember-500/20 dark:text-ember-300"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-brand-800"
                    )}
                  >
                    <t.icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{t.name}</span>
                    {t.status === "soon" && (
                      <span className="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400 dark:bg-brand-800 dark:text-slate-500">
                        soon
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-auto space-y-0.5 border-t border-slate-200 pt-4 dark:border-brand-800">
        <Link href="/tools" onClick={onNavigate} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-brand-800">
          <LayoutGrid className="h-4 w-4" aria-hidden /> View All Tools
        </Link>
        <Link href="/settings" onClick={onNavigate} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-brand-800">
          <Settings className="h-4 w-4" aria-hidden /> Settings
        </Link>
      </div>
    </nav>
  );
}

export function ToolShell({
  crumbs,
  title,
  description,
  children
}: {
  crumbs: { href?: string; label: string }[];
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-brand-800 dark:bg-brand-900/60 lg:block">
        <div className="flex h-16 items-center border-b border-slate-200 px-4 dark:border-brand-800">
          <Logo />
        </div>
        <div className="h-[calc(100vh-4rem)] sticky top-0">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Tool navigation">
          <div className="absolute inset-0 bg-brand-950/60" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-lift dark:bg-brand-900">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-brand-800">
              <Logo />
            </div>
            <div className="h-[calc(100%-4rem)]">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-brand-800 dark:bg-brand-950/80 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open tool navigation"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-brand-800 lg:hidden"
            >
              <PanelLeft className="h-4 w-4" aria-hidden />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                {crumbs.map((c, i) => (
                  <li key={c.label} className="flex min-w-0 items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                    {c.href ? (
                      <Link href={c.href} className="truncate hover:text-brand-800 dark:hover:text-white">
                        {c.label}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold text-brand-900 dark:text-white">{c.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <ButtonLink href="/auth/signup" variant="accent" size="sm">Get Started</ButtonLink>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-3xl">{title}</h1>
              <p className="mt-1.5 max-w-2xl text-slate-600 dark:text-slate-300">{description}</p>
            </div>
            <button
              aria-label="Add to favorites"
              className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-brand-800"
            >
              <Star className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
