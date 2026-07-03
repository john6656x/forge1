"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, FolderKanban, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Session-aware right side of the header: auth buttons or the account menu. */
export function UserMenu({ mobile = false }: { mobile?: boolean }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (isPending) return <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-brand-800" aria-hidden />;

  if (!session?.user) {
    return (
      <div className={cn("items-center gap-2", mobile ? "flex" : "hidden md:flex")}>
        <ButtonLink href="/auth/login" variant={mobile ? "secondary" : "ghost"} size="sm" className={mobile ? "flex-1" : undefined}>Sign In</ButtonLink>
        <ButtonLink href="/auth/signup" variant="accent" size="sm" className={mobile ? "flex-1" : undefined}>Get Started</ButtonLink>
      </div>
    );
  }

  const user = session.user;
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/settings", label: "Settings", icon: Settings }
  ];

  if (mobile) {
    return (
      <div className="flex w-full flex-col gap-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-brand-800">
            <l.icon className="h-4 w-4" aria-hidden /> {l.label}
          </Link>
        ))}
        <button onClick={signOut} className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-brand-800">
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="relative hidden md:block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-300 dark:border-brand-700 dark:bg-brand-900 dark:text-slate-200"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ember-500 text-xs font-bold text-white">{initial}</span>
        <span className="max-w-[10rem] truncate">{user.name || user.email}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-brand-700 dark:bg-brand-900">
            {links.map((l) => (
              <Link key={l.href} role="menuitem" href={l.href} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-brand-800">
                <l.icon className="h-4 w-4" aria-hidden /> {l.label}
              </Link>
            ))}
            <div className="my-1 border-t border-slate-100 dark:border-brand-800" />
            <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-brand-800">
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
