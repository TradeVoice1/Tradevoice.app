// Super-owner (founder) dashboard data layer.
//
// Only the matthew@thetradevoice.com account (flagged is_super_owner = true
// per migration 0030) can call get_super_owner_accounts — the SECURITY
// DEFINER RPC checks the flag explicitly and returns NULL for anyone
// else. Migration 0031 adds the RPC; this module just wraps it and
// computes the derived fields the dashboard needs (trial-days-left,
// monthly revenue per account) so the component stays presentation-only.

import { supabase } from "../supabase";

// Plan pricing mirrors Stripe's price configuration (Solo / Pro / All).
// Kept here so MRR + per-account revenue calcs don't require a DB
// roundtrip to Stripe. If the contractor pricing model changes, update
// this map AND the Stripe Dashboard prices in lockstep.
export const PLAN_PRICES = {
  solo: 49.99,
  pro:  99.99,
  all:  149.99,
};
// Per-seat add-on. Anyone above the base plan's included seats gets
// charged this much per active team_member.
export const SEAT_PRICE = 19.99;
// Each plan's included seats — anything above this is billed per-seat.
// Solo = 1 (the owner), Pro = 3 total, All = 5 total. Adjust here
// when the plan structure changes.
const PLAN_INCLUDED_SEATS = { solo: 1, pro: 3, all: 5 };

// Statuses that should count toward MRR. Trialing accounts haven't
// been charged yet, so we EXCLUDE them — MRR is "money actually
// coming in this month." If you want a "potential MRR including
// trials" number later, compute it separately rather than mixing
// it into this metric.
const REVENUE_STATUSES = ['active'];

// Compute everything the dashboard needs in one pass so the component
// can stay dumb. Returns an array of account rows + a summary object.
export async function fetchSuperOwnerData() {
  const { data, error } = await supabase.rpc('get_super_owner_accounts');
  if (error) throw error;
  if (!data) {
    // RPC returns NULL when the caller isn't is_super_owner. Treat as
    // "no access" so the dashboard can show a clean unauthorized state
    // instead of crashing.
    return { accounts: [], summary: null, unauthorized: true };
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const accounts = (Array.isArray(data) ? data : []).map(r => {
    // Trial end falls back to created_at + 28 days for older accounts
    // where Stripe never stamped trial_ends_at. Mirrors the same
    // calculation App.jsx's trialInfo uses for consistency.
    const createdAt = r.profile_created_at ? new Date(r.profile_created_at) : null;
    const trialEnd  = r.trial_ends_at ? new Date(r.trial_ends_at)
                    : (createdAt ? new Date(createdAt.getTime() + 28 * dayMs) : null);
    const trialDaysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now) / dayMs) : null;

    // Monthly revenue calc: base plan price + per-seat overage on the
    // active seats above the plan's included count. Only counts toward
    // MRR when the subscription is in a REVENUE_STATUS.
    const basePrice    = PLAN_PRICES[r.plan] ?? 0;
    const included     = PLAN_INCLUDED_SEATS[r.plan] ?? 1;
    const billableSeats = Math.max(0, (r.active_seats ?? 0) - (included - 1));
    const seatPrice    = billableSeats * SEAT_PRICE;
    const monthlyRevenue = REVENUE_STATUSES.includes(r.subscription_status)
      ? (basePrice + seatPrice)
      : 0;

    return {
      id:                   r.id,
      email:                r.email || '(no email)',
      name:                 r.name || '',
      company:              r.company || '',
      plan:                 r.plan || '',
      role:                 r.role || 'owner',
      subscriptionStatus:   r.subscription_status || 'trialing',
      isSuperOwner:         !!r.is_super_owner,
      trialEndsAt:          trialEnd,
      trialDaysLeft,
      createdAt,
      lastSignInAt:         r.last_sign_in_at ? new Date(r.last_sign_in_at) : null,
      activeSeats:          r.active_seats ?? 0,
      monthlyRevenue,
      hasCard:              !!r.stripe_payment_method_id,
      stripeCustomerId:     r.stripe_customer_id || null,
      stripeSubscriptionId: r.stripe_subscription_id || null,
    };
  });

  // Summary tallies — computed client-side so adding a new metric
  // doesn't require a DB change. The full account list is already
  // in memory so this is cheap.
  const last24h = now - dayMs;
  const summary = {
    totalAccounts:    accounts.length,
    // Exclude the founder account from the customer count — it's not a
    // paying customer, just the admin handle, and counting it as one
    // makes the "0 customers" reality look like "1" on day one.
    customerCount:    accounts.filter(a => !a.isSuperOwner).length,
    activeCount:      accounts.filter(a => a.subscriptionStatus === 'active').length,
    trialingCount:    accounts.filter(a => a.subscriptionStatus === 'trialing' && !a.isSuperOwner).length,
    pastDueCount:     accounts.filter(a => a.subscriptionStatus === 'past_due').length,
    canceledCount:    accounts.filter(a => a.subscriptionStatus === 'canceled').length,
    // MRR sums the per-account monthlyRevenue. Currency is USD per the
    // pricing constants above.
    monthlyRevenue:   accounts.reduce((s, a) => s + a.monthlyRevenue, 0),
    // Activity last 24h — new signups + recent sign-ins.
    newSignups24h:    accounts.filter(a => a.createdAt && a.createdAt.getTime() >= last24h && !a.isSuperOwner).length,
    recentSignins24h: accounts.filter(a => a.lastSignInAt && a.lastSignInAt.getTime() >= last24h).length,
    // Trials about to expire — surfaces conversion-or-churn risk.
    trialsExpiringSoon: accounts.filter(a =>
      a.subscriptionStatus === 'trialing' && !a.isSuperOwner
      && a.trialDaysLeft != null && a.trialDaysLeft <= 7 && a.trialDaysLeft >= 0
    ).length,
  };

  return { accounts, summary, unauthorized: false };
}
