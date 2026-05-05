// Jobs data layer (the schedule). `date` is a timestamptz in DB, ISO string on the wire.

import { supabase } from "../supabase";

const dbToJob = (r) => ({
  id:         r.id,
  clientId:   r.client_id     ?? null,
  invoiceId:  r.invoice_id    ?? null,
  techUserId: r.tech_user_id  ?? null,
  planId:     r.plan_id       ?? null,
  title:      r.title         ?? '',
  address:    r.address       ?? '',
  phone:      r.phone         ?? '',
  date:       r.date ? new Date(r.date) : new Date(),
  startHour:  r.start_hour    ?? 9,
  duration:   r.duration      ?? 1,
  status:     r.status        ?? 'scheduled',
  trade:      r.trade         ?? '',
  notes:      r.notes         ?? '',
  photos:     Array.isArray(r.photos) ? r.photos : [],
});

const jobToDb = (j) => ({
  // UUID FKs — coerce empty string to null so Postgres doesn't reject the insert.
  client_id:     j.clientId   || null,
  invoice_id:    j.invoiceId  || null,
  tech_user_id:  j.techUserId || null,
  plan_id:       j.planId     || null,
  title:         j.title      ?? null,
  address:       j.address    ?? null,
  phone:         j.phone      ?? null,
  date:          j.date instanceof Date ? j.date.toISOString() : (j.date ?? null),
  start_hour:    j.startHour  ?? null,
  duration:      j.duration   ?? null,
  status:        j.status     ?? 'scheduled',
  trade:         j.trade      ?? null,
  notes:         j.notes      ?? null,
  photos:        Array.isArray(j.photos) ? j.photos : [],
});

export async function listJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToJob);
}

export async function upsertJob(ownerId, job) {
  const dbRow = jobToDb(job);
  const looksLikeUuid = typeof job.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id);

  if (looksLikeUuid) {
    const { data, error } = await supabase
      .from('jobs')
      .update(dbRow)
      .eq('id', job.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return dbToJob(data);
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({ owner_id: ownerId, ...dbRow })
    .select()
    .single();
  if (error) throw error;
  return dbToJob(data);
}

export async function deleteJob(id) {
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw error;
}
