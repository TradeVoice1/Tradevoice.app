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
