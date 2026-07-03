"use client";

import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";

/** One-click CSV export for any result table. */
export function ExportCsvButton({ filename, rows, label = "CSV" }: {
  filename: string;
  rows: (string | number | null | undefined)[][];
  label?: string;
}) {
  if (rows.length <= 1) return null;
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, rows)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-ember-400 hover:text-ember-600 dark:border-brand-700 dark:text-slate-300 dark:hover:text-ember-400"
      aria-label={`Export ${filename} as CSV`}
    >
      <Download className="h-3.5 w-3.5" aria-hidden /> {label}
    </button>
  );
}
