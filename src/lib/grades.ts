/**
 * RankHero-style letter grading, ported from Site-Creator's analysis route.
 * Four sections (title / tags / description / images), weighted 30/30/25/15,
 * each with its own A+–F grade plus prioritized suggestions.
 */

export interface SectionGrade {
  score: number;
  grade: string;
  label: string;
  feedback: string | null;
}

export interface GradedSuggestion {
  type: "title" | "tags" | "description" | "images";
  priority: "high" | "medium" | "low";
  text: string;
}

export interface GradeReport {
  totalScore: number;
  grade: string;
  sections: {
    title: SectionGrade;
    tags: SectionGrade;
    description: SectionGrade;
    images: SectionGrade;
  };
  suggestions: GradedSuggestion[];
}

export function gradeFromScore(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * 2026 title analysis. Etsy's updated guidance (Feb 2026) explicitly penalizes
 * keyword-stuffed titles and rewards natural, buyer-friendly language:
 *   - under ~15 words, mobile-first (~50–90 chars; first ~70 are what mobile shows)
 *   - leads with what the product actually IS
 *   - no word hammered 3+ times, no endless comma/pipe keyword chains
 * The old "fill 140 characters" meta now actively hurts ranking.
 */
export interface TitleAnalysis {
  score: number;
  words: number;
  chars: number;
  stuffedWords: string[]; // words repeated 3+ times
  separatorChains: number; // comma/pipe-separated fragments
  notes: string[];
}

const STOPWORDS = new Set(["a","an","the","for","of","and","or","with","in","on","to","her","him","-","|","&"]);

export function analyzeTitle2026(title: string, tags: string[]): TitleAnalysis {
  const chars = title.length;
  const wordsArr = title.toLowerCase().split(/[\s,|–—-]+/).filter(Boolean);
  const words = title.trim().split(/\s+/).filter(Boolean).length;

  const freq = new Map<string, number>();
  for (const w of wordsArr) {
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const stuffedWords = [...freq.entries()].filter(([, n]) => n >= 3).map(([w]) => w);
  const separatorChains = title.split(/[,|]/).length;

  const notes: string[] = [];
  let score = 100;

  // Word count — the 2026 headline rule.
  if (words > 20) { score -= 35; notes.push(`${words} words — Etsy's 2026 guidance says under 15; this reads as keyword stuffing.`); }
  else if (words > 15) { score -= 20; notes.push(`${words} words — trim toward 15 or fewer, natural phrasing.`); }

  // Mobile-first length. ~46% of GMS is in-app; first ~70 chars are visible.
  if (chars > 120) { score -= 20; notes.push(`${chars} chars — far past what mobile shows; the old 140-char meta is penalized now.`); }
  else if (chars > 90) { score -= 10; notes.push(`${chars} chars — keep the message inside the first ~70 characters.`); }
  else if (chars < 25) { score -= 15; notes.push(`${chars} chars — too thin to describe the product; aim for ~50–90.`); }

  // Stuffing detector.
  if (stuffedWords.length > 0) { score -= 15 * Math.min(2, stuffedWords.length); notes.push(`Repeated ${stuffedWords.map((w) => `"${w}"`).join(", ")} 3+ times — repetition is penalized, not rewarded.`); }

  // Keyword-chain detector: many comma/pipe fragments = old-style keyword dump.
  if (separatorChains >= 5) { score -= 15; notes.push(`${separatorChains} comma/pipe-separated fragments — reads like a keyword list, not a product name.`); }

  // Relevance: title should still connect to a real tag phrase early on.
  const lead = title.toLowerCase().slice(0, 70);
  if (tags.length && !tags.some((t) => t && lead.includes(t.toLowerCase()))) {
    score -= 10; notes.push("No tag phrase appears in the first 70 characters — lead with the exact buyer phrase.");
  }

  if (notes.length === 0) notes.push("Natural, mobile-friendly title — matches Etsy's 2026 guidance.");
  return { score: Math.max(0, Math.min(100, score)), words, chars, stuffedWords, separatorChains, notes };
}

export function gradeListing(title: string, tags: string[], description: string, imageCount: number): GradeReport {
  const titleAnalysis = analyzeTitle2026(title, tags);
  const titleScore = titleAnalysis.score;
  const titleLen = title.length;

  const tagScore = tags.length >= 13 ? 100 : tags.length >= 10 ? 80 : tags.length >= 5 ? 60 : 30;

  const descLen = description?.length ?? 0;
  const descScore = descLen >= 800 ? 90 : descLen >= 400 ? 75 : descLen >= 100 ? 55 : 30;

  const imageScore = imageCount >= 10 ? 100 : imageCount >= 7 ? 85 : imageCount >= 3 ? 65 : imageCount >= 1 ? 40 : 0;

  const totalScore = Math.round(titleScore * 0.3 + tagScore * 0.3 + descScore * 0.25 + imageScore * 0.15);

  const suggestions: GradedSuggestion[] = [];
  if (titleScore < 75) suggestions.push({ type: "title", priority: "high", text: titleAnalysis.notes[0] ?? "Rewrite the title as one natural phrase under 15 words, product first." });
  if (tags.length < 13) suggestions.push({ type: "tags", priority: "high", text: `Add ${13 - tags.length} more tags to hit Etsy's maximum of 13 — favor long-tail phrases.` });
  if (descLen < 400) suggestions.push({ type: "description", priority: "medium", text: "Expand the description past 400 characters: dimensions, materials, use case, gifting angle." });
  if (imageCount < 7) suggestions.push({ type: "images", priority: "medium", text: `Add ${Math.max(0, 7 - imageCount)} more photos — angles, in-use shots, and a size reference.` });
  if (suggestions.length === 0) suggestions.push({ type: "title", priority: "low", text: "Fundamentals look solid — iterate on keyword targeting with the Tag Generator." });

  return {
    totalScore,
    grade: gradeFromScore(totalScore),
    sections: {
      title: { score: titleScore, grade: gradeFromScore(titleScore), label: `${titleAnalysis.words} words · ${titleLen} chars`, feedback: titleScore < 90 ? titleAnalysis.notes[0] : null },
      tags: { score: tagScore, grade: gradeFromScore(tagScore), label: `${tags.length}/13 tags`, feedback: tags.length < 13 ? "Use all 13 tags" : null },
      description: { score: descScore, grade: gradeFromScore(descScore), label: `${descLen} chars`, feedback: descLen < 400 ? "Write at least 400 characters" : null },
      images: { score: imageScore, grade: gradeFromScore(imageScore), label: `${imageCount} photo${imageCount === 1 ? "" : "s"}`, feedback: imageCount < 7 ? "7–10 photos is the sweet spot" : null }
    },
    suggestions
  };
}
