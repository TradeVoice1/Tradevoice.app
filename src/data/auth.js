// Auth + profile helpers — thin wrappers over supabase-js.
// Keep components free of supabase calls; if we ever swap the backend, only this file changes.

import { supabase } from "../supabase";

// ── Profile shape ────────────────────────────────────────────────────────────
// The DB column names use snake_case (Postgres convention); the front-end expects
// camelCase. These two helpers convert between the two.

const dbToProfile = (row) => row && ({
  id:               row.id,
  name:             row.name              ?? '',
  company:          row.company           ?? '',
  phone:            row.phone             ?? '',
  trades:           row.trades            ?? [],
  specialtyTypes:   row.specialty_types   ?? [],
  workType:         row.work_type         ?? '',
  states:           row.states            ?? [],
  state:            (row.states ?? []).join(', '),
  tagline:          row.tagline           ?? '',
  license:          row.license           ?? '',
  // Per-state license numbers (migration 0037). Map of state name →
  // license number. Used when the contractor operates in multiple
  // states and needs different license credentials per state.
  // Falls back to the single `license` field above for any state
  // not explicitly mapped.
  stateLicenses:    row.state_licenses    ?? {},
  // AI Scope Analyzer one-time consent (migration 0038). NULL until
  // the contractor agrees to the AI advisory-only / verify-before-
  // using / no-liability terms in the consent modal. After agreement
  // the field holds the ISO timestamp of consent. The Terms section
  // 10 ("AI-Assisted Features") is the underlying legal document
  // they're agreeing to.
  aiScopeTermsAcceptedAt: row.ai_scope_terms_accepted_at ?? null,
  accentColor:      row.accent_color      ?? '',
  defaultTerms:     row.default_terms     ?? '',
  plan:             row.plan              ?? '',
  role:             row.role              ?? 'owner',
  companyCode:      row.company_code      ?? '',
  acceptedTermsAt:  row.accepted_terms_at ?? null,
  logoUrl:          row.logo_url          ?? null,
  reviewLink:       row.review_link       ?? '',
  // Certificate of Insurance — commercial AP departments require this on
  // invoices before processing payment (migration 0024).
  coiCarrier:           row.coi_carrier              ?? '',
  coiPolicyNumber:      row.coi_policy_number        ?? '',
  coiExpiresAt:         row.coi_expires_at           ?? '',
  // Default late-fee policy text — pre-fills new invoices; can be
  // overridden per invoice. "1.5% per month after Net 30" style.
  defaultLateFeePolicy: row.default_late_fee_policy  ?? '',
  // Invoice markup disclosure (migration 0041). false = fold markup into the
  // Materials & Parts total like the quote does; true = show it as its own
  // line item. Defaults to the discreet behavior.
  showMarkupLine:       row.show_markup_line         ?? false,
  payments:         row.payments          ?? {},
  taxRates:         row.tax_rates         ?? {},
  // Social-media handles (migration 0027) — Facebook / X / Instagram /
  // TikTok. Stored as an open-ended JSONB so adding new platforms later
  // doesn't require a migration. Values can be either a full URL or just
  // the bare handle; the renderer normalizes when building public links.
  // Same render contract as payments: only show what's filled in.
  socialHandles:    row.social_handles    ?? {},
  // Stripe Connect (migration 0013). Null until the contractor finishes the
  // OAuth handshake; charges_enabled flips true once Stripe verifies their
  // account can accept charges (driven by the account.updated webhook).
  stripe_account_id:              row.stripe_account_id              ?? null,
  stripe_account_charges_enabled: row.stripe_account_charges_enabled ?? false,
  // Stripe Subscription (migration 0015). Tradevoice → contractor billing.
  // Null until they add a card; status reflects Stripe's own lexicon
  // (trialing | active | past_due | canceled | unpaid | incomplete).
  stripe_customer_id:             row.stripe_customer_id             ?? null,
  stripe_subscription_id:         row.stripe_subscription_id         ?? null,
  stripe_payment_method_id:       row.stripe_payment_method_id       ?? null,
  trial_ends_at:                  row.trial_ends_at                  ?? null,
  subscription_status:             row.subscription_status            ?? 'trialing',
  // True while a cancellation is scheduled but the paid period hasn't ended
  // (migration 0035, kept current by the Stripe webhook). Drives the
  // "Resume Subscription" button in Settings → Billing.
  cancel_at_period_end:            row.cancel_at_period_end           ?? false,
  createdAt:        row.created_at        ?? null,    // when the profile row was inserted (≈ signup time) — used for trial countdown
  // Founder / super-owner flag (migration 0030). True only for the
  // single Tradevoice founder account, which is created directly via
  // the Supabase Auth dashboard and exempt from the billing gates
  // (no Stripe customer, no subscription, no trial countdown).
  isSuperOwner:     row.is_super_owner    ?? false,
  // TOTP enrollment + most-recent unlock timestamp (Phase 2). Used
  // by App.jsx to decide whether to render the TOTP setup screen,
  // the TOTP unlock prompt, or pass straight through to the
  // dashboard. NEVER read super_owner_totp_secret here — that field
  // stays server-side, fetched only by the setup Edge Function and
  // returned exactly once.
  superOwnerTotpEnabledAt: row.super_owner_totp_enabled_at ?? null,
  superOwnerUnlockAt:      row.super_owner_unlock_at       ?? null,
});

// camelCase profile key → DB column, with the empty-value each column wants
// when the caller passes it explicitly as null/undefined.
//
// CRITICAL: only keys PRESENT in the patch are written. The previous version
// built the full row with `?? null` defaults and then tried to strip
// `undefined` keys — but the `??` had already converted every missing field
// to null, so the strip was a no-op and EVERY partial save nulled every
// field the caller didn't mention.
//
// That silently wiped accepted_terms_at / plan / company_code whenever the
// settings autosave or the profile modal ran, which failed the
// profileIsComplete gate and threw paying customers back into the signup
// wizard — locked out of their own account with an active subscription.
// Found in smoke testing on 2026-07-26.
const PROFILE_COLUMNS = {
  name:                   ['name',                    null],
  company:                ['company',                 null],
  phone:                  ['phone',                   null],
  trades:                 ['trades',                  []],
  specialtyTypes:         ['specialty_types',         []],
  workType:               ['work_type',               null],
  states:                 ['states',                  []],
  tagline:                ['tagline',                 null],
  license:                ['license',                 null],
  stateLicenses:          ['state_licenses',          {}],
  aiScopeTermsAcceptedAt: ['ai_scope_terms_accepted_at', null],
  accentColor:            ['accent_color',            null],
  defaultTerms:           ['default_terms',           null],
  plan:                   ['plan',                    null],
  role:                   ['role',                    'owner'],
  companyCode:            ['company_code',            null],
  acceptedTermsAt:        ['accepted_terms_at',       null],
  logoUrl:                ['logo_url',                null],
  reviewLink:             ['review_link',             null],
  coiCarrier:             ['coi_carrier',             null],
  coiPolicyNumber:        ['coi_policy_number',       null],
  coiExpiresAt:           ['coi_expires_at',          null],
  defaultLateFeePolicy:   ['default_late_fee_policy', null],
  showMarkupLine:         ['show_markup_line',        false],
  payments:               ['payments',                null],
  taxRates:               ['tax_rates',               null],
  socialHandles:          ['social_handles',          {}],
};

const profileToDb = (p) => {
  const row = {};
  for (const [key, [column, empty]] of Object.entries(PROFILE_COLUMNS)) {
    if (!p || !(key in p)) continue;           // untouched by this caller — leave the column alone
    const val = p[key];
    // Empty string on a date column is not a valid timestamp; treat it as
    // "cleared" (previously handled by the `|| null` on coi_expires_at).
    if (val === undefined || val === null || (val === '' && column.endsWith('_at'))) {
      row[column] = empty;
    } else {
      row[column] = val;
    }
  }
  return row;
};

// ── Public API ───────────────────────────────────────────────────────────────

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function getProfile(userId, authEmail) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // For techs: look up the owner they belong to so the rest of the app
  // can write rows under the owner's owner_id (RLS enforces this via
  // migration 0016). Owners get effectiveOwnerId = their own id.
  let effectiveOwnerId = userId;
  if (data.role === 'tech') {
    const { data: tm } = await supabase
      .from('team_members')
      .select('owner_id, name, perms')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (tm?.owner_id) effectiveOwnerId = tm.owner_id;
  }
  return {
    ...dbToProfile(data),
    email: authEmail ?? '',
    effectiveOwnerId,
  };
}

export async function upsertProfile(userId, patch) {
  // profileToDb only emits columns the caller actually passed, so a partial
  // save can never clobber fields it didn't mention. See PROFILE_COLUMNS.
  const dbPatch = profileToDb(patch);
  if (Object.keys(dbPatch).length === 0) {
    // Nothing to write — return the current row rather than issuing an empty
    // UPDATE (which would match 0 columns and fall through to a duplicate INSERT).
    const { data: current } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    const { data: { user: cu } } = await supabase.auth.getUser();
    return current ? { ...dbToProfile(current), email: cu?.email ?? '' } : null;
  }

  // Try UPDATE first — covers the common case where the handle_new_user
  // trigger has already created a profile row for this auth user.
  // Use maybeSingle() instead of single() so 0 rows doesn't throw "Cannot
  // coerce the result to a single JSON object" — it returns null and we
  // fall through to the INSERT path below.
  let { data, error } = await supabase
    .from('profiles')
    .update(dbPatch)
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;

  // 0 rows returned from the UPDATE means there's no profile row for this
  // user. Two scenarios:
  //   1. The handle_new_user trigger didn't fire / errored during signUp
  //      (rare, but observed during testing 2026-05-19).
  //   2. The profile row was deleted and the user is rebuilding.
  // Either way, INSERT one now so the calling signup flow can complete.
  // We explicitly set id = userId so the row aligns with the auth.users
  // record. RLS allows inserting your own profile (auth.uid() = id).
  if (!data) {
    const { data: inserted, error: insErr } = await supabase
      .from('profiles')
      .insert({ id: userId, ...dbPatch })
      .select()
      .single();
    if (insErr) throw insErr;
    data = inserted;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return { ...dbToProfile(data), email: user?.email ?? '' };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

// Tech sign-in: takes the Tech ID (e.g. TV-T-K3M9R7) the owner shared and
// converts it to the synthetic email Supabase auth was registered with.
// No DB lookup needed pre-auth — the email is deterministic from the ID.
export async function techSignIn(techId, password) {
  const trimmed = String(techId).trim().toUpperCase();
  if (!/^TV-T-[A-Z0-9]{6}$/.test(trimmed)) {
    throw new Error('Tech ID should look like TV-T-XXXXXX. Check the ID your employer gave you.');
  }
  const body = trimmed.replace(/^TV-T-/, '').toLowerCase();
  const email = `tech-${body}@tradevoice.app`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

// Tech changes their password (used on first login + later from settings).
// Calls supabase.auth.updateUser, then flips must_change_password on the
// team_members row so the prompt doesn't recur.
export async function techChangePassword(techMemberId, newPassword) {
  const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
  if (pwErr) throw pwErr;
  const { error: memErr } = await supabase
    .from('team_members')
    .update({ must_change_password: false })
    .eq('id', techMemberId);
  if (memErr) throw memErr;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // If "Confirm email" is enabled in Supabase, data.session is null and the
  // user must click the link before they can sign in. Caller handles that case.
  return { user: data.user, session: data.session };
}

// ── Google OAuth sign-in ─────────────────────────────────────────────────────
// Hands the browser off to Google's authorization screen. Supabase's
// signInWithOAuth helper builds the right URL, kicks off the redirect,
// and on return exchanges the code for a session automatically.
//
// Setup required (one-time, in dashboards — not code):
//   1. Google Cloud Console → APIs & Services → Credentials → create
//      OAuth 2.0 Client ID (Web application). Authorized redirect URI
//      must be the Supabase callback:
//        https://<project>.supabase.co/auth/v1/callback
//   2. Supabase Dashboard → Authentication → Providers → Google → enable.
//      Paste the Google Client ID + Client Secret.
//
// After auth, Supabase redirects to redirectTo (defaults to the app
// origin), the onAuthChange listener picks up the new session, and the
// allowlist gate in App.jsx enforces private-preview by signing out any
// non-allowlisted Google user.
export async function signInWithGoogle({ redirectTo } = {}) {
  const target = redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: target,
      // Pre-select an account if the user is already signed into multiple.
      // Helps the "I want to use my work Gmail" UX without forcing it.
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  });
  if (error) throw error;
  // signInWithOAuth doesn't return a session synchronously — it triggers
  // a full-page redirect to Google. The session comes back through the
  // onAuthChange listener after Google's callback hits Supabase.
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Two-factor authentication (TOTP via authenticator apps) ─────────────────
// Wraps supabase.auth.mfa.*. TOTP only — free on our plan, works offline,
// and immune to SIM-swap (unlike SMS codes). The founder account has its own
// separate TOTP gate (superOwnerTotp); this is the per-user opt-in version.

// All TOTP factors on the signed-in account, split by verification status.
export async function listMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const all = data?.all ?? [];
  return {
    verified:   all.filter(f => f.factor_type === 'totp' && f.status === 'verified'),
    unverified: all.filter(f => f.factor_type === 'totp' && f.status !== 'verified'),
  };
}

// Begin TOTP enrollment. Cleans up any stale unverified factor first — a
// half-finished setup otherwise blocks re-enrollment with a name conflict.
// Returns { factorId, uri, secret }: uri feeds the QR code, secret is the
// "can't scan? type this instead" key.
export async function enrollTotp() {
  const { unverified } = await listMfaFactors();
  for (const f of unverified) {
    await supabase.auth.mfa.unenroll({ factorId: f.id }).catch(() => {});
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' });
  if (error) throw error;
  return { factorId: data.id, uri: data.totp?.uri || '', secret: data.totp?.secret || '' };
}

// Verify a 6-digit code. The same challenge+verify pair completes BOTH the
// enrollment flow and the at-sign-in challenge; success upgrades the session
// to AAL2.
export async function verifyTotp(factorId, code) {
  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr) throw chErr;
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: String(code).trim() });
  if (error) throw error;
  return true;
}

export async function unenrollTotp(factorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

// Does the current session still owe a 2FA code? True when the account has a
// verified factor (nextLevel aal2) but this session only completed the
// password step (currentLevel aal1). Token refreshes keep AAL2, so this only
// triggers on fresh sign-ins — not every page load.
export async function needsMfaChallenge() {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return false;
    return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
  } catch { return false; }
}

// Convenience: subscribe to auth changes (sign-in/out across tabs, token refresh, etc.)
//
// CRITICAL: never run Supabase calls (getProfile, getSession, signOut, …)
// directly inside the onAuthStateChange callback. supabase-js fires this while
// it is still settling the sign-in, so an in-callback DB/auth call can stall
// the signInWithPassword promise — handleLogin then never navigates and the
// user is stuck on "Signing in…" until they manually refresh (the session was
// already written to localStorage, which is why a refresh logs them in). The
// fix is to hand the work off to a fresh macrotask so the callback returns
// immediately and the auth library can finish.
export function onAuthChange(handler) {
  const timers = new Set();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const sessionUser = session?.user ?? null;
    const t = setTimeout(() => { timers.delete(t); handler(sessionUser); }, 0);
    timers.add(t);
  });
  return () => {
    timers.forEach(clearTimeout);
    timers.clear();
    data.subscription.unsubscribe();
  };
}
