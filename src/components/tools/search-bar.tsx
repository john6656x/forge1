"use client";

import { Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { LOCATIONS, Location } from "@/lib/providers/types";

export function SearchBar({
  placeholder,
  loading,
  withLocation = true,
  onSearch
}: {
  placeholder: string;
  loading: boolean;
  withLocation?: boolean;
  onSearch: (q: string, loc: Location) => void;
}) {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState<Location>("Global");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2 && !loading) onSearch(q.trim(), loc);
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 dark:border-brand-700 dark:bg-brand-950 dark:text-white"
        />
      </div>
      {withLocation && (
        <select
          value={loc}
          onChange={(e) => setLoc(e.target.value as Location)}
          aria-label="Location"
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-brand-700 dark:bg-brand-950 dark:text-slate-200"
        >
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      )}
      <Button type="submit" variant="accent" size="lg" disabled={loading || q.trim().length < 2} className="h-11">
        {loading ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
