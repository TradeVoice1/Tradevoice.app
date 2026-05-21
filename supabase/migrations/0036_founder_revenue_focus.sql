-- =============================================================================
-- Tradevoice — refocus founder dashboard on revenue (mine), not activity (theirs)
-- =============================================================================
-- The Phase-3 dashboard surfaced lots of OPERATIONAL data — invoices sent,
-- jobs scheduled, clients added — useful when thinking like a product
-- manager but irrelevant to the founder's actual question: "how much
-- money is each customer paying me, and how much have they paid total?"
--
-- This migration refocuses get_super_owner_accounts on revenue:
--
--   • Adds per-account lifetime_revenue (sum of all payment_succeeded
--     events from subscription_events, migration 0034)
--   • Adds last_payment_at (when they last paid)
--   • Adds payment_count (how many successful payments — useful for
--     spotting "long-time customer" vs "new this month")
--   • Adds current_month_revenue and last_24h_revenue platform-wide
--     for the activity strip at the top of the dashboard
--
-- The operational counts (invoices_count, jobs_count, quotes_count,
-- clients_count, team_count) STAY in the RPC — removing them would
-- mean changing the response shape and breaking the front-end during
-- the deploy window. The UI just stops surfacing them. Future
-- migration can prune them from the RPC if the dashboard never wants
-- them again.
--
-- Lifetime revenue is computed from subscription_events, so it only
-- reflects payments made AFTER migration 0034 landed. Historical
-- Stripe payments from before that aren't backfilled here — Stripe
-- Events API pull can be a follow-up if you ever want to populate
-- the pre-0034 era.
-- =============================================================================

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
    ),
    -- Revenue rollup per account, computed from subscription_events.
    -- Only payment_succeeded rows count toward lifetime revenue
    -- (we don't credit failed payments). Per migration 0034 these
    -- events are logged by the Stripe webhook handler in real time.
    revenue_rollup as (
      select
        profile_id,
        coalesce(sum(amount), 0)::numeric(14,2) as lifetime_revenue,
        count(*)::int                            as payment_count,
        max(occurred_at)                         as last_payment_at,
        coalesce(sum(amount) filter (
          where occurred_at >= date_trunc('month', now())
        ), 0)::numeric(14,2) as current_month_revenue,
        coalesce(sum(amount) filter (
          where occurred_at >= now() - interval '24 hours'
        ), 0)::numeric(14,2) as last_24h_revenue
      from public.subscription_events
      where event_type = 'payment_succeeded'
      group by profile_id
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
          coalesce(cc.clients_count,      0) as clients_count,
          -- Revenue fields (NEW in migration 0036)
          coalesce(rr.lifetime_revenue,      0)::numeric as lifetime_revenue,
          coalesce(rr.payment_count,         0)::int     as payment_count,
          rr.last_payment_at,
          coalesce(rr.current_month_revenue, 0)::numeric as current_month_revenue,
          coalesce(rr.last_24h_revenue,      0)::numeric as last_24h_revenue
        from public.profiles p
        left join auth.users    u   on u.id       = p.id
        left join seat_counts   s   on s.owner_id = p.id
        left join team_counts   t2  on t2.owner_id= p.id
        left join invoice_counts ic on ic.owner_id= p.id
        left join job_counts    jc  on jc.owner_id= p.id
        left join quote_counts  qc  on qc.owner_id= p.id
        left join client_counts cc  on cc.owner_id= p.id
        left join revenue_rollup rr on rr.profile_id = p.id
        where coalesce(p.role, 'owner') = 'owner'
      ) t
  );
end;
$func$;

revoke all on function public.get_super_owner_accounts() from public;
grant execute on function public.get_super_owner_accounts() to authenticated;

notify pgrst, 'reload schema';
