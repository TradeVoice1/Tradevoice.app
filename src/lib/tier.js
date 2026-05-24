// Tier helpers — single source of truth for "what can this user do?"
//
// The contractor's subscription tier (solo / pro / elite) determines
// which features unlock. Until 2026-05-22 the plan field on profiles
// existed but was never gated against — every account could use
// every feature. This helper centralizes the tier→features mapping
// so a future pricing change (or A/B test) only touches one file.
//
// Tier resolution:
//   • Founder account (isSuperOwner = true) → treated as 'elite' so the
//     founder can dogfood every feature without paying themselves.
//   • Tech accounts inherit the owner's tier (the owner is the paying
//     party; techs are seats on that subscription). Resolved via
//     effectiveOwnerId in callers that need it.
//   • Plan slug variants ('solo' vs 'solo_yearly') normalize to the
//     same base tier — yearly is just a billing cadence, not a
//     feature tier.

export const TIERS = ['solo', 'pro', 'elite'];

// Normalize the plan slug into one of TIERS. Returns 'solo' as the
// fallback for unknown / missing values so legacy accounts and trial
// users (who haven't picked a paid plan yet) see the baseline tier.
export function tierOf(user) {
  if (user?.isSuperOwner) return 'elite';
  const plan = String(user?.plan || '').toLowerCase().replace(/_yearly$/, '');
  if (plan === 'all')   return 'elite';
  if (plan === 'pro')   return 'pro';
  if (plan === 'solo')  return 'solo';
  return 'solo'; // sensible default for trial / unknown
}

// Per-tier capability map. Each tier inherits the previous tier's
// capabilities and adds its own — the spread pattern makes it easy
// to scan "what's new at Pro?" without reading the whole table.
const SOLO_CAPS = {
  maxTrades:               1,
  maxStates:               1,
  includedTechSeats:       0,
  hasMarketingReviewRequests: true,   // baseline — every tier
  hasMarketingCampaigns:   false,     // Pro+
  hasMultiStateLicenses:   false,     // Elite only
  hasRecurringPlans:       true,      // baseline — service contracts are core
  hasJobPhotos:            true,
  hasInvoicePayments:      true,
  // Aspirational features (build later) — surfaced here so the UI
  // can render "coming soon" badges in the right tier.
  hasAiQuoteDrafting:      false,
  hasWhiteLabelPortal:     false,
  hasApiAccess:            false,
  hasBulkImport:           false,
  hasAdvancedReporting:    false,
};

const PRO_CAPS = {
  ...SOLO_CAPS,
  maxTrades:               3,
  maxStates:               1,
  includedTechSeats:       1,
  hasMarketingCampaigns:   true,
  hasAdvancedReporting:    true,
};

const ELITE_CAPS = {
  ...PRO_CAPS,
  maxTrades:               56,        // all of them
  maxStates:               50,        // all US states + DC
  includedTechSeats:       2,
  hasMultiStateLicenses:   true,
  hasAiQuoteDrafting:      true,      // ✓ shipped 2026-05-22 (Claude + Perplexity)
  hasWhiteLabelPortal:     true,      // when built
  hasApiAccess:            true,      // when built
  hasBulkImport:           true,      // when built
};

const CAPS = { solo: SOLO_CAPS, pro: PRO_CAPS, elite: ELITE_CAPS };

// Return the capability map for the user's current tier. Use this
// instead of switching on tierOf() inside components — keeps the
// gating logic readable and testable.
export function caps(user) {
  return CAPS[tierOf(user)] || SOLO_CAPS;
}

// Shorthand for "can this user use this feature?" — usage:
//   if (!can(user, 'hasMarketingCampaigns')) return <UpgradePrompt to="pro" />;
export function can(user, feature) {
  const c = caps(user);
  return !!c[feature];
}

// Tier display name (for upgrade prompts, etc.)
export function tierLabel(tier) {
  if (tier === 'pro')   return 'Pro';
  if (tier === 'elite') return 'Elite';
  return 'Solo';
}

// Minimum tier required for a given feature. Used by upgrade prompts
// to render "Upgrade to Pro to unlock marketing campaigns" instead
// of generic "upgrade your plan."
export function minTierFor(feature) {
  if (ELITE_CAPS[feature] && !PRO_CAPS[feature])  return 'elite';
  if (PRO_CAPS[feature]   && !SOLO_CAPS[feature]) return 'pro';
  return 'solo';
}
