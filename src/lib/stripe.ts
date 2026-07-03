import Stripe from "stripe";
import { Plan } from "@/lib/auth";

/**
 * Env-gated billing. With no STRIPE_SECRET_KEY the app runs free-tier only
 * and the pricing buttons explain what's missing. To go live:
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *   STRIPE_PRICE_BUSINESS, STRIPE_PRICE_ENTERPRISE  (recurring price IDs)
 * Webhook endpoint: /api/stripe/webhook (checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted).
 */
export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export function priceForPlan(plan: Plan): string | null {
  if (plan === "BUSINESS") return process.env.STRIPE_PRICE_BUSINESS ?? null;
  if (plan === "ENTERPRISE") return process.env.STRIPE_PRICE_ENTERPRISE ?? null;
  return null;
}

export function planForPrice(priceId: string): Plan | null {
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return "BUSINESS";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "ENTERPRISE";
  return null;
}
