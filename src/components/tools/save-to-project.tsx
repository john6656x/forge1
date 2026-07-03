"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectRow { id: string; name: string }

/**
 * "Save to project" popover used by every tool. Handles the three states:
 * signed out (points to login), no projects (inline create), and pick & save.
 */
export function SaveToProject({ title, kind, payload }: { title: string; kind: "tags" | "keywords" | "note" | "listing-draft"; payload: unknown }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [newName, setNewName] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function openPicker() {
    setOpen((o) => !o);
    if (projects || needsAuth) return;
    const res = await fetch("/api/projects");
    if (res.status === 401) return setNeedsAuth(true);
    if (res.ok) setProjects((await res.json()).projects);
  }

  async function save(projectId: string) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, title: title.slice(0, 140), payload })
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => { setDone(false); setOpen(false); }, 1200);
    }
  }

  async function createAndSave() {
    if (!newName.trim()) return;
    setBusy(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName.trim() })
    });
    setBusy(false);
    if (res.ok) {
      const { project } = await res.json();
      setProjects((p) => [project, ...(p ?? [])]);
      setNewName("");
      save(project.id);
    }
  }

  return (
    <div className="relative inline-block">
      <Button variant="secondary" size="sm" onClick={openPicker} aria-expanded={open}>
        {done ? <><Check className="mr-1 h-3.5 w-3.5 text-green-600" aria-hidden /> Saved</> : <><FolderPlus className="mr-1 h-3.5 w-3.5" aria-hidden /> Save to project</>}
      </Button>
      {open && !done && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-brand-700 dark:bg-brand-900">
            {needsAuth ? (
              <p className="p-2 text-sm text-slate-600 dark:text-slate-300">
                <Link href="/auth/signup" className="font-bold text-ember-600 dark:text-ember-400">Create a free account</Link> to save research into projects.
              </p>
            ) : projects === null ? (
              <p className="p-2 text-sm text-slate-400">Loading projects…</p>
            ) : (
              <>
                {projects.map((p) => (
                  <button key={p.id} disabled={busy} onClick={() => save(p.id)} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-brand-800">
                    {p.name}
                  </button>
                ))}
                {projects.length > 0 && <div className="my-1 border-t border-slate-100 dark:border-brand-800" />}
                <div className="flex gap-1 p-1">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createAndSave()}
                    placeholder="New project…"
                    aria-label="New project name"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white"
                  />
                  <Button size="sm" variant="accent" disabled={busy || !newName.trim()} onClick={createAndSave}>Add</Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
