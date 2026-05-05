// Recurring maintenance plans. RLS scopes to the owner.

import { supabase } from "../supabase";

const dbToPlan = (r) => ({
  id:                 r.id,
  clientId:           r.client_id ?? null,
  clientName:         r.client_name ?? '',
  title:              r.title ?? '',
  trade:              r.trade ?? '',
  frequencyMonths:    r.frequency_months ?? 12,
  defaultDuration:    r.default_duration != null ? Number(r.default_duration) : 2,
  defaultTechUserId:  r.default_tech_user_id ?? null,
  notes:              r.notes ?? '',
  active:             r.active !== false,
  startedAt:          r.started_at ?? null,
  lastServicedAt:     r.last_serviced_at ?? null,
  nextDueAt:          r.next_due_at ?? null,
  createdAt:          r.created_at ?? null,
});

const planToDb = (p) => ({
  client_id:             p.clientId          ?? null,
  client_name:           p.clientName        ?? null,
  title:                 p.title             ?? null,
  trade:                 p.trade             ?? null,
  frequency_months:      p.frequencyMonths   ?? 12,
  default_duration:      p.defaultDuration   ?? 2,
  default_tech_user_id:  p.defaultTechUserId ?? null,
  notes:                 p.notes             ?? null,
  active:                p.active !== false,
  started_at:            p.startedAt         || null,
  last_serviced_at:      p.lastServicedAt    || null,
  next_due_at:           p.nextDueAt         || null,
});

export async function listPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('next_due_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToPlan);
}

export async function upsertPlan(ownerId, plan) {
  const dbRow = planToDb(plan);
  const looksLikeUuid = typeof plan.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan.id);

  if (looksLikeUuid) {
    const { data, error } = await supabase
      .from('plans')
      .update(dbRow)
      .eq('id', plan.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) return dbToPlan(data);
  }

  const { data, error } = await supabase
    .from('plans')
    .insert({ owner_id: ownerId, ...dbRow })
    .select()
    .single();
  if (error) throw error;
  return dbToPlan(data);
}

export async function deletePlan(id) {
  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) throw error;
}

// Advance a plan's last_serviced_at + next_due_at after a linked job completes.
// `servicedDate` should be ISO yyyy-mm-dd. next_due is computed by adding
// frequency_months months to servicedDate (calendar-aware).
export async function markPlanServiced(planId, servicedDate) {
  // Pull the plan first to get frequency.
  const { data: plan, error: getErr } = await supabase
    .from('plans')
    .select('frequency_months')
    .eq('id', planId)
    .single();
  if (getErr) throw getErr;

  const d = new Date(servicedDate + 'T12:00:00');
  d.setMonth(d.getMonth() + (plan.frequency_months || 12));
  const next = d.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('plans')
    .update({ last_serviced_at: servicedDate, next_due_at: next })
    .eq('id', planId)
    .select()
    .single();
  if (error) throw error;
  return dbToPlan(data);
}

// Helper used by the Dashboard widget — plans whose next_due_at falls within
// the next N days (default 14) AND are still active.
export function dueWithinDays(plans, days = 14) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffIso = cutoff.toISOString().split('T')[0];
  return plans.filter(p => p.active && p.nextDueAt && p.nextDueAt <= cutoffIso);
}
