-- =============================================================================
-- Tradevoice — richer founder dashboard data
-- =============================================================================
-- Adds the highest-signal info missing from the Phase-3 dashboard:
--
--   1. Cancellation INTENT vs final cancellation. Stripe distinguishes
--      "user clicked Cancel" (cancel_at_period_end = true, status still
--      active/trialing) from "the period ended and they're gone"
--      (status = canceled). Until now we only captured the second one,
--      so the dashboard couldn't show "10 people clicked cancel this
--      week" as a churn signal.
--
--   2. Activity counts per account — invoices sent, jobs scheduled,
--      quotes drafted, clients added, team members. Tells you at a
--      glance which customers are USING the app vs. parked.
--
--   3. Profile breadth — company name, phone, trades, states, license.
--      Phase-3 only showed name; this surfaces who the contractor
--      actually is.
--
-- Approach:
--   • Add cancel_at_period_end / current_period_end / canceled_at
--     columns to profiles, populated by the Stripe webhook handler.
--   • Drop + recreate update_subscription_status with a 7-arg
--     signature so the webhook can pass all three new fields without
--     a second RPC roundtrip.
--   • Replace get_super_owner_accounts with a much richer version
--     that LEFT JOINs activity counts from invoices / quotes / jobs /
--     clients / team_members. Same RLS / SECURITY DEFINER gate.
-- =============================================================================

-- ── New profile columns ─────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists cancel_at_period_end boolean,
  add column if not exists current_period_end   timestamptz,
  add column if not exists canceled_at          timestamptz;

-- ── Update update_subscription_status with the 3 new fields ────────────────
-- Drop the old 4-arg signature first since signature change means
-- it'd otherwise hang around as a separate overload that the webhook
-- could accidentally call.
drop function if exists public.update_subscription_status(text, text, text, timestamptz);

create or replace function public.update_subscription_status(
  p_customer_id          text,
  p_subscription_id      text,
  p_status               text,
  p_trial_ends_at        timestamptz default null,
  p_cancel_at_period_end boolean     default null,
  p_current_period_end   timestamptz default null,
  p_canceled_at          timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $sub2$
declare
  rows_updated int;
begin
  if p_customer_id is null then
    return json_build_object('ok', false, 'error', 'missing_customer_id');
  end if;

  update public.profiles
     set stripe_subscription_id  = coalesce(p_subscription_id, stripe_subscription_id),
         subscription_status     = coalesce(p_status, subscription_status),
         trial_ends_at           = coalesce(p_trial_ends_at, trial_ends_at),
         cancel_at_period_end    = coalesce(p_cancel_at_period_end, cancel_at_period_end),
         current_period_end      = coalesce(p_current_period_end, current_period_end),
         canceled_at             = coalesce(p_canceled_at, canceled_at)
   where stripe_customer_id = p_customer_id;
  get diagnostics rows_updated = row_count;

  return json_build_object('ok', true, 'rows_updated', rows_updated);
end;
$sub2$;

grant execute on function public.update_subscription_status(text, text, text, timestamptz, boolean, timestamptz, timestamptz) to service_role;

-- ── Replace get_super_owner_accounts with the richer version ───────────────
create or replace function public.get_super_owner_accounts()
returns json
language plpgsql
stable
security definer
set search_path = public
as $func$
declare
  caller_is_super boolean;
begin
  select coalesce(is_super_owner, false) into caller_is_super
    from public.profiles where id = auth.uid();
  if not caller_is_super then
    return null;
  end if;

  return (
    -- All the per-account aggregations are computed in CTEs so each
    -- column joins back in O(N) rather than the O(N²) of correlated
    -- subqueries. With 1000+ accounts this matters.
    with seat_counts as (
      select owner_id, count(*)::int as active_seats
        from public.team_members where status = 'active'
        group by owner_id
    ),
    team_counts as (
      select owner_id, count(*)::int as team_count
        from public.team_members
        group by owner_id
    ),
    invoice_counts as (
      select
        owner_id,
        count(*)::int as invoices_count,
        count(*) filter (where status = 'paid')::int as invoices_paid_count,
        max(created_at) as last_invoice_at
      from public.invoices
      group by owner_id
    ),
    job_counts as (
      select
        owner_id,
        count(*)::int as jobs_count,
        max(created_at) as last_job_at
      from public.jobs
      group by owner_id
    ),
    quote_counts as (
      select owner_id, count(*)::int as quotes_count
        from public.quotes
        group by owner_id
    ),
    client_counts as (
      select owner_id, count(*)::int as clients_count
        from public.clients
        group by owner_id
    )
    select coalesce(json_agg(row_to_json(t) order by t.profile_created_at desc nulls last), '[]'::json)
      from (
        select
          p.id,
          u.email,
          p.name,
          p.company,
          p.phone,
          p.trades,
          p.states,
          p.license,
          p.plan,
          p.role,
          p.subscription_status,
          p.cancel_at_period_end,
          p.current_period_end,
          p.canceled_at,
          p.is_super_owner,
          p.trial_ends_at,
          p.accepted_terms_at,
          p.stripe_customer_id,
          p.stripe_subscription_id,
          p.stripe_payment_method_id,
          p.created_at      as profile_created_at,
          u.last_sign_in_at,
          coalesce(s.active_seats,        0) as active_seats,
          coalesce(t2.team_count,         0) as team_count,
          coalesce(ic.invoices_count,     0) as invoices_count,
          coalesce(ic.invoices_paid_count,0) as invoices_paid_count,
          ic.last_invoice_at,
          coalesce(jc.jobs_count,         0) as jobs_count,
          jc.last_job_at,
          coalesce(qc.quotes_count,       0) as quotes_count,
          coalesce(cc.clients_count,      0) as clients_count
        from public.profiles p
        left join auth.users    u   on u.id       = p.id
        left join seat_counts   s   on s.owner_id = p.id
        left join team_counts   t2  on t2.owner_id= p.id
        left join invoice_counts ic on ic.owner_id= p.id
        left join job_counts    jc  on jc.owner_id= p.id
        left join quote_counts  qc  on qc.owner_id= p.id
        left join client_counts cc  on cc.owner_id= p.id
        where coalesce(p.role, 'owner') = 'owner'
      ) t
  );
end;
$func$;

revoke all on function public.get_super_owner_accounts() from public;
grant execute on function public.get_super_owner_accounts() to authenticated;

notify pgrst, 'reload schema';
