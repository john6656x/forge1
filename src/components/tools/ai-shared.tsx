"use client";

import { Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Badge that tells the user which engine produced the output. */
export function AiBadge({ ai }: { ai: boolean }) {
  return ai ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-500/15 dark:text-violet-300">
      <Sparkles className="h-3 w-3" aria-hidden /> AI-generated
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-brand-800 dark:text-slate-300"
      title="No LLM API key configured — output comes from RankForge's deterministic rule engine. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to switch."
    >
      <Wand2 className="h-3 w-3" aria-hidden /> Rule-based
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? "Copied!" : label}
    </Button>
  );
}

/** POST helper shared by the AI tools; returns null on quota hit. */
export async function aiGenerate<T>(payload: Record<string, unknown>): Promise<{ data: T; ai: boolean } | "limit" | { error: string }> {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    if (res.status === 429) return "limit";
    if (!res.ok) return { error: body.message ?? "Generation failed. Try again." };
    return { data: body.data as T, ai: body.ai as boolean };
  } catch {
    return { error: "Network error — retry." };
  }
}
