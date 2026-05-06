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
  accentColor:      row.accent_color      ?? '',
  defaultTerms:     row.default_terms     ?? '',
  plan:             row.plan              ?? '',
  role:             row.role              ?? 'owner',
  companyCode:      row.company_code      ?? '',
  acceptedTermsAt:  row.accepted_terms_at ?? null,
  logoUrl:          row.logo_url          ?? null,
  payments:         row.payments          ?? {},
  taxRates:         row.tax_rates         ?? {},
  // Stripe Connect (migration 0013). Null until the contractor finishes the
  // OAuth handshake; charges_enabled flips true once Stripe verifies their
  // account can accept charges (driven by the account.updated webhook).
  stripe_account_id:              row.stripe_account_id              ?? null,
  stripe_account_charges_enabled: row.stripe_account_charges_enabled ?? false,
  createdAt:        row.created_at        ?? null,    // when the profile row was inserted (≈ signup time) — used for trial countdown
});

const profileToDb = (p) => ({
  name:               p.name              ?? null,
  company:            p.company           ?? null,
  phone:              p.phone             ?? null,
  trades:             p.trades            ?? [],
  specialty_types:    p.specialtyTypes    ?? [],
  work_type:          p.workType          ?? null,
  states:             p.states            ?? [],
  tagline:            p.tagline           ?? null,
  license:            p.license           ?? null,
  accent_color:       p.accentColor       ?? null,
  default_terms:      p.defaultTerms      ?? null,
  plan:               p.plan              ?? null,
  role:               p.role              ?? 'owner',
  company_code:       p.companyCode       ?? null,
  accepted_terms_at:  p.acceptedTermsAt   ?? null,
  logo_url:           p.logoUrl           ?? null,
  payments:           p.payments,
  tax_rates:          p.taxRates,
});

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
  return { ...dbToProfile(data), email: authEmail ?? '' };
}

export async function upsertProfile(userId, patch) {
  // Drop undefined keys so we don't null out fields the caller didn't intend to touch.
  const dbPatch = profileToDb(patch);
  Object.keys(dbPatch).forEach(k => dbPatch[k] === undefined && delete dbPatch[k]);

  const { data, error } = await supabase
    .from('profiles')
    .update(dbPatch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Convenience: subscribe to auth changes (sign-in/out across tabs, token refresh, etc.)
export function onAuthChange(handler) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}
