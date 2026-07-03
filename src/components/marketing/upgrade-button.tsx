"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Plan CTA. Free → signup. Paid → Stripe Checkout via /api/stripe/checkout,
 * with honest handling for the two non-happy paths: not signed in (401 →
 * signup) and billing not configured yet (503 → inline notice).
 */
export function UpgradeButton({
  plan,
  label,
  variant = "accent"
}: {
  plan: "FREE" | "BUSINESS" | "ENTERPRISE";
  label: string;
  variant?: "accent" | "secondary";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function click() {
    if (plan === "FREE") return router.push("/auth/signup");
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const body = await res.json();
      if (res.status === 401) return router.push("/auth/signup");
      if (!res.ok) return setNotice(body.message ?? "Checkout unavailable right now.");
      window.location.href = body.url;
    } catch {
      setNotice("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <Button onClick={click} variant={variant} className="w-full" disabled={busy}>
        {busy ? "One moment…" : label}
      </Button>
      {notice && (
        <p role="status" className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {notice}
        </p>
      )}
    </div>
  );
}
