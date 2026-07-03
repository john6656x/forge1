"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Item { id: string; kind: string; title: string; payload: unknown; createdAt: string }
interface Detail { id: string; name: string; items: Item[] }

function payloadText(item: Item): string {
  const p = item.payload as Record<string, unknown>;
  if (Array.isArray(p)) return p.join(", ");
  if (p && typeof p === "object") {
    if (Array.isArray((p as { tags?: string[] }).tags)) return ((p as { tags: string[] }).tags).join(", ");
    if (typeof (p as { text?: string }).text === "string") return (p as { text: string }).text;
    return JSON.stringify(p, null, 2);
  }
  return String(p ?? "");
}

export function ProjectDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/projects/${id}`);
    if (res.status === 404) return setError("Project not found.");
    if (!res.ok) return setError("Could not load the project.");
    setDetail((await res.json()).project);
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function removeItem(itemId: string) {
    await fetch(`/api/projects/${id}?item=${itemId}`, { method: "DELETE" });
    load();
  }

  async function copy(item: Item) {
    await navigator.clipboard.writeText(payloadText(item));
    setCopied(item.id);
    setTimeout(() => setCopied(null), 1500);
  }

  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">{error} <Link href="/dashboard/projects" className="font-bold underline">Back to projects</Link></div>;
  if (!detail) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-brand-800" aria-label="Loading" />;

  return (
    <div>
      <Link href="/dashboard/projects" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All projects
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-brand-900 dark:text-white">{detail.name}</h1>

      {detail.items.length === 0 ? (
        <div className="card mt-6 px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
          Nothing saved yet. In any tool, run a search and hit <strong>Save to project</strong>.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {detail.items.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-brand-800 dark:text-slate-400">{item.kind}</span>
                  <h2 className="mt-1.5 font-bold text-brand-900 dark:text-white">{item.title}</h2>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="secondary" size="sm" onClick={() => copy(item)}>
                    <Copy className="mr-1 h-3.5 w-3.5" aria-hidden /> {copied === item.id ? "Copied!" : "Copy"}
                  </Button>
                  <button onClick={() => removeItem(item.id)} aria-label="Delete item" className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-brand-950 dark:text-slate-300">{payloadText(item)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
