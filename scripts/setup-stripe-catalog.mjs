#!/usr/bin/env node
/**
 * One-time Stripe catalog setup for APIDiffGuard.
 *
 * Requires STRIPE_SECRET_KEY in the environment.
 * Creates Products + monthly Prices with lookup keys used by checkout/webhooks:
 *   - apidiffguard_starter_monthly ($19)
 *   - apidiffguard_pro_monthly ($49)
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe-catalog.mjs
 */

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first.");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });

const catalog = [
  {
    name: "APIDiffGuard Starter",
    description: "20 endpoints, scheduled checks, Slack + email",
    lookup_key: "apidiffguard_starter_monthly",
    unit_amount: 1900,
  },
  {
    name: "APIDiffGuard Pro",
    description: "100 endpoints, unlimited baselines, CLI, webhooks",
    lookup_key: "apidiffguard_pro_monthly",
    unit_amount: 4900,
  },
];

async function ensurePrice(item) {
  const existing = await stripe.prices.list({
    lookup_keys: [item.lookup_key],
    active: true,
    limit: 1,
  });
  if (existing.data[0]) {
    console.log(`OK  ${item.lookup_key} → ${existing.data[0].id}`);
    return existing.data[0];
  }

  const product = await stripe.products.create({
    name: item.name,
    description: item.description,
    metadata: { app: "apidiffguard", lookup_key: item.lookup_key },
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: item.unit_amount,
    recurring: { interval: "month" },
    lookup_key: item.lookup_key,
    metadata: { app: "apidiffguard", plan: item.lookup_key },
  });

  console.log(`NEW ${item.lookup_key} → ${price.id} (product ${product.id})`);
  return price;
}

for (const item of catalog) {
  await ensurePrice(item);
}

console.log("\nDone. Enable Customer Portal in Stripe Dashboard → Settings → Billing.");
console.log("Webhook: POST /api/webhooks/stripe");
console.log(
  "Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed"
);
