-- =============================================================================
-- Tradevoice — super-owner dashboard RPC, Phase 3
-- =============================================================================
-- The owner dashboard needs each contractor's EMAIL to identify accounts,
-- and email lives in auth.users (not public.profiles). Even with the
-- super-owner RLS bypass we added in migration 0030, auth.users is in
-- the auth schema which isn't exposed via PostgREST — the front-end
-- can't SELECT from it directly.
--
-- This RPC is the bridge. SECURITY DEFINER + an explicit super-owner
-- check at the top means:
--   • Only the founder account (is_super_owner = true) can call it.
--     Every other authenticated user gets back NULL.
--   • Inside, it joins profiles → auth.users to pull email +
--     last_sign_in_at, and aggregates team_members for the seat count.
--   • Returns a single JSON array the front-end maps directly into
--     the dashboard's account table — no further DB calls needed.
--
-- We DON'T return the TOTP secret column. Even though super-owner can
-- read profiles freely, there's no reason to ship the secret over the
-- wire for the dashboard's table view. (Phase 2's TOTP setup flow will
-- read it via a separate dedicated RPC.)
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
  -- Gate by the flag explicitly. SECURITY DEFINER lets this function see
  -- every row in profiles + auth.users — without this check, ANY
  -- authenticated user could call it and dump the whole customer list.
  select coalesce(is_super_owner, false) into caller_is_super
    from public.profiles
   where id = auth.uid();

  if not caller_is_super then
    return null;
  end if;

  -- Aggregate active tech seats per owner in a CTE so each row gets its
  -- own seat count without a correlated subquery (cheaper at scale once
  -- there are thousands of profiles).
  return (
    with seat_counts as (
      select owner_id, count(*)::int as active_seats
        from public.team_members
       where status = 'active'
       group by owner_id
    )
    select coalesce(json_agg(row_to_json(t) order by t.profile_created_at desc nulls last), '[]'::json)
      from (
        select
          p.id,
          u.email,
          p.name,
          p.company,
          p.plan,
          p.role,
          p.subscription_status,
          p.is_super_owner,
          p.trial_ends_at,
          p.stripe_customer_id,
          p.stripe_subscription_id,
          p.stripe_payment_method_id,
          p.created_at      as profile_created_at,
          u.last_sign_in_at,
          coalesce(s.active_seats, 0) as active_seats
        from public.profiles p
        left join auth.users u on u.id = p.id
        left join seat_counts s on s.owner_id = p.id
        where coalesce(p.role, 'owner') = 'owner'   -- exclude tech sub-accounts; they're listed under their owner's seat count
      ) t
  );
end;
$func$;

revoke all on function public.get_super_owner_accounts() from public;
grant execute on function public.get_super_owner_accounts() to authenticated;

notify pgrst, 'reload schema';
