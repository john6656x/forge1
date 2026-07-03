/**
 * Etsy 2026 title analysis — pure-JS port of RankForge's analyzeTitle2026
 * (src/lib/grades.ts). Runs entirely in the page: instant, free, offline.
 */
(function () {
  const STOPWORDS = new Set(["a","an","the","for","of","and","or","with","in","on","to","her","him","-","|","&"]);

  function analyzeTitle2026(title, tags) {
    tags = tags || [];
    const chars = title.length;
    const wordsArr = title.toLowerCase().split(/[\s,|\u2013\u2014-]+/).filter(Boolean);
    const words = title.trim().split(/\s+/).filter(Boolean).length;

    const freq = new Map();
    for (const w of wordsArr) {
      if (w.length < 3 || STOPWORDS.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    const stuffedWords = [...freq.entries()].filter(([, n]) => n >= 3).map(([w]) => w);
    const separatorChains = title.split(/[,|]/).length;

    const notes = [];
    let score = 100;

    if (words > 20) { score -= 35; notes.push(words + " words — Etsy's 2026 guidance says under 15; this reads as keyword stuffing."); }
    else if (words > 15) { score -= 20; notes.push(words + " words — trim toward 15 or fewer, natural phrasing."); }

    if (chars > 120) { score -= 20; notes.push(chars + " chars — far past what mobile shows; the old 140-char meta is penalized now."); }
    else if (chars > 90) { score -= 10; notes.push(chars + " chars — keep the message inside the first ~70 characters."); }
    else if (chars < 25) { score -= 15; notes.push(chars + " chars — too thin to describe the product; aim for ~50–90."); }

    if (stuffedWords.length > 0) {
      score -= 15 * Math.min(2, stuffedWords.length);
      notes.push('Repeated "' + stuffedWords.join('", "') + '" 3+ times — repetition is penalized, not rewarded.');
    }
    if (separatorChains >= 5) { score -= 15; notes.push(separatorChains + " comma/pipe fragments — reads like a keyword list, not a product name."); }

    if (tags.length) {
      const lead = title.toLowerCase().slice(0, 70);
      if (!tags.some((t) => t && lead.includes(t.toLowerCase()))) {
        score -= 10; notes.push("No tag phrase appears in the first 70 characters.");
      }
    }
    if (notes.length === 0) notes.push("Natural, mobile-friendly title — matches Etsy's 2026 guidance.");

    score = Math.max(0, Math.min(100, score));
    const grade = score >= 95 ? "A+" : score >= 85 ? "A" : score >= 75 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "F";
    return { score, grade, words, chars, stuffedWords, separatorChains, notes };
  }

  window.__rfAnalyzeTitle2026 = analyzeTitle2026;
})();
