/**
 * RankForge for Etsy — content script.
 * Three surfaces, all with defensive selectors (Etsy's DOM shifts often;
 * every read has fallbacks and the panel simply omits what it can't find):
 *   1. Listing pages  → instant 2026 title grade + photo count + deep audit link
 *   2. Search pages   → page-1 intel: prices, review medians, how many top
 *                       titles are 2026-compliant, + API keyword intel (token)
 *   3. Shop pages     → one-click "Analyze shop in RankForge"
 */
(function () {
  "use strict";
  if (window.__rankforgeLoaded) return;
  window.__rankforgeLoaded = true;

  const analyze = window.__rfAnalyzeTitle2026;

  /* ------------------------------------------------------------ helpers */
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function txt(el) { return el ? el.textContent.trim() : ""; }
  function first(sels, root) {
    for (const s of sels) { const el = q(s, root); if (el) return el; }
    return null;
  }
  function money(str) {
    const m = (str || "").replace(/[,\s]/g, "").match(/(\d+(?:\.\d{1,2})?)/);
    return m ? parseFloat(m[1]) : null;
  }
  function gradeColor(g) {
    return g === "A+" || g === "A" || g === "B" ? "#16a34a" : g === "C" ? "#d97706" : "#dc2626";
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function send(msg) {
    return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
  }

  function panelShell(title) {
    const panel = el("aside", "rf-panel");
    panel.setAttribute("role", "complementary");
    panel.setAttribute("aria-label", "RankForge");
    const head = el("div", "rf-head",
      '<span class="rf-logo">🔥 RankForge</span><span class="rf-title"></span><button class="rf-close" aria-label="Close">×</button>');
    head.querySelector(".rf-title").textContent = title;
    head.querySelector(".rf-close").addEventListener("click", () => panel.remove());
    panel.appendChild(head);
    const body = el("div", "rf-body");
    panel.appendChild(body);
    document.body.appendChild(panel);
    return body;
  }

  /* ----------------------------------------------------- listing pages */
  function runListing() {
    const titleEl = first([
      'h1[data-buy-box-listing-title]',
      '[data-buy-box-region="title"] h1',
      'h1.wt-text-body-01',
      'h1'
    ]);
    const title = txt(titleEl);
    if (!title || title.length < 5) return;

    const imgCount = Math.max(
      qa('ul[data-carousel-pagination-list] li').length,
      qa('[data-carousel-pager] li').length,
      qa('img[data-index]').length,
      qa('.image-carousel-container img').length
    );

    const a = analyze(title, []);
    const body = panelShell("Listing check");

    const gradeRow = el("div", "rf-grade-row");
    gradeRow.appendChild(el("span", "rf-grade", a.grade));
    gradeRow.querySelector(".rf-grade").style.color = gradeColor(a.grade);
    gradeRow.appendChild(el("span", "rf-grade-meta",
      a.words + " words · " + a.chars + " chars" + (imgCount ? " · " + imgCount + " photos" : "")));
    body.appendChild(gradeRow);

    const list = el("ul", "rf-notes");
    for (const n of a.notes.slice(0, 3)) {
      const li = el("li");
      li.textContent = n;
      list.appendChild(li);
    }
    body.appendChild(list);
    if (imgCount > 0 && imgCount < 7) {
      const li = el("div", "rf-note-extra");
      li.textContent = imgCount + " photos — Etsy rewards 7–10; the first one is scored by image recognition.";
      body.appendChild(li);
    }

    const idMatch = location.pathname.match(/\/listing\/(\d+)/);
    const btn = el("button", "rf-cta", "Full audit in RankForge →");
    btn.addEventListener("click", () =>
      send({ type: "rf-open", path: "/tools/etsy/listing-analyzer?ref=" + encodeURIComponent(idMatch ? idMatch[1] : location.href) }));
    body.appendChild(btn);
    body.appendChild(el("p", "rf-fineprint", "2026 title rules checked locally — free, no account needed."));
  }

  /* ------------------------------------------------------ search pages */
  function runSearch() {
    const params = new URLSearchParams(location.search);
    const keyword = (params.get("q") || "").trim();
    if (!keyword) return;

    const cards = qa("li .v2-listing-card, [data-listing-card], .js-merch-stash-check-listing")
      .slice(0, 48);
    const titles = [];
    const prices = [];
    for (const c of cards) {
      const t = txt(first(["h3", ".v2-listing-card__title", "h2"], c));
      if (t) titles.push(t);
      const p = money(txt(first([".currency-value", ".n-listing-card__price", ".lc-price"], c)));
      if (p !== null && p > 0) prices.push(p);
    }
    if (titles.length < 3) return; // DOM changed too much — stay silent, never guess

    const graded = titles.map((t) => analyze(t, []));
    const compliant = graded.filter((g) => g.score >= 75).length;
    prices.sort((x, y) => x - y);
    const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;

    const body = panelShell('"' + keyword.slice(0, 40) + '"');
    const stats = el("div", "rf-stats");
    function stat(label, value) {
      const s = el("div", "rf-stat");
      s.appendChild(el("div", "rf-stat-v", value));
      s.appendChild(el("div", "rf-stat-l", label));
      stats.appendChild(s);
    }
    stat("results parsed", String(titles.length));
    if (median !== null) stat("median price", "$" + median.toFixed(2));
    stat("2026-ready titles", compliant + "/" + graded.length);
    body.appendChild(stats);

    const insight = el("p", "rf-insight");
    const pct = Math.round((compliant / graded.length) * 100);
    insight.textContent = pct < 50
      ? "Most competitors here still run keyword-stuffed titles — a natural-language listing has an opening."
      : "Competitors here have adapted to the 2026 rules; win on photos, attributes, and AI visibility instead.";
    body.appendChild(insight);

    // API enrichment (token required): live volume/competition for this query.
    const apiBox = el("div", "rf-api-box", '<span class="rf-spinner"></span> Fetching keyword intel…');
    body.appendChild(apiBox);
    send({ type: "rf-tag-report", q: keyword }).then((r) => {
      if (!r || r.error === "NO_TOKEN") {
        apiBox.innerHTML = 'Connect the extension (popup → token from RankForge Settings) for live volume & competition.';
        return;
      }
      if (r.error || r.status >= 400) {
        apiBox.textContent = r.message || "Keyword intel unavailable right now.";
        return;
      }
      apiBox.innerHTML = "";
      const line = el("div", "rf-api-line");
      line.innerHTML =
        "<strong>" + Number(r.volume).toLocaleString() + "</strong>/mo est. searches · competition <strong>" +
        r.competition + "</strong>/100 <span class='rf-src'>(" + r.source + ")</span>";
      apiBox.appendChild(line);
      if (Array.isArray(r.topTags) && r.topTags.length) {
        const tags = el("div", "rf-tags");
        for (const t of r.topTags.slice(0, 6)) {
          const chip = el("span", "rf-tag-chip");
          chip.textContent = t.name;
          chip.title = t.volume + "/mo · comp " + t.competition;
          tags.appendChild(chip);
        }
        apiBox.appendChild(tags);
      }
    });

    const btn = el("button", "rf-cta", "Open in Tag Generator →");
    btn.addEventListener("click", () =>
      send({ type: "rf-open", path: "/tools/etsy/tag-generator?q=" + encodeURIComponent(keyword) }));
    body.appendChild(btn);
  }

  /* -------------------------------------------------------- shop pages */
  function runShop() {
    const nameMatch = location.pathname.match(/\/shop\/([^/?#]+)/);
    if (!nameMatch) return;
    const shopName = nameMatch[1];
    const body = panelShell(shopName);
    const salesEl = first(['[data-appears-component-name="shop_home_header"] .wt-text-caption', ".shop-sales", ".wt-text-caption"]);
    if (salesEl && /sale/i.test(txt(salesEl))) {
      body.appendChild(el("p", "rf-insight", txt(salesEl)));
    }
    const btn = el("button", "rf-cta", "Analyze shop in RankForge →");
    btn.addEventListener("click", () =>
      send({ type: "rf-open", path: "/tools/etsy/shop-analyzer" }));
    body.appendChild(btn);
    body.appendChild(el("p", "rf-fineprint", "Full report: sales estimates, tag cloud, review sentiment, percentile."));
  }

  /* --------------------------------------------------------- dispatch */
  const path = location.pathname;
  try {
    if (/^\/listing\/\d+/.test(path)) runListing();
    else if (path.startsWith("/search")) runSearch();
    else if (/^\/shop\/[^/]+/.test(path)) runShop();
  } catch (e) {
    // Never break the Etsy page — fail silent.
    console.debug("[RankForge]", e);
  }
})();
