"use client";

import { Modal } from "@/components/ui/modal";
import { ButtonLink } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function LimitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Daily limit reached">
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        You have used this tool's 3 free searches for today — the other tools are still open. Create a free account for a higher daily
        allowance — or unlock every tool with Business.
      </p>
      <ul className="mt-4 space-y-2">
        {["All tools unlocked", "Projects & saved searches", "Rank tracking with alerts"].map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/auth/signup" variant="accent" className="flex-1">Create free account</ButtonLink>
        <ButtonLink href="/pricing" variant="secondary" className="flex-1">See plans</ButtonLink>
      </div>
    </Modal>
  );
}
