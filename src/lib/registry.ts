import {
  BarChart3, Bot, Calculator, PackageSearch, FileText, Gauge, Lightbulb, LineChart, MessageSquare,
  Search, Sparkles, Store, Tags, Target, TrendingUp, Type, UserSearch, Video,
  Wand2, type LucideIcon
} from "lucide-react";

export type ToolCategory = "Brainstorm" | "Analyze" | "Compose" | "Other tools";

export interface ToolDef {
  slug: string;
  href: string;
  name: string;
  category: ToolCategory;
  icon: LucideIcon;
  oneLiner: string;
  description: string;
  status: "live" | "soon";
  overview: { what: string; why: string };
  features: string[];
  howTo: string[];
  faq: { q: string; a: string }[];
}

const commonFaq = [
  {
    q: "Is this data live from Etsy?",
    a: "In demo mode results come from a deterministic offline dataset so you can explore every tool without API keys. Connect the Etsy provider in Settings to switch to live marketplace data."
  },
  {
    q: "How many free searches do I get?",
    a: "Everyone gets 3 free uses per day per tool - hitting the limit on one tool never locks the others. Create a free account for a higher daily allowance, or go Business to unlock everything."
  }
];

export const TOOLS: ToolDef[] = [
  {
    slug: "supplier-watch",
    href: "/tools/etsy/supplier-watch",
    name: "Supplier Watch",
    category: "Other tools",
    icon: PackageSearch,
    oneLiner: "Your AliExpress source, monitored 24/7.",
    description: "Add any supplier product URL — AliExpress or any shop. Hourly checks catch price moves, sold-outs, and removed listings, with alerts in-app and by email before your customers find out for you.",
    status: "live",
    overview: {
      what: "Supplier Watch monitors source products around the clock: price history with your own alert threshold, stock transitions (sold out / back in stock), and removed-listing detection, all snapshotted hourly with in-app + email notifications.",
      why: "For dropshipping and made-to-order sellers, a silent supplier price hike eats the margin and a silent sold-out creates orders you can't fulfill. Finding out from an angry customer is the expensive way."
    },
    features: ["Hourly automated checks with polite rate limiting", "Price history sparkline + custom ±% alert threshold", "SOLD OUT / REMOVED / back-in-stock detection", "In-app notification center + batched email alerts", "Works with AliExpress and any shop exposing product data", "CSV export; pause/resume per product"],
    howTo: ["Paste the supplier product URL and set your alert threshold.", "RankForge validates it immediately — a bad URL fails now, not at 3am.", "The hourly monitor takes over; the bell and your inbox get the changes.", "Use \"Check now\" for an on-demand refresh before big promos."],
    faq: [
      { q: "How reliable is AliExpress monitoring?", a: "AliExpress runs anti-bot checks, so direct fetches occasionally get a captcha page — RankForge treats those as 'unknown' rather than raising false alarms, and backs off after repeated failures. For production-grade reliability, plug in any scraping proxy (one env var: SCRAPER_API_TEMPLATE) or official AliExpress affiliate API keys; both are documented in the README." },
      { q: "Which platforms work besides AliExpress?", a: "Any product page exposing standard structured data (JSON-LD or OpenGraph) — which covers most modern shops and marketplaces." }
    ]
  },
  // ---------------------------------------------------------------- Brainstorm
  {
    slug: "best-sellers",
    href: "/tools/etsy/best-sellers",
    name: "Best Sellers",
    category: "Brainstorm",
    icon: Store,
    oneLiner: "See what the top shops in your niche do differently.",
    description: "Surface top-performing listings and shops in any niche, then break down the tags, prices, and photos behind their sales.",
    status: "live",
    overview: {
      what: "Best Sellers pulls the highest-performing listings and shops for a niche and lays their playbook side by side: tags they rank for, price points, photo count, and estimated volume.",
      why: "Reverse-engineering proven winners is the fastest way to calibrate your own listings — you learn what buyers already reward instead of guessing."
    },
    features: ["Top listings and shops per niche", "Tag and price breakdowns", "Photo and volume signals", "Export to a project"],
    howTo: ["Enter a niche or seed keyword.", "Pick a marketplace region.", "Review the leaders' tag and price patterns.", "Save standouts to a project for later."],
    faq: commonFaq
  },
  {
    slug: "trends",
    href: "/tools/etsy/trends",
    name: "Etsy Trends",
    category: "Brainstorm",
    icon: TrendingUp,
    oneLiner: "Spot rising keywords before they peak.",
    description: "Trending and fast-rising keywords and products, with 3/6/12/24-month trend lines so you catch waves early.",
    status: "live",
    overview: {
      what: "Etsy Trends charts search interest for rising keywords and product types over 3, 6, 12, and 24 months.",
      why: "Sellers who list two months before a trend peaks capture rankings while competition is still thin."
    },
    features: ["Rising keyword feed", "Multi-window trend lines", "Seasonality markers", "One-click send to Tag Generator"],
    howTo: ["Open the rising-keywords feed.", "Filter by category or region.", "Compare 3–24 month windows.", "Send promising terms to the Tag Generator."],
    faq: commonFaq
  },
  {
    slug: "niche-finder",
    href: "/tools/etsy/niche-finder",
    name: "Niche Finder",
    category: "Brainstorm",
    icon: Target,
    oneLiner: "Find high-demand, low-competition corners of Etsy.",
    description: "Scan for underserved niches where demand outpaces supply, ranked by a single opportunity score.",
    status: "live",
    overview: {
      what: "Niche Finder cross-references search demand against active listing counts and scores each niche for opportunity.",
      why: "Entering an underserved niche means ranking with less effort and defending your position longer."
    },
    features: ["Opportunity score per niche", "Demand vs. supply chart", "Related sub-niches", "Save niches to watchlist"],
    howTo: ["Enter a broad category.", "Sort by opportunity score.", "Inspect demand vs. competition detail.", "Shortlist niches worth testing."],
    faq: commonFaq
  },
  // ------------------------------------------------------------------ Analyze
  {
    slug: "shop-analyzer",
    href: "/tools/etsy/shop-analyzer",
    name: "Shop Analyzer",
    category: "Analyze",
    icon: Gauge,
    oneLiner: "A full SEO health check for any shop.",
    description: "Paste a shop URL or name and get overall SEO health, per-listing performance, and a prioritized fix list.",
    status: "live",
    overview: {
      what: "Shop Analyzer grades an entire shop: titles, tags, descriptions, photos, and shipping profile, then ranks the fixes by impact.",
      why: "Most shops leak traffic from a handful of fixable issues. Seeing them ranked by impact turns an audit into a to-do list."
    },
    features: ["Shop-wide SEO score", "Per-listing grades", "Prioritized quick wins", "Progress tracking between audits"],
    howTo: ["Paste your shop URL or name.", "Wait for the audit to complete.", "Work through the prioritized fix list.", "Re-run to confirm improvements."],
    faq: commonFaq
  },
  {
    slug: "listing-analyzer",
    href: "/tools/etsy/listing-analyzer",
    name: "Listing Analyzer",
    category: "Analyze",
    icon: Search,
    oneLiner: "Grade one listing and get a concrete action plan.",
    description: "A letter score for title, tags, description, photos, and attributes — plus the exact edits to make.",
    status: "live",
    overview: {
      what: "Listing Analyzer inspects a single listing across every SEO surface Etsy indexes and returns a score with concrete edits.",
      why: "A focused per-listing plan beats generic advice: you fix the exact fields holding this listing back."
    },
    features: ["Letter + number score", "Field-by-field breakdown", "Copy-ready suggested edits", "Before/after comparison"],
    howTo: ["Paste a listing URL.", "Review the field-by-field grades.", "Apply the suggested edits.", "Re-check to verify the score improved."],
    faq: commonFaq
  },
  {
    slug: "buyer-check",
    href: "/tools/etsy/buyer-check",
    name: "Buyer Check",
    category: "Analyze",
    icon: UserSearch,
    oneLiner: "Know exactly who is searching — and why.",
    description: "Infer the target buyer for a keyword or listing: who they are, their intent, and their price sensitivity.",
    status: "live",
    overview: {
      what: "Buyer Check builds a buyer persona for any keyword or listing: demographics, purchase intent, and price sensitivity.",
      why: "Copy and photos convert when they speak to a specific person. Knowing the buyer changes how you write everything."
    },
    features: ["Persona snapshot", "Intent classification", "Price sensitivity band", "Messaging angle suggestions"],
    howTo: ["Enter a keyword or listing URL.", "Review the inferred persona.", "Note the intent and price band.", "Adjust your copy to match."],
    faq: commonFaq
  },
  {
    slug: "ai-visibility",
    href: "/tools/etsy/ai-visibility",
    name: "AI Visibility Score",
    category: "Analyze",
    icon: Bot,
    oneLiner: "See your listing the way ChatGPT does.",
    description: "Etsy listings are now surfaced and sold inside ChatGPT, Gemini, and Copilot. Score how discoverable yours is to AI shopping agents — and what to fix first.",
    status: "live",
    overview: {
      what: "AI Visibility Score evaluates a listing the way an AI shopping agent does: intent clarity, quotable facts (material, size, care), answer readiness, natural language, and gift-context coverage — then simulates real buyer prompts to show whether an agent would surface it.",
      why: "Over 20% of Etsy's referral traffic already comes from ChatGPT, and AI-referred shoppers convert better than search traffic. Conversational ranking depends on what your listing says, not just its keywords — most sellers haven't optimized for it yet."
    },
    features: ["A+–F visibility grade across 5 dimensions", "Simulated buyer prompts with strong/partial/weak match", "Agent-written verdict (with an AI key configured)", "Prioritized fixes, saveable to a project"],
    howTo: ["Paste your listing's title and description (tags optional).", "Run the score.", "Read the three simulated buyer prompts — that's how agents see you.", "Apply the fixes top-down; re-run to confirm the grade lift."],
    faq: commonFaq
  },
  {
    slug: "rank-check",
    href: "/tools/etsy/rank-check",
    name: "Rank Check",
    category: "Analyze",
    icon: LineChart,
    oneLiner: "Track where your listing ranks, over time.",
    description: "Check a listing's position for chosen keywords and store the history so you can see movement.",
    status: "live",
    overview: {
      what: "Rank Check finds where a listing appears in Etsy search for your chosen keywords and snapshots it over time.",
      why: "Rankings drift constantly. A history chart tells you whether your edits actually moved the needle."
    },
    features: ["Position per keyword", "Historical rank chart", "Drop alerts (Business)", "CSV export"],
    howTo: ["Paste your listing URL.", "Add the keywords you target.", "Run the first check.", "Return weekly — history builds automatically."],
    faq: commonFaq
  },
  {
    slug: "profit-calculator",
    href: "/tools/etsy/profit-calculator",
    name: "Profit Calculator",
    category: "Analyze",
    icon: Calculator,
    oneLiner: "Know your real margin after every Etsy fee.",
    description: "Item price, cost, Etsy fees, shipping, and ads in — net profit and suggested price bands out.",
    status: "live",
    overview: {
      what: "The Profit Calculator applies Etsy's current fee structure (listing, transaction, payment processing, optional Offsite Ads) to your numbers and shows true net profit per sale.",
      why: "Many sellers price by feel and discover too late that fees ate the margin. Two minutes here prevents that."
    },
    features: ["All Etsy fees modeled", "Net profit and margin %", "Break-even price", "Suggested price bands"],
    howTo: ["Enter your item price and unit cost.", "Add shipping charged and shipping cost.", "Toggle Offsite Ads if enrolled.", "Read your net profit and suggested bands."],
    faq: commonFaq
  },
  // ------------------------------------------------------------------ Compose
  {
    slug: "tag-generator",
    href: "/tools/etsy/tag-generator",
    name: "Tag Generator",
    category: "Compose",
    icon: Tags,
    oneLiner: "13 research-backed tags, ready to paste.",
    description: "Tags, materials, and styles for any seed keyword — each scored for competition and search volume — with price distribution and a 12-month trend.",
    status: "live",
    overview: {
      what: "Give the Tag Generator one seed keyword and it returns ranked tag candidates (plus materials and styles), each scored for competition and monthly search volume, alongside the niche's price distribution and 12-month seasonality curve.",
      why: "Tags are Etsy's primary ranking signal, and 13 slots is all you get. Filling them with scored, buyer-language terms instead of guesses is the single highest-leverage SEO action a seller can take."
    },
    features: [
      "Competition + volume score on every term",
      "Tags, materials, and styles tabs",
      "Price distribution across active listings",
      "12-month search trend with seasonality",
      "Trademark-risk warnings",
      "One-click copy of your 13 selected tags"
    ],
    howTo: [
      "Enter a seed keyword and pick a region.",
      "Sort the table and check the tags you want (13 max).",
      "Watch the copy box fill as you select.",
      "Hit Copy Tags and paste straight into Etsy."
    ],
    faq: [
      {
        q: "Why 13 tags?",
        a: "Etsy allows exactly 13 tags per listing. The copy box counts up to 13 so what you copy always fits."
      },
      {
        q: "What does the trademark warning mean?",
        a: "Terms that match well-known brands are flagged. Using them can get a listing deactivated — swap them for descriptive alternatives."
      },
      ...commonFaq
    ]
  },
  {
    slug: "title-generator",
    href: "/tools/etsy/title-generator",
    name: "Title Generator",
    category: "Compose",
    icon: Type,
    oneLiner: "High-CTR titles with your keywords built in.",
    description: "Generate keyword-rich Etsy titles from a product description plus your target keywords.",
    status: "live",
    overview: {
      what: "Title Generator combines your product details with target keywords into titles structured the way Etsy search rewards: strongest keyword first, natural phrasing, within the 140-character limit.",
      why: "The title is the second-strongest ranking field after tags — and the first thing a buyer reads."
    },
    features: ["Keyword-first structure", "140-character compliance", "Multiple variants per run", "CTR-oriented phrasing"],
    howTo: ["Describe your product in one line.", "Add 2–4 target keywords.", "Generate and compare variants.", "Copy the winner into Etsy."],
    faq: commonFaq
  },
  {
    slug: "description-generator",
    href: "/tools/etsy/description-generator",
    name: "Description Generator",
    category: "Compose",
    icon: FileText,
    oneLiner: "Descriptions that convert and rank.",
    description: "Conversion-focused descriptions with natural keyword placement, formatted for skimming.",
    status: "live",
    overview: {
      what: "Description Generator writes buyer-focused descriptions: benefits first, specifications in a scannable block, keywords placed naturally.",
      why: "Etsy indexes descriptions for search, and buyers skim them for trust signals. A structured description does both jobs."
    },
    features: ["Benefit-led opening", "Scannable spec block", "Natural keyword placement", "Tone presets"],
    howTo: ["Paste your product details.", "Pick a tone.", "Generate and edit inline.", "Copy into your listing."],
    faq: commonFaq
  },
  {
    slug: "listing-studio",
    href: "/tools/etsy/listing-studio",
    name: "Listing Studio",
    category: "Compose",
    icon: Sparkles,
    oneLiner: "Photo in, complete listing out.",
    description: "Upload product photos and build a complete listing — title, tags, description, attributes — in one guided flow.",
    status: "live",
    overview: {
      what: "Listing Studio takes product photos and walks you through one flow that produces every listing field, pre-filled and editable.",
      why: "Creating a listing from scratch touches five tools. Studio collapses them into one pass."
    },
    features: ["Photo-based product detection", "Title + tags + description in one flow", "Suggested attributes", "Send to Etsy-ready export"],
    howTo: ["Upload 1–3 product photos.", "Confirm the detected product type.", "Review each generated field.", "Export the complete listing."],
    faq: commonFaq
  },
  {
    slug: "video-generator",
    href: "/tools/etsy/video-generator",
    name: "Video Generator",
    category: "Compose",
    icon: Video,
    oneLiner: "Turn photos into a short listing video.",
    description: "Assemble product photos into a short listing video — listings with video convert measurably better.",
    status: "live",
    overview: {
      what: "Video Generator sequences your product photos into a short, motion-designed clip sized for Etsy's listing video slot.",
      why: "Etsy surfaces video prominently, and it answers buyer questions photos can't — scale, texture, movement."
    },
    features: ["Photo-to-video assembly", "Etsy-compliant dimensions", "Music-free output", "Draft preview before render"],
    howTo: ["Upload 3–6 photos.", "Choose a pacing preset.", "Preview the draft.", "Render and download."],
    faq: commonFaq
  },
  // -------------------------------------------------------------- Other tools
  {
    slug: "forge-ai",
    href: "/tools/forge-ai",
    name: "Forge AI",
    category: "Other tools",
    icon: MessageSquare,
    oneLiner: "An Etsy selling assistant that knows your data.",
    description: "Ask anything about Etsy SEO. Forge AI answers with guidance and can pull live numbers from the other tools.",
    status: "live",
    overview: {
      what: "Forge AI is a chat assistant trained on Etsy SEO practice, wired into the same data layer as every tool on this site.",
      why: "Sometimes you don't need another dashboard — you need a straight answer with your numbers in it."
    },
    features: ["Conversational SEO guidance", "Calls tool data mid-answer", "Saved conversations", "Action suggestions"],
    howTo: ["Open the chat.", "Ask in plain language.", "Let it pull tool data when useful.", "Save answers to a project."],
    faq: commonFaq
  },
  {
    slug: "keyword-generator",
    href: "/tools/keyword-generator",
    name: "Keyword Generator",
    category: "Other tools",
    icon: Lightbulb,
    oneLiner: "Buyer-intent keywords with volume and competition.",
    description: "Discover the phrases real buyers type, grouped by intent and scored for volume and competition.",
    status: "live",
    overview: {
      what: "Keyword Generator expands one seed term into the long-tail phrases buyers actually search, grouped by intent (gift, occasion, style, personalized) and scored.",
      why: "Buyer-intent long-tails convert better and rank easier than broad head terms — they're where new listings win."
    },
    features: ["Intent grouping", "Volume + competition on every phrase", "Region-aware results", "Send phrases to Tag Generator"],
    howTo: ["Enter a seed keyword.", "Pick a region.", "Filter by intent.", "Send winners to the Tag Generator."],
    faq: commonFaq
  },
  {
    slug: "prompt-improver",
    href: "/tools/prompt-improver",
    name: "Prompt Improver",
    category: "Other tools",
    icon: Wand2,
    oneLiner: "Sharper prompts, better AI output.",
    description: "Rewrites a rough prompt into a precise one — useful for every AI tool on this site and beyond.",
    status: "live",
    overview: {
      what: "Prompt Improver restructures a rough instruction into a precise, complete prompt: role, context, constraints, format.",
      why: "The output quality of every AI tool tracks the input quality. This is the cheapest upgrade available."
    },
    features: ["Structure-aware rewriting", "Before/after view", "Reusable prompt library", "Works with any AI tool"],
    howTo: ["Paste your rough prompt.", "Review the structured rewrite.", "Tweak the constraints.", "Copy and use anywhere."],
    faq: commonFaq
  },
  {
    slug: "ebay-tools",
    href: "/tools/ebay",
    name: "eBay Tools",
    category: "Other tools",
    icon: BarChart3,
    oneLiner: "The same research toolkit, for eBay.",
    description: "Keyword, listing, and trend research for eBay sellers — built on the same provider architecture. Phase 2.",
    status: "soon",
    overview: {
      what: "The eBay suite reuses the marketplace adapter behind the Etsy tools, pointed at eBay's catalog and search data.",
      why: "Multi-channel sellers shouldn't need two subscriptions for one research workflow."
    },
    features: ["Shared research workflow", "eBay data adapter", "Cross-marketplace comparison", "Unified projects"],
    howTo: ["Pick an eBay tool.", "Search as you would for Etsy.", "Compare across marketplaces.", "Save to shared projects."],
    faq: commonFaq
  }
];

export const CATEGORIES: ToolCategory[] = ["Brainstorm", "Analyze", "Compose", "Other tools"];

export function toolBySlug(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function toolsByCategory(cat: ToolCategory): ToolDef[] {
  return TOOLS.filter((t) => t.category === cat);
}
