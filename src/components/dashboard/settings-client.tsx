"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient, useSession } from "@/lib/auth-client";

interface Status {
  plan: string;
  quota: { used: number; limit: number };
  dataSource: "mock" | "etsy" | "scrape";
  llm: string;
}

interface EtsyStatus { connected: boolean; shopName: string | null; status: string | null; keyPresent: boolean }

export function SettingsClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  const [etsy, setEtsy] = useState<EtsyStatus | null>(null);
  const [prefs, setPrefs] = useState<{ emailAlerts: boolean; emailDigest: boolean } | null>(null);
  const [extToken, setExtToken] = useState<string | null>(null);
  const [extExists, setExtExists] = useState(false);
  const [etsyMsg, setEtsyMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/usage").then((r) => r.json()).then(setStatus).catch(() => {});
    fetch("/api/etsy/status").then((r) => r.json()).then(setEtsy).catch(() => {});
    fetch("/api/me/prefs").then((r) => r.json()).then(setPrefs).catch(() => {});
    fetch("/api/me/extension-token").then((r) => r.json()).then((d) => setExtExists(Boolean(d.exists))).catch(() => {});
    const q = new URLSearchParams(window.location.search).get("etsy");
    if (q === "connected") setEtsyMsg("Shop connected! Your dashboard now shows your own listings.");
    else if (q === "missing-key") setEtsyMsg("Set ETSY_API_KEY in .env first — the OAuth flow needs your app keystring.");
    else if (q === "state-mismatch" || q === "invalid") setEtsyMsg("The connect flow expired or was tampered with. Try again.");
    else if (q === "failed") setEtsyMsg("Etsy rejected the connection. Check that the redirect URI in your Etsy app matches this site.");
  }, []);

  async function disconnectEtsy() {
    await fetch("/api/etsy/disconnect", { method: "POST" });
    setEtsy((e) => (e ? { ...e, connected: false, shopName: null } : e));
    setEtsyMsg("Shop disconnected — tokens deleted.");
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await authClient.updateUser({ name: name.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    router.refresh();
  }

  async function openPortal() {
    setBillingMsg(null);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const body = await res.json();
    if (body.url) window.location.href = body.url;
    else setBillingMsg(body.message ?? "Billing portal unavailable.");
  }

  async function togglePref(key: "emailAlerts" | "emailDigest") {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await fetch("/api/me/prefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ [key]: next[key] }) });
  }

  async function generateExtToken() {
    const res = await fetch("/api/me/extension-token", { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setExtToken(d.token);
      setExtExists(true);
    }
  }

  async function revokeExtToken() {
    await fetch("/api/me/extension-token", { method: "DELETE" });
    setExtToken(null);
    setExtExists(false);
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <section className="card p-5" aria-label="Account">
        <h2 className="text-sm font-bold text-brand-900 dark:text-white">Account</h2>
        <form onSubmit={saveName} className="mt-3 space-y-3">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Display name
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Email: <strong className="font-semibold text-slate-700 dark:text-slate-200">{session?.user?.email ?? "…"}</strong></p>
          <div className="flex gap-2">
            <Button type="submit" variant="accent" size="sm">{saved ? "Saved ✓" : "Save changes"}</Button>
            <Button type="button" variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </form>
      </section>

      <section className="card p-5" aria-label="Plan and billing">
        <h2 className="text-sm font-bold text-brand-900 dark:text-white">Plan & billing</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Current plan: <strong className="text-brand-900 dark:text-white">{status?.plan ?? "…"}</strong>
          {status && <> — {status.quota.used}/{status.quota.limit === -1 ? "∞" : status.quota.limit} searches used today</>}
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="accent" size="sm" onClick={() => (window.location.href = "/pricing")}>Change plan</Button>
          <Button variant="secondary" size="sm" onClick={openPortal}>Manage billing</Button>
        </div>
        {billingMsg && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{billingMsg}</p>}
      </section>

      <section className="card p-5 lg:col-span-2" aria-label="Chrome extension">
        <h2 className="text-sm font-bold text-brand-900 dark:text-white">Chrome extension</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          The RankForge extension overlays 2026 title checks and keyword intel directly on Etsy pages. It ships in the repo under <code className="font-mono text-xs">extension/</code> — load it via chrome://extensions → "Load unpacked", then paste a token here into its popup.
        </p>
        {extToken ? (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Copy it now — it won't be shown again:</p>
            <code className="mt-1 block break-all rounded-lg bg-white p-2 font-mono text-xs text-slate-800 dark:bg-brand-950 dark:text-slate-100">{extToken}</code>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{extExists ? "A token exists. Generating a new one rotates it (the old one stops working)." : "No token yet."}</p>
        )}
        <div className="mt-3 flex gap-2">
          <Button variant="accent" size="sm" onClick={generateExtToken}>{extExists ? "Rotate token" : "Generate token"}</Button>
          {extExists && <Button variant="secondary" size="sm" onClick={revokeExtToken}>Revoke</Button>}
        </div>
      </section>

      <section className="card p-5 lg:col-span-2" aria-label="Email notifications">
        <h2 className="text-sm font-bold text-brand-900 dark:text-white">Email notifications</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([["emailAlerts", "Rank-drop alerts", "One email when a tracked keyword leaves page 1, falls 10+ spots, or drops out of the top 100."],
             ["emailDigest", "Weekly digest", "Monday morning: every tracked keyword with its 7-day movement."]] as const).map(([key, label, desc]) => (
            <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5 dark:border-brand-800">
              <input type="checkbox" checked={prefs ? prefs[key] : true} onChange={() => togglePref(key)} className="mt-0.5 h-4 w-4 accent-[#e56425]" disabled={!prefs} />
              <span className="text-sm">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{desc}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Delivery needs <code className="font-mono">RESEND_API_KEY</code> in .env — until then, sends are logged server-side instead.</p>
      </section>

      <section className="card p-5 lg:col-span-2" aria-label="Etsy shop connection">
        <h2 className="text-sm font-bold text-brand-900 dark:text-white">Etsy shop connection</h2>
        {etsyMsg && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{etsyMsg}</p>}
        {etsy?.connected ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Connected{etsy.shopName ? <>: <strong className="text-brand-900 dark:text-white">{etsy.shopName}</strong></> : ""} — your own listings (drafts included) show on the dashboard, and tokens auto-refresh daily.
              {etsy.status === "needs-reauth" && <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">Token expired — reconnect below.</span>}
            </p>
            <div className="flex gap-2">
              {etsy.status === "needs-reauth" && (
                <Button variant="accent" size="sm" onClick={() => (window.location.href = "/api/etsy/connect")}>Reconnect</Button>
              )}
              <Button variant="secondary" size="sm" onClick={disconnectEtsy}>Disconnect</Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Link your shop with Etsy OAuth (read-only scopes) to see your own listings — drafts included — with tag-slot warnings and one-click audits. Tokens are stored AES-256-GCM encrypted.
            </p>
            <Button variant="accent" size="sm" onClick={() => (window.location.href = "/api/etsy/connect")} disabled={etsy ? !etsy.keyPresent : false}>
              Connect Etsy shop
            </Button>
          </div>
        )}
        {etsy && !etsy.keyPresent && !etsy.connected && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Needs <code className="font-mono">ETSY_API_KEY</code> in .env (same keystring the data provider uses).</p>
        )}
      </section>

      <section className="card p-5 lg:col-span-2" aria-label="System status">
        <h2 className="text-sm font-bold text-brand-900 dark:text-white">Data & AI configuration</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-4 dark:border-brand-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Marketplace data</p>
            <p className="mt-1 text-sm font-bold text-brand-900 dark:text-white">
              {status ? (status.dataSource === "etsy" ? "Etsy Open API v3 (live)" : "Demo data (deterministic mock)") : "…"}
            </p>
            {status?.dataSource === "mock" && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Set <code className="font-mono">ETSY_API_KEY</code> and <code className="font-mono">MARKETPLACE_PROVIDER=etsy</code> in .env, restart, and every tool switches to live data.</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-100 p-4 dark:border-brand-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI engine</p>
            <p className="mt-1 text-sm font-bold text-brand-900 dark:text-white">{status?.llm ?? "…"}</p>
            {status?.llm.startsWith("rule-based") && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Set <code className="font-mono">ANTHROPIC_API_KEY</code> or <code className="font-mono">OPENAI_API_KEY</code> in .env and the AI tools switch from rule-based templates to the real model.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
