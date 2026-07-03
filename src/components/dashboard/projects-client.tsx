"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectRow { id: string; name: string; updatedAt: string; _count: { items: number } }

export function ProjectsClient() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects((await res.json()).projects);
    else setError("Could not load projects.");
  }
  useEffect(() => { load(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() })
    });
    setBusy(false);
    if (!res.ok) return setError("Could not create the project.");
    setName("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this project and everything saved in it?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mt-6">
      <form onSubmit={create} className="card flex flex-col gap-3 p-4 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name, e.g. Ceramic mugs — Q4"
          aria-label="New project name"
          className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white"
        />
        <Button type="submit" variant="accent" disabled={busy || !name.trim()} className="h-11">
          <Plus className="mr-1 h-4 w-4" aria-hidden /> Create project
        </Button>
      </form>

      {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      {projects === null ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-brand-800" />)}</div>
      ) : projects.length === 0 ? (
        <div className="card mt-6 px-6 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
          No projects yet. Create one above, then use “Save to project” inside the tools.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="card group relative p-5">
              <Link href={`/dashboard/projects/${p.id}`} className="block">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
                  <FolderKanban className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="mt-3 font-bold text-brand-900 dark:text-white">{p.name}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{p._count.items} saved item{p._count.items === 1 ? "" : "s"}</p>
              </Link>
              <button
                onClick={() => remove(p.id)}
                aria-label={`Delete project ${p.name}`}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
