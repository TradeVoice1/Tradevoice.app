-- The founder account is permanently free — the ONLY always-free account.
-- =============================================================================
-- Matt, 2026-11-01: "the founder account shouldn't get charged from here on
-- out. it should be the only one that should always be free."
--
-- Defense in depth, deepest layer. The UI already hides billing from the
-- founder and the API now refuses create/resume/sync_seats for super-owner
-- profiles — but both of those are code that future edits could loosen.
-- This trigger makes the invariant structural: a super-owner profile row can
-- never carry a Stripe customer or subscription id, no matter who writes it
-- (triggers fire for service-role writes too, where RLS does not apply).
-- No Stripe identity → Stripe has nothing to bill, ever.
--
-- Deliberately NOT blocked: is_super_owner stays protected by migration 0032,
-- and plan/subscription_status columns stay writable (they're display state;
-- the founder UI ignores them).

create or replace function public.prevent_founder_billing()
returns trigger
language plpgsql
as $$
begin
  if new.is_super_owner
     and (new.stripe_customer_id is not null or new.stripe_subscription_id is not null) then
    raise exception 'founder_account_free: the founder account is permanently free and can never hold a Stripe customer or subscription';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_founder_billing on public.profiles;
create trigger trg_prevent_founder_billing
  before insert or update on public.profiles
  for each row execute function public.prevent_founder_billing();
