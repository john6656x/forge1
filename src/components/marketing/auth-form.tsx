"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/header";
import { authClient } from "@/lib/auth-client";

const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE === "1";

export function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const titles = {
    login: { h: "Welcome back", cta: "Sign In", alt: <>New here? <Link className="font-bold text-ember-600 dark:text-ember-400" href="/auth/signup">Create an account</Link></> },
    signup: { h: "Create your free account", cta: "Start Free", alt: <>Already have an account? <Link className="font-bold text-ember-600 dark:text-ember-400" href="/auth/login">Sign in</Link></> },
    forgot: { h: "Reset your password", cta: "Send reset link", alt: <Link className="font-bold text-ember-600 dark:text-ember-400" href="/auth/login">Back to sign in</Link> }
  }[mode];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "forgot") {
      setBusy(true);
      try {
        await authClient.requestPasswordReset({ email, redirectTo: "/auth/reset-password" });
        setNotice("If an account exists for that address, a reset link is on its way. (On deployments without an email provider configured, the request is logged server-side instead.)");
      } catch {
        setNotice("Could not start the reset — try again in a minute.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await authClient.signUp.email({ name: name.trim() || email.split("@")[0], email, password });
        if (error) return setError(error.message ?? "Could not create the account.");
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) return setError(error.message ?? "Wrong email or password.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (!googleEnabled) {
      setNotice("Google sign-in isn't configured. Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and set NEXT_PUBLIC_ENABLE_GOOGLE=1.");
      return;
    }
    await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
  }

  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center"><Logo /></div>
        <div className="card mt-6 p-6">
          <h1 className="text-xl font-extrabold tracking-tight text-brand-900 dark:text-white">{titles.h}</h1>

          {error && (
            <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</div>
          )}
          {notice && (
            <div role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{notice}</div>
          )}

          <form onSubmit={submit} className="mt-4 space-y-3">
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
            )}
            <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email address" aria-label="Email address" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
            {mode !== "forgot" && (
              <input required value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password (min 8 characters)" aria-label="Password" minLength={8} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
            )}
            <Button type="submit" variant="accent" className="w-full" disabled={busy}>
              {busy ? "One moment…" : titles.cta}
            </Button>
            {mode !== "forgot" && (
              <Button type="button" variant="secondary" className="w-full" onClick={google}>
                Continue with Google
              </Button>
            )}
          </form>

          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">{titles.alt}</p>
          {mode === "login" && (
            <p className="mt-2 text-center text-xs">
              <Link href="/auth/forgot-password" className="link-quiet">Forgot password?</Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
