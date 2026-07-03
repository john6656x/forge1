import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { planForPrice, stripe, stripeEnabled } from "@/lib/stripe";

async function applySubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  const priceId = sub.items.data[0]?.price?.id ?? "";
  const plan = planForPrice(priceId) ?? (sub.metadata?.plan as "BUSINESS" | "ENTERPRISE" | undefined) ?? "BUSINESS";
  const active = sub.status === "active" || sub.status === "trialing";
  const periodEnd = sub.current_period_end;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      plan,
      status: sub.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null
    },
    update: {
      status: sub.status,
      plan,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null
    }
  });
  await prisma.user.update({ where: { id: userId }, data: { plan: active ? plan : "FREE" } });
}

export async function POST(req: NextRequest) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "STRIPE_DISABLED" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "NO_SIGNATURE" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "BAD_SIGNATURE" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.subscription) {
        const sub = await stripe().subscriptions.retrieve(session.subscription as string);
        await applySubscription(sub);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object);
      break;
  }
  return NextResponse.json({ received: true });
}
