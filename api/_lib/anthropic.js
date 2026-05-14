// Shared Anthropic Claude client used by AI-powered endpoints.
//
// Pinned model alias so a future SDK bump doesn't silently route us to
// an older or pricier tier. The current sweet spot for vision + structured
// JSON output is Sonnet — fast enough for interactive UI (~3-8s for a
// typical 1-2 page rate sheet) and an order of magnitude cheaper than Opus.
//
// Set ANTHROPIC_API_KEY in Vercel env vars (Production + Preview). The
// SDK reads it from the env automatically; we pass it explicitly here
// so a missing key fails loudly at module load instead of buried in a
// network error 30 seconds later.

import Anthropic from "@anthropic-ai/sdk";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) {
  console.warn('[anthropic] Missing ANTHROPIC_API_KEY — set it in Vercel env vars.');
}

let _client = null;
export function getAnthropic() {
  if (!_client) _client = new Anthropic({ apiKey: KEY || 'sk-ant-placeholder' });
  return _client;
}

// Default model alias. Use a stable alias rather than a date-stamped
// version so we don't have to ship a code update every time Anthropic
// rolls a new minor revision.
export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
