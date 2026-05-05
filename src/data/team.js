// Team members. Owner manages their crew; members can read their own row (RLS handles it).

import { supabase } from "../supabase";

const dbToMember = (r) => ({
  id:      r.id,
  userId:  r.user_id ?? null,
  name:    r.name    ?? '',
  email:   r.email   ?? '',
  role:    r.role    ?? 'tech',
  trades:  r.trades  ?? [],
  status:  r.status  ?? 'pending',
  perms:   r.perms   ?? {},
});

const memberToDb = (m) => ({
  user_id: m.userId ?? null,
  name:    m.name   ?? null,
  email:   m.email  ?? null,
  role:    m.role   ?? 'tech',
  trades:  m.trades ?? [],
  status:  m.status ?? 'pending',
  perms:   m.perms  ?? {},
});

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
