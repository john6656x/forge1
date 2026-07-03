"use client";

import { Bot, Send, User } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { LimitModal } from "./limit-modal";
import { AiBadge } from "./ai-shared";
import { Button } from "@/components/ui/button";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  'Score the keyword "ceramic mug" for me',
  "How do I pick my 13 tags?",
  "Title formula for a personalized necklace?",
  "How should I price a $6-cost candle?"
];

export function ForgeAiClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [ai, setAi] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12) })
      });
      const body = await res.json();
      if (res.status === 429) { setLimitOpen(true); setMessages(messages); return; }
      if (!res.ok) { setError(body.message ?? "Chat failed — try again."); return; }
      setMessages([...next, { role: "assistant", content: body.reply }]);
      setAi(body.ai);
    } catch {
      setError("Network error — retry.");
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    send();
  }

  return (
    <div className="card flex h-[36rem] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-brand-800">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ember-500 text-white"><Bot className="h-4 w-4" aria-hidden /></span>
          <div>
            <p className="text-sm font-bold text-brand-900 dark:text-white">Forge AI</p>
            <p className="text-[11px] text-slate-400">Etsy SEO copilot — wired into the live tool data</p>
          </div>
        </div>
        {ai !== null && <AiBadge ai={ai} />}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4" role="log" aria-label="Conversation">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Ask anything about tags, titles, pricing, or keywords.<br />Put a keyword in quotes and I'll score it with live data.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-ember-400 hover:text-ember-600 dark:border-brand-700 dark:text-slate-300">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ember-500 text-white"><Bot className="h-3.5 w-3.5" aria-hidden /></span>}
            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-brand-800 text-white dark:bg-ember-500" : "bg-slate-100 text-slate-800 dark:bg-brand-800 dark:text-slate-100"}`}>
              {m.content}
            </div>
            {m.role === "user" && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500 dark:bg-brand-700 dark:text-slate-300"><User className="h-3.5 w-3.5" aria-hidden /></span>}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ember-500 text-white"><Bot className="h-3.5 w-3.5" aria-hidden /></span>
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400 dark:bg-brand-800" aria-label="Thinking">Thinking…</div>
          </div>
        )}
        {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3 dark:border-brand-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Forge AI…"
          aria-label="Message Forge AI"
          className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white"
        />
        <Button type="submit" variant="accent" disabled={loading || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />
    </div>
  );
}
