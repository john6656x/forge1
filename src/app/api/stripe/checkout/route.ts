import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { priceForPlan, stripe, stripeEnabled } from "@/lib/stripe";

const schema = z.object({ plan: z.enum(["BUSINESS", "ENTERPRISE"]) });

export async function POST(req: NextRequest) {
  if (!stripeEnabled()) {
    return NextResponse.json(
      { error: "STRIPE_DISABLED", message: "Billing isn't configured yet (set STRIPE_SECRET_KEY and price IDs). The free tier keeps working." },
      { status: 503 }
    );
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED", message: "Sign in first." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const price = priceForPlan(parsed.data.plan);
  if (!price) return NextResponse.json({ error: "PRICE_MISSING", message: `Set STRIPE_PRICE_${parsed.data.plan}.` }, { status: 503 });

  const origin = req.nextUrl.origin;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan: parsed.data.plan },
    subscription_data: { metadata: { userId: user.id, plan: parsed.data.plan } },
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`
  });
  return NextResponse.json({ url: session.url });
}
