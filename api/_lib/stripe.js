// Shared Stripe SDK instance for all Vercel serverless functions.
// Pinned API version so a Stripe SDK upgrade doesn't silently change shape.

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.warn('[stripe] Missing STRIPE_SECRET_KEY — set it in Vercel env vars.');
}

export const stripe = new Stripe(key || 'sk_placeholder', {
  apiVersion: '2024-12-18.acacia',
  typescript: false,
});

// 1.0% Tradevoice platform fee, charged on top of Stripe's processing.
// Customer pays the full inflated total, contractor receives the original
// invoice amount, Stripe takes 2.9% + $0.30, Tradevoice takes 1.0%.
export const PLATFORM_FEE_PCT = 0.01;

// Compute the application_fee_amount in cents for a given invoice total.
// Stripe expects integer cents; rounds half-up to the nearest cent.
export function platformFeeCents(invoiceTotalDollars) {
  return Math.round(invoiceTotalDollars * 100 * PLATFORM_FEE_PCT);
}
