"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  return (
    <div className="card divide-y divide-slate-200 dark:divide-brand-800">
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-panel-${i}`;
        const btnId = `${baseId}-btn-${i}`;
        return (
          <div key={item.q}>
            <button
              id={btnId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-slate-800 dark:text-slate-100"
            >
              {item.q}
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")}
                aria-hidden
              />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              hidden={!isOpen}
              className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
