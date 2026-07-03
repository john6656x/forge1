"use client";

import Link from "next/link";
import { Flame, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme";
import { ButtonLink } from "@/components/ui/button";
import { UserMenu } from "@/components/marketing/user-menu";

const nav = [
  { href: "/tools", label: "Tools" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compare", label: "Compare" },
  { href: "/blog", label: "Blog" }
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-brand-900 dark:text-white">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-800 text-white dark:bg-ember-500">
        <Flame className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-lg">RankForge</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-brand-800/70 dark:bg-brand-950/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="link-quiet">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <UserMenu />
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Toggle menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-brand-800"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 dark:border-brand-800 dark:bg-brand-950 md:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium link-quiet hover:bg-slate-50 dark:hover:bg-brand-900">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <UserMenu mobile />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
