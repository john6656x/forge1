"use client";

import { Bell, PackageSearch, TrendingDown, TrendingUp, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Notif { id: string; type: string; title: string; body: string; url: string | null; read: boolean; createdAt: string }

const ICONS: Record<string, typeof Bell> = {
  price_drop: TrendingDown,
  price_up: TrendingUp,
  sold_out: XCircle,
  back_in_stock: CheckCircle2,
  removed: XCircle,
  watch_error: AlertTriangle
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const d = await res.json();
      setItems(d.notifications);
      setUnread(d.unread);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => { clearInterval(t); document.removeEventListener("mousedown", close); };
  }, []);

  async function markAll() {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    load();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` — ${unread} unread` : ""}`}
        aria-expanded={open}
        className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-900 dark:text-slate-300 dark:hover:bg-brand-800 dark:hover:text-white"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-brand-800 dark:bg-brand-900" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-brand-800">
            <p className="text-sm font-bold text-brand-900 dark:text-white">Notifications</p>
            {unread > 0 && <button onClick={markAll} className="text-xs font-semibold text-ember-600 dark:text-ember-400">Mark all read</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">Quiet for now — supplier and rank alerts land here.</li>}
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? PackageSearch;
              return (
                <li key={n.id} className={`border-b border-slate-50 px-4 py-3 dark:border-brand-800/60 ${n.read ? "opacity-60" : ""}`}>
                  <div className="flex gap-3">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${n.type === "sold_out" || n.type === "removed" ? "text-red-500" : n.type === "price_drop" || n.type === "back_in_stock" ? "text-green-500" : "text-amber-500"}`} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{n.body}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(n.createdAt).toLocaleString()}
                        {n.url && <> · <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ember-600 dark:text-ember-400">open product</a></>}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-100 px-4 py-2 text-center dark:border-brand-800">
            <Link href="/tools/etsy/supplier-watch" className="text-xs font-semibold text-ember-600 dark:text-ember-400">Manage supplier watches →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
