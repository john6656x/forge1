/**
 * Single source of truth for the green / yellow / red metric system.
 * Used by every tool so scoring reads identically across the app.
 */
export type MetricLevel = "good" | "medium" | "caution";

/** Competition: lower is better. 0–100 scale. */
export function competitionLevel(score: number): MetricLevel {
  if (score < 35) return "good";
  if (score < 70) return "medium";
  return "caution";
}

/** Search volume: higher is better. Monthly searches. */
export function volumeLevel(volume: number): MetricLevel {
  if (volume >= 5000) return "good";
  if (volume >= 800) return "medium";
  return "caution";
}

export function competitionLabel(score: number): string {
  const l = competitionLevel(score);
  return l === "good" ? "Low" : l === "medium" ? "Medium" : "High";
}

export function volumeBand(volume: number): string {
  const l = volumeLevel(volume);
  return l === "good" ? "High" : l === "medium" ? "Medium" : "Low";
}

export const levelClasses: Record<MetricLevel, string> = {
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  caution: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
};

export const levelDot: Record<MetricLevel, string> = {
  good: "bg-emerald-500",
  medium: "bg-amber-500",
  caution: "bg-red-500"
};
