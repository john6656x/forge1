import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { etsyOAuthGet } from "@/lib/etsy-oauth";
import { gradeListing } from "@/lib/grades";

interface EtsyShop {
  shop_id: number;
  shop_name: string;
  listing_active_count: number;
  transaction_sold_count: number;
  review_count: number;
  review_average?: number;
  num_favorers: number;
  url: string;
}
interface OwnListing {
  listing_id: number;
  title: string;
  state: string;
  quantity: number;
  views?: number;
  num_favorers: number;
  tags?: string[];
  description?: string;
  images?: unknown[];
  price: { amount: number; divisor: number };
  url: string;
}

/**
 * The connected seller's own shop + listings (drafts and inactive included —
 * that's what OAuth unlocks vs. the public API). Each listing carries a
 * tagCount + quick-audit ref so the dashboard can deep-link into the tools.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const conn = await prisma.etsyConnection.findUnique({ where: { userId: user.id } });
  if (!conn) return NextResponse.json({ connected: false });

  try {
    const shop = conn.shopId
      ? await etsyOAuthGet<EtsyShop>(conn.id, `/shops/${conn.shopId}`)
      : null;
    const listings = conn.shopId
      ? await etsyOAuthGet<{ count: number; results: OwnListing[] }>(conn.id, `/shops/${conn.shopId}/listings`, { limit: 50, includes: "Images" })
      : { count: 0, results: [] };

    return NextResponse.json({
      connected: true,
      shopName: conn.shopName ?? shop?.shop_name ?? "your shop",
      shop,
      // Bulk audit — every listing graded with the same 2026 engine as the
      // Listing Analyzer, weakest first: the "start here" list.
      listings: listings.results
        .map((l) => {
          const graded = gradeListing(l.title, l.tags ?? [], l.description ?? "", l.images?.length ?? 0);
          return {
            id: l.listing_id,
            title: l.title,
            state: l.state,
            views: l.views ?? 0,
            favorites: l.num_favorers ?? 0,
            tagCount: l.tags?.length ?? 0,
            price: l.price ? l.price.amount / l.price.divisor : 0,
            url: l.url,
            auditRef: String(l.listing_id),
            grade: graded.grade,
            score: graded.totalScore
          };
        })
        .sort((a, b) => a.score - b.score)
    });
  } catch (err) {
    return NextResponse.json({
      connected: true,
      shopName: conn.shopName,
      error: err instanceof Error ? err.message : "Etsy API error"
    }, { status: 502 });
  }
}
