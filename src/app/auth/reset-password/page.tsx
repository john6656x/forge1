"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/marketing/header";
import { authClient } from "@/lib/auth-client";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) return setError(error.message ?? "The link is invalid or expired — request a new one.");
    router.push("/auth/login");
  }

  return (
    <div className="card mt-6 p-6">
      <h1 className="text-xl font-extrabold tracking-tight text-brand-900 dark:text-white">Choose a new password</h1>
      {!token && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Missing reset token — open this page from the link in your email, or <Link href="/auth/forgot-password" className="font-bold underline">request a new one</Link>.
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input required value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} placeholder="New password (min 8 characters)" aria-label="New password" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <Button type="submit" variant="accent" className="w-full" disabled={busy || !token}>{busy ? "One moment…" : "Set new password"}</Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center"><Logo /></div>
        <Suspense fallback={<div className="card mt-6 h-48 animate-pulse" />}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
