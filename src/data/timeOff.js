// Tech time-off / availability blocks. RLS scopes to the owner;
// techs can read their own rows for a future "my time off" view.

import { supabase } from "../supabase";

const dbToTimeOff = (r) => ({
  id:         r.id,
  techUserId: r.tech_user_id ?? null,
  techName:   r.tech_name    ?? '',
  startDate:  r.start_date   ?? '',
  endDate:    r.end_date     ?? '',
  reason:     r.reason       ?? '',
  createdAt:  r.created_at   ?? null,
});

const toDb = (t) => ({
  tech_user_id: t.techUserId ?? null,
  tech_name:    t.techName   ?? null,
  start_date:   t.startDate,
  end_date:     t.endDate,
  reason:       t.reason     ?? null,
});

export async function listTimeOff() {
  const { data, error } = await supabase
    .from('time_off')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToTimeOff);
}

export async function upsertTimeOff(ownerId, t) {
  const dbRow = toDb(t);
  const looksLikeUuid = typeof t.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.id);

  if (looksLikeUuid) {
    const { data, error } = await supabase
      .from('time_off')
      .update(dbRow)
      .eq('id', t.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return dbToTimeOff(data);
  }

  const { data, error } = await supabase
    .from('time_off')
    .insert({ owner_id: ownerId, ...dbRow })
    .select()
    .single();
  if (error) throw error;
  return dbToTimeOff(data);
}

export async function deleteTimeOff(id) {
  const { error } = await supabase.from('time_off').delete().eq('id', id);
  if (error) throw error;
}

// Quick lookup: is a specific tech off on a given yyyy-mm-dd date?
// Used by the AddJobModal (disable tech in dropdown) and the drag-reschedule
// handler (warn before moving a job onto an off-day).
export function isTechOffOn(timeOff, techUserId, isoDate) {
  if (!techUserId || !isoDate) return false;
  return timeOff.some(t =>
    t.techUserId === techUserId &&
    isoDate >= t.startDate &&
    isoDate <= t.endDate
  );
}

// Return the time-off entries that overlap the visible week — used by the
// sidebar to show "Off Mar 12–15" tags under each tech.
export function timeOffInRange(timeOff, techUserId, startIso, endIso) {
  return timeOff.filter(t =>
    t.techUserId === techUserId &&
    t.endDate >= startIso &&
    t.startDate <= endIso
  );
}
