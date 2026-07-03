# RankForge for Etsy — Chrome extension

Overlays live SEO intel directly on Etsy pages:

- **Listing pages** → instant A+–F grade of the title against Etsy's 2026 rules
  (under 15 words, no stuffing, mobile-first) + photo-count check + one-click
  "Full audit in RankForge" (deep-links straight into the Listing Analyzer).
- **Search pages** → page-1 intel: median price, how many top titles are
  2026-compliant (your opening if most aren't), plus — with a token — live
  estimated volume, competition, and top tag candidates for the query.
- **Shop pages** → one-click "Analyze shop in RankForge".

The title analysis runs **locally in the extension** (a JS port of
`src/lib/grades.ts`): free, instant, no account, works offline.

## Install (unpacked, 30 seconds)

1. `chrome://extensions` → enable **Developer mode** (top right).
2. **Load unpacked** → select this `extension/` folder.
3. Optional, for live keyword intel: RankForge → **Settings → Chrome
   extension → Generate token**, then paste it in the extension popup
   together with your RankForge URL and hit *Save & test*.

## Notes

- Etsy's DOM changes without notice. Every selector has fallbacks and the
  panel silently omits anything it can't parse — it never guesses.
- API calls go through the background service worker with a Bearer token
  (`rfx_…`); only its SHA-256 hash is stored server-side. Rotate or revoke
  any time from Settings.
- Extension API usage counts against the per-tool "extension" quota
  (3/day free, 300/day Business).

## Chrome Web Store packaging

`zip -r rankforge-extension.zip extension/` (minus this README if you like),
then upload at https://chrome.google.com/webstore/devconsole. You'll need
store screenshots (1280×800) and a 440×280 promo tile.
