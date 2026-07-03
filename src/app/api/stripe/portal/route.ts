import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, stripeEnabled } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!stripeEnabled()) return NextResponse.json({ error: "STRIPE_DISABLED", message: "Billing isn't configured yet." }, { status: 503 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const sub = await prisma.subscription.findFirst({
    where: { userId: user.id, stripeCustomerId: { not: null } },
    orderBy: { updatedAt: "desc" }
  });
  if (!sub?.stripeCustomerId) return NextResponse.json({ error: "NO_CUSTOMER", message: "No billing profile yet — upgrade first." }, { status: 404 });

  const portal = await stripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${req.nextUrl.origin}/settings`
  });
  return NextResponse.json({ url: portal.url });
}
