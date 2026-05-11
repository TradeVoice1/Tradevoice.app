-- =============================================================================
-- Tradevoice — public sharable quote links + customer Accept action
-- =============================================================================
-- Mirrors migration 0011 (invoice share links) for quotes. The contractor
-- sends the customer a URL like https://app.thetradevoice.com/q/<token>;
-- the customer reviews the quote on a phone/laptop and taps Accept, which
-- flips the quote's status to 'accepted' and records who accepted it (the
-- public viewer is anonymous, so we just timestamp + flag it; no PII
-- collection beyond what's already on the quote).
--
-- Security model:
--   - Each quote gets an unguessable UUID share_token at insert time.
--   - RLS still locks quotes.SELECT to the owner — public path uses
--     security-definer RPCs.
--   - 122 bits of entropy → not enumerable.
--   - The Accept RPC only flips draft|sent|viewed → accepted. Already-
--     accepted/declined/invoiced quotes are no-ops, so a duplicate tap or
--     a forwarded link can't mess up state.
-- =============================================================================

alter table public.quotes
  add column if not exists share_token uuid not null default gen_random_uuid();

create unique index if not exists quotes_share_token_idx on public.quotes (share_token);

-- Public lookup function — returns the quote + the contractor's branding
-- subset, anonymous-friendly via security definer.
create or replace function public.get_public_quote(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $q1$
declare
  q record;
  prof record;
begin
  if p_token is null then return null; end if;

  select * into q from public.quotes where share_token = p_token limit 1;
  if not found then return null; end if;

  select
    name, company, phone, tagline, license,
    accent_color, logo_url
  into prof
  from public.profiles where id = q.owner_id;

  return json_build_object(
    'quote',   row_to_json(q),
    'profile', case when prof is null then null else row_to_json(prof) end
  );
end;
$q1$;

grant execute on function public.get_public_quote(uuid) to anon, authenticated;


-- Accept-quote RPC. Called by the customer-facing /q/<token> page when the
-- customer taps "Accept Quote." Idempotent: if the quote is already
-- accepted/declined/invoiced/revised, it's a no-op so a stale link tap
-- can't corrupt state. Returns the new status string.
create or replace function public.accept_public_quote(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $q2$
declare
  q record;
begin
  if p_token is null then return json_build_object('ok', false, 'error', 'missing_token'); end if;

  select id, status into q from public.quotes where share_token = p_token limit 1;
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;

  -- Only flip draft/sent/viewed to accepted. Other statuses are terminal.
  if q.status not in ('draft', 'sent', 'viewed') then
    return json_build_object('ok', true, 'status', q.status, 'no_change', true);
  end if;

  update public.quotes
     set status   = 'accepted',
         sent_at_date = coalesce(sent_at_date, current_date)
   where id = q.id;

  return json_build_object('ok', true, 'status', 'accepted', 'no_change', false);
end;
$q2$;

grant execute on function public.accept_public_quote(uuid) to anon, authenticated;


-- "Mark viewed" RPC. The customer-facing page calls this on first load
-- so the contractor sees a "viewed" status as soon as the customer
-- opens the link. Same idempotency rules as accept.
create or replace function public.mark_public_quote_viewed(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $q3$
declare
  q record;
begin
  if p_token is null then return json_build_object('ok', false); end if;

  select id, status into q from public.quotes where share_token = p_token limit 1;
  if not found then return json_build_object('ok', false); end if;

  -- Only flip 'sent' to 'viewed'. Don't touch draft (the contractor hasn't
  -- sent it yet — they're just previewing the link themselves) or any
  -- post-acceptance status.
  if q.status = 'sent' then
    update public.quotes set status = 'viewed' where id = q.id;
    return json_build_object('ok', true, 'status', 'viewed');
  end if;
  return json_build_object('ok', true, 'status', q.status, 'no_change', true);
end;
$q3$;

grant execute on function public.mark_public_quote_viewed(uuid) to anon, authenticated;
