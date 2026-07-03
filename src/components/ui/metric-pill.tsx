import { cn } from "@/lib/utils";
import { levelClasses, levelDot, MetricLevel } from "@/lib/metrics";

/** The shared green / yellow / red scoring pill used across every tool. */
export function MetricPill({ level, children, className }: { level: MetricLevel; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        levelClasses[level],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", levelDot[level])} aria-hidden />
      {children}
    </span>
  );
}
