// Team members. Owner manages their crew; members can read their own row (RLS handles it).

import { supabase } from "../supabase";

const dbToMember = (r) => ({
  id:                  r.id,
  userId:              r.user_id ?? null,
  name:                r.name    ?? '',
  email:               r.email   ?? '',
  role:                r.role    ?? 'tech',
  trades:              r.trades  ?? [],
  status:              r.status  ?? 'pending',
  perms:               r.perms   ?? {},
  // Owner-issued tech onboarding fields (migration 0010)
  techId:              r.tech_id ?? null,
  branch:              r.branch  ?? '',
  phone:               r.phone   ?? '',
  mustChangePassword:  r.must_change_password ?? false,
});

const memberToDb = (m) => ({
  // user_id is a uuid FK to auth.users — coerce empty string to null so a
  // pending invite (where userId is '') doesn't fail Postgres uuid validation.
  user_id:                m.userId || null,
  name:                   m.name   ?? null,
  email:                  m.email  ?? null,
  role:                   m.role   ?? 'tech',
  trades:                 m.trades ?? [],
  status:                 m.status ?? 'pending',
  perms:                  m.perms  ?? {},
  tech_id:                m.techId || null,
  branch:                 m.branch ?? null,
  phone:                  m.phone  ?? null,
  must_change_password:   m.mustChangePassword ?? false,
});

// ── Tech ID + password generators ────────────────────────────────────────────
// Tech IDs look like TV-T-K3M9R7 — easy to read aloud, hard to confuse 0/O/1/I.
// 6-char body × 32 chars = ~1B combinations. Uniqueness enforced at DB level.
const ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const PWD_CHARS = ID_CHARS + 'abcdefghjkmnpqrstuvwxyz';

const randStr = (len, chars) => {
  let out = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
};

const generateTechId  = () => `TV-T-${randStr(6, ID_CHARS)}`;
const generatePassword = () => randStr(8, PWD_CHARS);

// Synthetic email derived from tech_id. The tech doesn't have a real email —
// they sign in by Tech ID — but Supabase auth.users requires an email.
// Format: tech-<lowercase id without prefix>@tradevoice.app
// e.g. TV-T-K3M9R7 → tech-k3m9r7@tradevoice.app
export const techIdToSyntheticEmail = (techId) => {
  const body = String(techId).replace(/^TV-T-/i, '').toLowerCase();
  return `tech-${body}@tradevoice.app`;
};

export async function listTeam() {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToMember);
}

export async function upsertTeamMember(ownerId, member) {
  const dbRow = memberToDb(member);
  const looksLikeUuid = typeof member.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

  if (looksLikeUuid) {
    const { data, error } = await supabase
      .from('team_members')
      .update(dbRow)
      .eq('id', member.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return dbToMember(data);
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert({ owner_id: ownerId, ...dbRow })
    .select()
    .single();
  if (error) throw error;
  return dbToMember(data);
}

export async function deleteTeamMember(id) {
  const { error } = await supabase.from('team_members').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// createTechAccount — owner buys a seat and provisions a new tech account.
//
// Does three things atomically (well, best-effort):
//   1. Generates a unique Tech ID + initial password client-side.
//   2. Creates the Supabase auth.users row via signUp (with a synthetic
//      email derived from the Tech ID).
//   3. Inserts the team_members row linking the new auth user to the
//      owning master account, including all the tech profile data.
//
// Returns { techId, password, member } so the caller can show creds to
// the owner and they can write/copy them to share with the tech.
//
// IMPORTANT: requires "Confirm email" disabled in Supabase Auth settings,
// since the synthetic email isn't real. Without that, the auth user gets
// stuck in unconfirmed state and can never sign in.
// ─────────────────────────────────────────────────────────────────────────────
export async function createTechAccount(ownerId, profile) {
  // Save the owner's current session so we can restore it after the signUp
  // (which would otherwise auto-login as the new tech). This is the cleanest
  // workaround for the lack of a server-side admin API in the front-end.
  const { data: { session: ownerSession } } = await supabase.auth.getSession();

  // 1. Generate creds with retry on Tech ID collision (rare but possible).
  let techId = generateTechId();
  const password = generatePassword();
  let syntheticEmail = techIdToSyntheticEmail(techId);

  // 2. Create the auth user.
  let signUpError = null;
  let authUserId = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.auth.signUp({
      email: syntheticEmail,
      password,
      options: { data: { tradevoice_tech_id: techId, owner_id: ownerId } },
    });
    if (error) {
      // "User already registered" → bump the Tech ID and retry.
      if (/already/i.test(error.message)) {
        techId = generateTechId();
        syntheticEmail = techIdToSyntheticEmail(techId);
        continue;
      }
      signUpError = error;
      break;
    }
    authUserId = data.user?.id || null;
    break;
  }

  // While the session is briefly the new tech (right after signUp), patch the
  // auto-created profiles row to set role='tech' + name. The profiles RLS only
  // lets a user edit their OWN row, so this has to happen here, not after we
  // restore the owner session below.
  if (authUserId) {
    try {
      await supabase.from('profiles').update({
        role: 'tech',
        name: profile.name || 'Tech',
      }).eq('id', authUserId);
    } catch (e) {
      // Non-fatal — the tech can still sign in; their profile will just say
      // role='owner' until we fix it. Log so the developer notices.
      console.error('createTechAccount: profile patch failed', e);
    }
  }

  // Restore owner session — signUp flipped to the new tech user.
  if (ownerSession) {
    await supabase.auth.setSession({
      access_token:  ownerSession.access_token,
      refresh_token: ownerSession.refresh_token,
    });
  }

  if (signUpError) throw signUpError;
  if (!authUserId) throw new Error('Could not create tech account — Supabase signup failed.');

  // 3. Insert the team_members row.
  const dbRow = memberToDb({
    ...profile,
    techId,
    userId: authUserId,
    role:   'tech',
    status: 'active',
    mustChangePassword: true,
  });
  const { data: inserted, error: insertError } = await supabase
    .from('team_members')
    .insert({ owner_id: ownerId, ...dbRow })
    .select()
    .single();
  if (insertError) throw insertError;

  return {
    techId,
    password,
    syntheticEmail,
    member: dbToMember(inserted),
  };
}
